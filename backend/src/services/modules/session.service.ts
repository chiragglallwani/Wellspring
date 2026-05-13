import SessionModel from "../../database/models/tenant/SessionModel";
import { HttpError } from "../../utils/http";
import { EventTypes } from "../../events/types/EventTypes";
import eventService from "../../events/event.service";
import { ApiResponseStatus } from "../../constants/apiResponse";
import logger from "../../config/logger";
import s3Service from "../storage/s3.service";

type SessionPayload = {
  program_id: string;
  client_key: string;
  type: "audio" | "video";
  title: string;
  duration: number;
  ordered_position: number;
  instructor_name: string;
  tags?: string[];
  /** S3 object key returned from POST /uploads/presign (`key`). */
  object_key?: string;
  /** Same value as object_key; use one or the other. Validated against tenant/program and HeadObject. */
  media_file_path?: string;
};

type SessionListParams = {
  tenantId: string;
  page: number;
  limit: number;
  offset: number;
  programId: string;
};

type ReorderSessionPayload = {
  sessionId: string;
  orderedPosition: number;
};

class SessionService {
  private async resolveSessionMediaStorageKey(
    tenantId: string,
    programId: string,
    payload: Pick<SessionPayload, "object_key" | "media_file_path">,
  ): Promise<string> {
    const fromObjectKey =
      payload.object_key !== undefined ? payload.object_key.trim() : "";
    const fromPath =
      payload.media_file_path !== undefined
        ? payload.media_file_path.trim()
        : "";

    const key = fromObjectKey || fromPath;
    if (!key) {
      throw new HttpError(
        400,
        "Provide object_key from the presign response or media_file_path with the same storage key",
      );
    }
    if (fromObjectKey && fromPath && fromObjectKey !== fromPath) {
      throw new HttpError(
        400,
        "object_key and media_file_path must match when both are provided",
      );
    }

    await s3Service.validateSessionMediaObjectKey(programId, key);
    return key;
  }

  async createSession(
    tenantId: string,
    actor: string,
    payload: SessionPayload,
  ) {
    const transaction = await SessionModel.sequelize!.transaction();

    try {
      logger.info("Creating session");
      const media_file_path = await this.resolveSessionMediaStorageKey(
        tenantId,
        payload.program_id,
        payload,
      );

      const session = await SessionModel.create(
        {
          tenant_id: tenantId,
          program_id: payload.program_id,
          client_key: payload.client_key,
          type: payload.type,
          title: payload.title,
          duration: payload.duration,
          ordered_position: payload.ordered_position,
          instructor_name: payload.instructor_name,
          tags: payload.tags,
          media_file_path,
        },
        { transaction },
      );

      eventService.emitEventHelper(EventTypes.SESSION_CREATED, {
        tenantId,
        actor,
        action: EventTypes.SESSION_CREATED,
        targetEntity: "SessionModel",
        transaction,
      });

      await transaction.commit();
      logger.info("Session created successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Session created successfully",
        data: session,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to create session", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async listSessions(params: SessionListParams) {
    const transaction = await SessionModel.sequelize!.transaction();

    try {
      logger.info("Fetching sessions");
      const { rows, count } = await SessionModel.findAndCountAll({
        where: { program_id: params.programId },
        order: [["ordered_position", "ASC"]],
        limit: params.limit,
        offset: params.offset,
        transaction,
      });

      await transaction.commit();
      logger.info("Sessions fetched successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Sessions fetched successfully",
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
      logger.error("Failed to fetch sessions", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getSession(tenantId: string, sessionId: string) {
    const transaction = await SessionModel.sequelize!.transaction();

    try {
      logger.info("Fetching session");
      const session = await SessionModel.findByPk(sessionId, { transaction });

      if (!session) {
        throw new HttpError(404, "Session not found");
      }

      await transaction.commit();
      logger.info("Session fetched successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Session fetched successfully",
        data: session,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to fetch session", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async updateSession(
    tenantId: string,
    actor: string,
    sessionId: string,
    payload: Partial<SessionPayload>,
  ) {
    const transaction = await SessionModel.sequelize!.transaction();

    try {
      logger.info("Updating session");
      const session = await SessionModel.findByPk(sessionId, { transaction });

      if (!session) {
        throw new HttpError(404, "Session not found");
      }

      const updateData: Record<string, unknown> = { ...payload };
      delete updateData.object_key;

      const hasOkObjectKey =
        payload.object_key !== undefined &&
        payload.object_key.trim() !== "";
      const hasOkMediaPath =
        payload.media_file_path !== undefined &&
        payload.media_file_path.trim() !== "";

      if (hasOkObjectKey || hasOkMediaPath) {
        const mediaPayload: Pick<
          SessionPayload,
          "object_key" | "media_file_path"
        > = {};
        if (hasOkObjectKey && payload.object_key) {
          mediaPayload.object_key = payload.object_key.trim();
        }
        if (hasOkMediaPath && payload.media_file_path) {
          mediaPayload.media_file_path = payload.media_file_path.trim();
        }
        const mediaPath = await this.resolveSessionMediaStorageKey(
          tenantId,
          session.program_id,
          mediaPayload,
        );
        updateData.media_file_path = mediaPath;
      }

      await session.update(updateData, { transaction });
      await transaction.commit();
      logger.info("Session updated successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Session updated successfully",
        data: session,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to update session", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async deleteSession(tenantId: string, actor: string, sessionId: string) {
    const transaction = await SessionModel.sequelize!.transaction();

    try {
      logger.info("Deleting session");
      const session = await SessionModel.findByPk(sessionId, { transaction });

      if (!session) {
        throw new HttpError(404, "Session not found");
      }

      await session.destroy({ transaction });

      eventService.emitEventHelper(EventTypes.SESSION_DELETED, {
        tenantId,
        actor,
        action: EventTypes.SESSION_DELETED,
        targetEntity: "SessionModel",
        transaction,
      });

      await transaction.commit();
      logger.info("Session deleted successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Session deleted successfully",
        data: { message: "Session deleted" },
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to delete session", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async reorderSessions(
    tenantId: string,
    actor: string,
    sessions: ReorderSessionPayload[],
  ) {
    const transaction = await SessionModel.sequelize!.transaction();

    try {
      logger.info("Reordering sessions");
      for (const session of sessions) {
        const [updatedCount] = await SessionModel.update(
          { ordered_position: session.orderedPosition },
          {
            where: { session_id: session.sessionId },
            transaction,
          },
        );

        if (updatedCount === 0) {
          throw new HttpError(404, "Session not found");
        }
      }

      eventService.emitEventHelper(EventTypes.SESSION_REORDERED, {
        tenantId,
        actor,
        action: EventTypes.SESSION_REORDERED,
        targetEntity: "SessionModel",
        transaction,
      });

      await transaction.commit();
      logger.info("Sessions reordered successfully");

      return {
        status: ApiResponseStatus.SUCCESS,
        message: "Sessions reordered successfully",
        data: { message: "Sessions reordered" },
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Failed to reorder sessions", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export default new SessionService();
