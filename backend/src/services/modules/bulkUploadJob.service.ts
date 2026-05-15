import BulkUploadJobModel, {
  type BulkUploadJobStatus,
  type BulkUploadRowFailure,
} from "../../database/models/tenant/BulkUploadJobModel";
import ProgramsModel from "../../database/models/tenant/ProgramsModel";
import UserModel from "../../database/models/tenant/UserModel";
import type { BulkCsvImportResult } from "./upload.service";
import { ApiResponseStatus } from "../../constants/apiResponse";
import { HttpError } from "../../utils/http";
import {
  asyncLocalStorage,
  getTenantId,
} from "../../utils/asyncstorage";
import logger from "../../config/logger";
import eventService from "../../events/event.service";
import { EventTypes } from "../../events/types/EventTypes";
import uploadService from "./upload.service";

class BulkUploadJobService {
  async createJob(programId: string, csvBuffer: Buffer, createdBy: string) {
    const tenantId = getTenantId();

    const program = await ProgramsModel.findOne({
      where: { program_id: programId },
    });
    if (!program) {
      throw new HttpError(404, "Program not found");
    }

    const job = await BulkUploadJobModel.create({
      tenant_id: tenantId,
      program_id: programId,
      created_by: createdBy,
      status: "pending",
      total_rows: 0,
      processed_count: 0,
      failed_count: 0,
      skipped_count: 0,
      failures: [],
    });

    const jobId = job.job_id;

    setImmediate(() => {
      asyncLocalStorage.run({ tenantId }, () => {
        void this.runJob(jobId, programId, csvBuffer, createdBy, tenantId).catch(
          (error) => {
            logger.error("Bulk upload job crashed", {
              jobId,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          },
        );
      });
    });

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Bulk upload job started",
      data: { job_id: jobId, status: "pending" as BulkUploadJobStatus },
    };
  }

  private async runJob(
    jobId: string,
    programId: string,
    csvBuffer: Buffer,
    createdBy: string,
    tenantId: string,
  ): Promise<void> {
    try {
      await this.updateJob(jobId, { status: "processing" });

      const result = await uploadService.bulkLinkSessionMediaFromCsv(
        programId,
        csvBuffer,
        {
          onProgress: async ({ totalRows, processed, failed, skipped }) => {
            await this.updateJob(jobId, {
              total_rows: totalRows,
              processed_count: processed,
              failed_count: failed,
              skipped_count: skipped,
            });
          },
        },
      );

      await this.updateJob(jobId, {
        status: "completed",
        total_rows: result.totalRows,
        processed_count: result.processed,
        failed_count: result.failed,
        skipped_count: result.skipped,
        failures: result.failures,
        error_message: null,
      });

      const targetEntity = await this.buildBulkAuditTargetEntity(
        programId,
        createdBy,
        result,
      );

      eventService.emitEventHelper(EventTypes.BULK_SESSION_CREATED, {
        tenantId,
        actor: createdBy,
        targetEntity,
      });

      logger.info("Bulk upload job completed", {
        jobId,
        programId,
        tenantId,
        processed: result.processed,
        skipped: result.skipped,
        failed: result.failed,
      });
    } catch (error) {
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Bulk upload failed";

      await this.updateJob(jobId, {
        status: "failed",
        error_message: message,
      });
    }
  }

  private async buildBulkAuditTargetEntity(
    programId: string,
    createdBy: string,
    result: BulkCsvImportResult,
  ): Promise<string> {
    const [program, user] = await Promise.all([
      ProgramsModel.findOne({
        where: { program_id: programId },
        attributes: ["name"],
      }),
      UserModel.findByPk(createdBy, { attributes: ["name"] }),
    ]);

    const programName = program?.name?.trim() || "Unknown program";
    const userName = user?.name?.trim() || "Unknown user";

    return [
      `Program: ${programName}`,
      `User: ${userName}`,
      `imported ${result.processed}`,
      `skipped ${result.skipped}`,
      `failed ${result.failed}`,
    ].join(" · ");
  }

  private async updateJob(
    jobId: string,
    fields: Partial<{
      status: BulkUploadJobStatus;
      total_rows: number;
      processed_count: number;
      failed_count: number;
      skipped_count: number;
      failures: BulkUploadRowFailure[];
      error_message: string | null;
    }>,
  ) {
    const job = await BulkUploadJobModel.findByPk(jobId);
    if (!job) return;
    await job.update(fields);
  }

  async getJob(jobId: string) {
    const job = await BulkUploadJobModel.findByPk(jobId);
    if (!job) {
      throw new HttpError(404, "Bulk upload job not found");
    }

    const plain = job.get({ plain: true }) as {
      job_id: string;
      program_id: string;
      status: BulkUploadJobStatus;
      total_rows: number;
      processed_count: number;
      failed_count: number;
      skipped_count: number;
      failures: BulkUploadRowFailure[];
      error_message: string | null;
      createdAt: Date;
      updatedAt: Date;
    };

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Bulk upload job status",
      data: {
        job_id: plain.job_id,
        program_id: plain.program_id,
        status: plain.status,
        total_rows: plain.total_rows,
        processed_count: plain.processed_count,
        failed_count: plain.failed_count,
        skipped_count: plain.skipped_count,
        failures: plain.failures,
        error_message: plain.error_message,
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
      },
    };
  }
}

export default new BulkUploadJobService();
