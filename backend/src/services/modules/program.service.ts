import crypto from "crypto";
import ProgramsModel from "../../database/models/tenant/ProgramsModel";
import { HttpError } from "../../utils/http";
import auditService from "./audit.service";
import { ApiResponseStatus } from "../../constants/apiResponse";
import logger from "../../config/logger";
import eventService from "../../events/event.service";
import { EventTypes } from "../../events/types/EventTypes";

type ProgramPayload = {
  name: string;
  description: string;
  length: number;
  isActive?: boolean;
};

type ProgramListParams = {
  tenantId: string;
  page: number;
  limit: number;
  offset: number;
};

class ProgramService {
  async createProgram(
    tenantId: string,
    actor: string,
    payload: ProgramPayload,
  ) {
    const transaction = await ProgramsModel.sequelize!.transaction();

    try {
      logger.info("Creating program");
      const program = await ProgramsModel.create(
        {
          tenant_id: tenantId,
          program_id: crypto.randomUUID(),
          ...payload,
        },
        { transaction },
      );

      eventService.emitEventHelper(EventTypes.PROGRAM_CREATED, {
        tenantId,
        actor,
        action: EventTypes.PROGRAM_CREATED,
        targetEntity: "ProgramsModel",
        transaction,
      });

      await transaction.commit();
      logger.info("Program created successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Program created successfully",
        data: program,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to create program", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async listPrograms(params: ProgramListParams) {
    const transaction = await ProgramsModel.sequelize!.transaction();

    try {
      logger.info("Fetching programs");
      const { rows, count } = await ProgramsModel.findAndCountAll({
        order: [["createdAt", "DESC"]],
        limit: params.limit,
        offset: params.offset,
        transaction,
      });

      await transaction.commit();
      logger.info("Programs fetched successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Programs fetched successfully",
        data: {
          items: rows,
          pagination: {
            page: params.page,
            limit: params.limit,
            total: count,
            totalPages: Math.ceil(count / params.limit),
          },
        },
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to fetch programs", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getProgram(tenantId: string, programId: string) {
    const transaction = await ProgramsModel.sequelize!.transaction();

    try {
      logger.info("Fetching program");
      const program = await ProgramsModel.findByPk(programId, {
        transaction,
      });

      if (!program) {
        throw new HttpError(404, "Program not found");
      }

      await transaction.commit();
      logger.info("Program fetched successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Program fetched successfully",
        data: program,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to fetch program", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async updateProgram(
    tenantId: string,
    actor: string,
    programId: string,
    payload: Partial<ProgramPayload>,
  ) {
    const transaction = await ProgramsModel.sequelize!.transaction();

    try {
      logger.info("Updating program");
      const program = await ProgramsModel.findByPk(programId, {
        transaction,
      });

      if (!program) {
        throw new HttpError(404, "Program not found");
      }

      await program.update(payload, { transaction });
      await auditService.recordAudit(
        tenantId,
        actor,
        "UPDATE_PROGRAM",
        "ProgramsModel",
        transaction,
      );

      await transaction.commit();
      logger.info("Program updated successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Program updated successfully",
        data: program,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to update program", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async deleteProgram(tenantId: string, actor: string, programId: string) {
    const transaction = await ProgramsModel.sequelize!.transaction();

    try {
      logger.info("Deleting program");
      const program = await ProgramsModel.findByPk(programId, {
        transaction,
      });

      if (!program) {
        throw new HttpError(404, "Program not found");
      }

      await program.destroy({ transaction });
      await auditService.recordAudit(
        tenantId,
        actor,
        "DELETE_PROGRAM",
        "ProgramsModel",
        transaction,
      );

      await transaction.commit();
      logger.info("Program deleted successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Program deleted successfully",
        data: { message: "Program deleted" },
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to delete program", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export default new ProgramService();
