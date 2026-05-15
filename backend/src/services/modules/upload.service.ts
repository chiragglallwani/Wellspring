import path from "path";
import { parse } from "csv-parse/sync";
import SessionModel from "../../database/models/tenant/SessionModel";
import ProgramsModel from "../../database/models/tenant/ProgramsModel";
import { ApiResponseStatus } from "../../constants/apiResponse";
import { HttpError } from "../../utils/http";
import { getTenantId } from "../../utils/asyncstorage";
import logger from "../../config/logger";
import s3Service from "../storage/s3.service";
import clientKeyAvailabilityService from "./clientKeyAvailability.service";

type PresignSingleParams = {
  programId: string;
  filename: string;
  contentType?: string;
  clientKey?: string;
};

type MediaPlaybackParams = {
  programId: string;
  filename: string;
};

export type BulkCsvRowFailure = {
  rowNumber: number;
  reason: string;
  client_key?: string;
  title?: string;
  file_name?: string;
};

export type BulkCsvImportResult = {
  processed: number;
  failed: number;
  skipped: number;
  failures: BulkCsvRowFailure[];
  totalRows: number;
};

type BulkCsvProgress = {
  totalRows: number;
  processed: number;
  failed: number;
  skipped: number;
};

class UploadService {
  /** Returns client_keys that already have a session in this tenant + program. */
  async findExistingClientKeys(programId: string, clientKeys: string[]) {
    const tenantId = getTenantId();
    const existing = await clientKeyAvailabilityService.findTakenClientKeys(
      programId,
      clientKeys,
    );

    logger.debug("Bulk upload existing client_key check", {
      tenantId,
      programId,
      requested: clientKeys.length,
      existing: existing.length,
    });

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Existing client keys",
      data: { existing },
    };
  }

  async getPresignedUploadForSession(params: PresignSingleParams) {
    const tenantId = getTenantId();
    logger.info("Presigned session upload requested", {
      tenantId,
      programId: params.programId,
      filename: params.filename,
      hasContentType: Boolean(params.contentType),
    });

    const clientKey = params.clientKey?.trim();
    if (clientKey) {
      await clientKeyAvailabilityService.assertClientKeyAvailable(
        params.programId,
        clientKey,
      );
    }

    const storageFilename = this.storageFilenameForUpload(
      params.filename,
      clientKey,
    );

    const putOptions =
      params.contentType !== undefined && params.contentType !== ""
        ? { contentType: params.contentType }
        : {};

    const { url, key, expiresIn } = await s3Service.getPresignedPutUrl(
      params.programId,
      storageFilename,
      putOptions,
    );

    logger.info("Presigned session upload URL issued", {
      tenantId,
      programId: params.programId,
      key,
      expiresIn,
    });

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Presigned upload URL generated",
      data: {
        presignedUploadUrl: url,
        key,
        expiresIn,
      },
    };
  }

  async getSessionMediaPlaybackUrl(params: MediaPlaybackParams) {
    const tenantId = getTenantId();
    logger.info("Session media playback URL requested", {
      tenantId,
      programId: params.programId,
      filename: params.filename,
    });

    const { url, key, expiresIn } = await s3Service.getMediaPlaybackUrl(
      params.programId,
      params.filename,
    );

    logger.info("Session media playback URL issued", {
      tenantId,
      programId: params.programId,
      key,
      expiresIn,
    });

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Media playback URL generated",
      data: {
        mediaPlaybackUrl: url,
        key,
        expiresIn,
      },
    };
  }

  /**
   * CSV headers (case-insensitive): client_key, type, title, duration, instructor_name,
   * optional tags, optional ordered_position.
   * Creates sessions for new client_keys only; existing (tenant, program, client_key) rows are skipped.
   * Media must already be uploaded under the program (storage path derived from client_key).
   */
  async bulkLinkSessionMediaFromCsv(
    programId: string,
    csvBuffer: Buffer,
    options?: {
      onProgress?: (progress: BulkCsvProgress) => void | Promise<void>;
    },
  ): Promise<BulkCsvImportResult> {
    let records: Record<string, string>[];
    try {
      records = parse(csvBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];
    } catch (error) {
      logger.error("Failed to parse bulk upload CSV", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new HttpError(400, "Invalid CSV file");
    }

    const tenantId = getTenantId();
    logger.info("Bulk session CSV import started", {
      tenantId,
      programId,
      csvBytes: csvBuffer.length,
      dataRowCount: records.length,
    });

    const program = await ProgramsModel.findOne({
      where: { program_id: programId },
    });
    if (!program) {
      logger.warn("Bulk session CSV import aborted: program not found", {
        tenantId,
        programId,
      });
      throw new HttpError(404, "Program not found");
    }

    const failures: BulkCsvRowFailure[] = [];
    let processed = 0;
    let skipped = 0;
    let rowNumber = 1;
    const totalRows = records.length;

    const csvClientKeys = records
      .map((row) => this.pickColumn(row, ["client_key", "clientkey"])?.trim())
      .filter((key): key is string => Boolean(key));
    const existingClientKeys = new Set(
      await clientKeyAvailabilityService.findTakenClientKeys(
        programId,
        csvClientKeys,
      ),
    );

    const reportProgress = async () => {
      if (options?.onProgress) {
        await options.onProgress({
          totalRows,
          processed,
          failed: failures.length,
          skipped,
        });
      }
    };

    await reportProgress();

    for (let index = 0; index < records.length; index++) {
      const row = records[index]!;
      rowNumber += 1;

      const clientKey = this.pickColumn(row, ["client_key", "clientkey"]);
      const typeRaw = this.pickColumn(row, ["type"]);
      const title = this.pickColumn(row, ["title"]);
      const durationRaw = this.pickColumn(row, ["duration"]);
      const orderedRaw = this.pickColumn(row, [
        "ordered_position",
        "orderedposition",
      ]);
      const instructorName = this.pickColumn(row, [
        "instructor_name",
        "instructorname",
      ]);
      const tagsRaw = this.pickColumn(row, ["tags"]);

      if (
        !clientKey ||
        !typeRaw ||
        !title ||
        durationRaw === undefined ||
        !instructorName
      ) {
        failures.push({
          rowNumber,
          reason:
            "Missing required column (client_key, type, title, duration, instructor_name); tags and ordered_position are optional",
          ...(clientKey ? { client_key: clientKey } : {}),
          ...(title ? { title } : {}),
        });
        await reportProgress();
        continue;
      }

      if (clientKey.length > 255) {
        failures.push({
          rowNumber,
          reason: "client_key exceeds 255 characters",
          client_key: clientKey,
          title,
        });
        await reportProgress();
        continue;
      }

      if (existingClientKeys.has(clientKey)) {
        skipped += 1;
        logger.debug("Bulk CSV row skipped: session already exists", {
          tenantId,
          programId,
          rowNumber,
          client_key: clientKey,
        });
        await reportProgress();
        continue;
      }

      const sessionType = typeRaw.trim().toLowerCase();
      if (sessionType !== "audio" && sessionType !== "video") {
        failures.push({
          rowNumber,
          reason: "type must be audio or video",
          client_key: clientKey,
          title,
        });
        await reportProgress();
        continue;
      }

      const duration = Number(durationRaw);
      const orderedPosition =
        orderedRaw !== undefined && orderedRaw !== ""
          ? Number(orderedRaw)
          : index;
      if (
        !Number.isInteger(duration) ||
        duration < 1 ||
        !Number.isInteger(orderedPosition) ||
        orderedPosition < 0
      ) {
        failures.push({
          rowNumber,
          reason:
            "duration must be a positive integer; ordered_position must be a non-negative integer when provided",
          client_key: clientKey,
          title,
        });
        await reportProgress();
        continue;
      }

      const tags = this.parseTagsFromCsv(tagsRaw);

      let mediaFilePath: string;
      try {
        mediaFilePath = await this.resolveMediaPathForClientKey(
          programId,
          clientKey,
        );
      } catch (error) {
        failures.push({
          rowNumber,
          reason:
            error instanceof HttpError
              ? error.message
              : "No uploaded media found for client_key",
          client_key: clientKey,
          title,
        });
        await reportProgress();
        continue;
      }

      const payload = {
        title,
        duration,
        ordered_position: orderedPosition,
        instructor_name: instructorName,
        tags,
        media_file_path: mediaFilePath,
        type: sessionType as "audio" | "video",
      };

      try {
        await SessionModel.create({
          tenant_id: tenantId,
          program_id: programId,
          client_key: clientKey,
          ...payload,
        });
        processed += 1;
      } catch (error) {
        logger.error("Bulk session CSV row failed", {
          tenantId,
          programId,
          rowNumber,
          client_key: clientKey,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        failures.push({
          rowNumber,
          reason: "Database create/update failed",
          client_key: clientKey,
          title,
        });
      }

      await reportProgress();
    }

    const logPayload = {
      tenantId,
      programId,
      processed,
      skipped,
      failed: failures.length,
      ...(failures.length > 0
        ? {
            failureSample: failures.slice(0, 25),
            failureSampleTruncated: failures.length > 25,
          }
        : {}),
    };

    if (failures.length > 0) {
      logger.warn(
        "Bulk session CSV import completed with row failures",
        logPayload,
      );
    } else {
      logger.info("Bulk session CSV import completed successfully", logPayload);
    }

    const result: BulkCsvImportResult = {
      processed,
      skipped,
      failed: failures.length,
      failures,
      totalRows,
    };

    return result;
  }

  /** Wraps bulk import for synchronous HTTP responses. */
  async bulkLinkSessionMediaFromCsvResponse(
    programId: string,
    csvBuffer: Buffer,
  ) {
    const result = await this.bulkLinkSessionMediaFromCsv(programId, csvBuffer);
    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Bulk session import completed",
      data: {
        processed: result.processed,
        skipped: result.skipped,
        failed: result.failed,
        failures: result.failures,
      },
    };
  }

  /**
   * client_key must equal `tenant_name/program_name/session_name` where session_name is the session title.
   */
  private buildSessionClientKey(
    tenantName: string,
    programName: string,
    sessionTitle: string,
  ): string {
    const t = tenantName.trim();
    const p = programName.trim();
    const s = sessionTitle.trim();
    if (!t || !p || !s) {
      throw new HttpError(
        400,
        "Tenant name, program name, and title must be non-empty",
      );
    }
    if (t.includes("/") || p.includes("/") || s.includes("/")) {
      throw new HttpError(
        400,
        "Tenant name, program name, and title must not contain '/'",
      );
    }
    return `${t}/${p}/${s}`;
  }

  /** Presign/upload storage basename: client_key + original extension when client_key is set. */
  private storageFilenameForUpload(
    originalFilename: string,
    clientKey?: string,
  ): string {
    if (!clientKey?.trim()) {
      return originalFilename;
    }
    const ext = path.extname(originalFilename);
    const base = clientKey.trim();
    if (ext && !base.toLowerCase().endsWith(ext.toLowerCase())) {
      return `${base}${ext}`;
    }
    return base;
  }

  /** Locate uploaded media for a client_key under tenants/.../programs/.../sessions/. */
  private async resolveMediaPathForClientKey(
    programId: string,
    clientKey: string,
  ): Promise<string> {
    const trimmed = clientKey.trim();
    const ext = path.extname(trimmed);
    const filenames = [trimmed];
    if (!ext) {
      for (const suffix of [
        ".mp4",
        ".mp3",
        ".m4a",
        ".wav",
        ".webm",
        ".mov",
        ".aac",
      ]) {
        filenames.push(`${trimmed}${suffix}`);
      }
    }

    for (const filename of filenames) {
      try {
        const key = s3Service.buildSessionObjectKey(programId, filename);
        if (await s3Service.objectExists(key)) {
          await s3Service.validateSessionMediaObjectKey(programId, key);
          return key;
        }
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
      }
    }

    throw new HttpError(
      400,
      `No uploaded media found for client_key "${trimmed}" in this program`,
    );
  }

  private parseTagsFromCsv(raw: string | undefined): string[] {
    if (raw === undefined || !raw.trim()) {
      return [];
    }
    return raw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  private inferSessionTypeFromFileName(fileName: string): "audio" | "video" {
    const ext = path.posix.extname(fileName).toLowerCase();
    const audioExtensions = new Set([
      ".mp3",
      ".m4a",
      ".aac",
      ".wav",
      ".flac",
      ".ogg",
      ".opus",
      ".wma",
    ]);
    return audioExtensions.has(ext) ? "audio" : "video";
  }

  private pickColumn(
    row: Record<string, string>,
    keys: string[],
  ): string | undefined {
    const normalized = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k.toLowerCase().replace(/\s+/g, ""),
        v,
      ]),
    );
    for (const key of keys) {
      const value = normalized[key.toLowerCase()];
      if (value !== undefined && value !== "") {
        return value;
      }
    }
    return undefined;
  }
}

export default new UploadService();
