import logger from "../../config/logger";
import { EventTypes } from "../types/EventTypes";
import auditService from "../../services/modules/audit.service";
import { Transaction } from "sequelize";

type SessionCreateEventHandlerData = {
  tenantId: string;
  actor: string;
  action: string;
  targetEntity: string;
  transaction: Transaction;
};

export const sessionCreateEventHandler = async (
  data: SessionCreateEventHandlerData,
) => {
  try {
    logger.info(`Creating audit log for session creation`);
    await auditService.recordAudit(
      data.tenantId,
      data.actor,
      EventTypes.SESSION_CREATED,
      "SessionModel",
      data.transaction,
    );
  } catch (error) {
    logger.error(`Error creating audit log for session creation: ${error}`);
  }
};
