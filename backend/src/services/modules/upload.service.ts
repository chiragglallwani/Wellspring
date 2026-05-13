import path from "path";
import { parse } from "csv-parse/sync";
import { UniqueConstraintError } from "sequelize";
import SessionModel from "../../database/models/tenant/SessionModel";
import ProgramsModel from "../../database/models/tenant/ProgramsModel";
import Tenant from "../../database/models/system/Tenant";
import { ApiResponseStatus } from "../../constants/apiResponse";
import { HttpError } from "../../utils/http";
import { getTenantId } from "../../utils/asyncstorage";
import logger from "../../config/logger";
import s3Service from "../storage/s3.service";

type PresignSingleParams = {
  programId: string;
  filename: string;
  contentType?: string;
};

type MediaPlaybackParams = {
  programId: string;
  filename: string;
};

type BulkCsvRowFailure = {
  rowNumber: number;
  reason: string;
  client_key?: string;
  title?: string;
  file_name?: string;
};

class UploadService {
  async getPresignedUploadForSession(params: PresignSingleParams) {
    const tenantId = getTenantId();
    logger.info("Presigned session upload requested", {
      tenantId,
      programId: params.programId,
      filename: params.filename,
      hasContentType: Boolean(params.contentType),
    });

    const putOptions =
      params.contentType !== undefined && params.contentType !== ""
        ? { contentType: params.contentType }
        : {};

    const { url, key, expiresIn } = await s3Service.getPresignedPutUrl(
      params.programId,
      params.filename,
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
   * CSV: first row is headers. Columns (case-insensitive): title, duration,
   * ordered_position, instructor_name, tags (comma-separated), and either
   * file_name (basename used to build the storage key) or object_key (full key from presign).
   * Do not send media_file_path in CSV; the storage key is resolved and stored in DB as media_file_path.
   * client_key is `{tenant_name}/{program_name}/{title}`.
   * Idempotent: upserts by client_key + program. Verifies the object exists in S3/MinIO.
   */
  async bulkLinkSessionMediaFromCsv(programId: string, csvBuffer: Buffer) {
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

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      logger.warn("Bulk session CSV import aborted: tenant not found", {
        tenantId,
        programId,
      });
      throw new HttpError(404, "Tenant not found");
    }

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

    const tenantName = tenant.name.trim();
    const programName = program.name.trim();

    const failures: BulkCsvRowFailure[] = [];
    let processed = 0;
    let rowNumber = 1;

    for (const row of records) {
      rowNumber += 1;

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
      const fileName = this.pickColumn(row, ["file_name", "filename"]);
      const objectKeyFromCsv = this.pickColumn(row, [
        "object_key",
        "objectkey",
        "storage_key",
        "s3_key",
      ]);

      if (
        !title ||
        durationRaw === undefined ||
        orderedRaw === undefined ||
        !instructorName ||
        (!fileName && !objectKeyFromCsv)
      ) {
        failures.push({
          rowNumber,
          reason:
            "Missing required column (title, duration, ordered_position, instructor_name, and either file_name or object_key); tags is optional",
          ...(title ? { title } : {}),
          ...(fileName ? { file_name: fileName } : {}),
        });
        logger.warn("Bulk CSV row skipped: missing required columns", {
          tenantId,
          programId,
          rowNumber,
          title: title ?? null,
          file_name: fileName ?? null,
          object_key: objectKeyFromCsv ?? null,
        });
        continue;
      }

      let clientKey: string;
      try {
        clientKey = this.buildSessionClientKey(
          tenantName,
          programName,
          title,
        );
      } catch (error) {
        failures.push({
          rowNumber,
          reason:
            error instanceof HttpError
              ? error.message
              : "Invalid client_key segments",
          title,
          ...(fileName ? { file_name: fileName } : {}),
        });
        logger.warn("Bulk CSV row skipped: invalid client_key segments", {
          tenantId,
          programId,
          rowNumber,
          title,
          file_name: fileName,
          detail:
            error instanceof HttpError ? error.message : "Invalid client_key",
        });
        continue;
      }

      if (clientKey.length > 255) {
        failures.push({
          rowNumber,
          reason: "client_key exceeds 255 characters",
          client_key: clientKey,
          title,
          ...(fileName ? { file_name: fileName } : {}),
        });
        logger.warn("Bulk CSV row skipped: client_key too long", {
          tenantId,
          programId,
          rowNumber,
          clientKeyLength: clientKey.length,
          title,
          file_name: fileName,
        });
        continue;
      }

      const duration = Number(durationRaw);
      const orderedPosition = Number(orderedRaw);
      if (
        !Number.isInteger(duration) ||
        duration < 1 ||
        !Number.isInteger(orderedPosition) ||
        orderedPosition < 0
      ) {
        failures.push({
          rowNumber,
          reason:
            "duration must be a positive integer and ordered_position a non-negative integer",
          client_key: clientKey,
          title,
          ...(fileName ? { file_name: fileName } : {}),
        });
        logger.warn("Bulk CSV row skipped: invalid duration or ordered_position", {
          tenantId,
          programId,
          rowNumber,
          client_key: clientKey,
          durationRaw,
          orderedRaw,
        });
        continue;
      }

      const tags = this.parseTagsFromCsv(tagsRaw);

      let objectKey: string;
      try {
        if (objectKeyFromCsv?.trim()) {
          objectKey = objectKeyFromCsv.trim();
        } else if (fileName) {
          objectKey = s3Service.buildSessionObjectKey(programId, fileName);
        } else {
          failures.push({
            rowNumber,
            reason: "Provide file_name or object_key",
            client_key: clientKey,
            title,
          });
          continue;
        }
        await s3Service.validateSessionMediaObjectKey(programId, objectKey);
      } catch (error) {
        failures.push({
          rowNumber,
          reason:
            error instanceof HttpError
              ? error.message
              : "Invalid or missing storage object",
          client_key: clientKey,
          title,
          ...(fileName ? { file_name: fileName } : {}),
        });
        logger.warn("Bulk CSV row skipped: storage key validation failed", {
          tenantId,
          programId,
          rowNumber,
          client_key: clientKey,
          title,
          file_name: fileName,
          object_key: objectKeyFromCsv ?? null,
          detail:
            error instanceof HttpError ? error.message : "Unknown error",
        });
        continue;
      }

      const nameForType = fileName ?? path.posix.basename(objectKey);
      const sessionType = this.inferSessionTypeFromFileName(nameForType);

      const payload = {
        title,
        duration,
        ordered_position: orderedPosition,
        instructor_name: instructorName,
        tags,
        media_file_path: objectKey,
        type: sessionType,
      };

      try {
        const existing = await SessionModel.findOne({
          where: { client_key: clientKey, program_id: programId },
        });

        if (existing) {
          await existing.update(payload);
          processed += 1;
          logger.debug("Bulk CSV row updated existing session", {
            tenantId,
            programId,
            rowNumber,
            client_key: clientKey,
            session_id: existing.session_id,
            objectKey,
          });
          continue;
        }

        await SessionModel.create({
          tenant_id: tenantId,
          program_id: programId,
          client_key: clientKey,
          ...payload,
        });
        processed += 1;
        logger.debug("Bulk CSV row created session", {
          tenantId,
          programId,
          rowNumber,
          client_key: clientKey,
          objectKey,
        });
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          logger.warn("Bulk CSV create hit unique constraint, retrying as update", {
            tenantId,
            programId,
            rowNumber,
            client_key: clientKey,
          });
          const retry = await SessionModel.findOne({
            where: { client_key: clientKey, program_id: programId },
          });
          if (retry) {
            await retry.update(payload);
            processed += 1;
            logger.info("Bulk CSV row recovered after unique constraint", {
              tenantId,
              programId,
              rowNumber,
              client_key: clientKey,
              session_id: retry.session_id,
            });
            continue;
          }
        }
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
          ...(fileName ? { file_name: fileName } : {}),
        });
      }
    }

    const logPayload = {
      tenantId,
      programId,
      processed,
      failed: failures.length,
      ...(failures.length > 0
        ? {
            failureSample: failures.slice(0, 25),
            failureSampleTruncated: failures.length > 25,
          }
        : {}),
    };

    if (failures.length > 0) {
      logger.warn("Bulk session CSV import completed with row failures", logPayload);
    } else {
      logger.info("Bulk session CSV import completed successfully", logPayload);
    }

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Bulk session import completed",
      data: {
        processed,
        failed: failures.length,
        failures,
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
      throw new HttpError(400, "Tenant name, program name, and title must be non-empty");
    }
    if (t.includes("/") || p.includes("/") || s.includes("/")) {
      throw new HttpError(
        400,
        "Tenant name, program name, and title must not contain '/'",
      );
    }
    return `${t}/${p}/${s}`;
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
      Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/\s+/g, ""), v]),
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
