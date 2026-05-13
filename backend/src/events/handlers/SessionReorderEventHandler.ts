import { Transaction } from "sequelize";
import logger from "../../config/logger";
import auditService from "../../services/modules/audit.service";
import { EventTypes } from "../types/EventTypes";

type SessionReorderEventHandlerData = {
  tenantId: string;
  actor: string;
  action: string;
  targetEntity: string;
  transaction: Transaction;
};

export const sessionReorderEventHandler = async (
  data: SessionReorderEventHandlerData,
) => {
  try {
    logger.info(`Creating audit log for session reordering`);
    await auditService.recordAudit(
      data.tenantId,
      data.actor,
      EventTypes.SESSION_REORDERED,
      "SessionModel",
      data.transaction,
    );
  } catch (error) {
    logger.error(`Error creating audit log for session reordering: ${error}`);
  }
};
