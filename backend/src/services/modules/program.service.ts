import crypto from "crypto";
import { Op, Sequelize } from "sequelize";
import ProgramsModel from "../../database/models/tenant/ProgramsModel";
import SessionModel from "../../database/models/tenant/SessionModel";
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
      await ProgramsModel.create(
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
      });

      await transaction.commit();
      logger.info("Program created successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Program created successfully",
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

      const programIds = rows.map((row) => row.program_id);
      const sessionCountRows =
        programIds.length === 0
          ? []
          : await SessionModel.findAll({
              attributes: [
                "program_id",
                [Sequelize.fn("COUNT", Sequelize.col("session_id")), "sessionsCount"],
              ],
              where: { program_id: { [Op.in]: programIds } },
              group: ["program_id"],
              transaction,
              raw: true,
            });

      type SessionCountRow = {
        program_id: string;
        sessionsCount: string | number;
      };

      const sessionsCountByProgramId = new Map(
        (sessionCountRows as unknown as SessionCountRow[]).map((row) => [
          row.program_id,
          Number(row.sessionsCount),
        ]),
      );

      const items = rows.map((row) => ({
        ...row.get({ plain: true }),
        sessionsCount: sessionsCountByProgramId.get(row.program_id) ?? 0,
      }));

      await transaction.commit();
      logger.info("Programs fetched successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Programs fetched successfully",
        data: {
          items,
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
