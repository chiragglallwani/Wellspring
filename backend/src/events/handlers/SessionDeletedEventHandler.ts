import logger from "../../config/logger";
import auditService from "../../services/modules/audit.service";
import { EventTypes } from "../types/EventTypes";

type SessionDeletedEventHandlerData = {
  tenantId: string;
  actor: string;
  action: string;
  targetEntity: string;
};

const SessionDeletedEventHandler = async (
  data: SessionDeletedEventHandlerData,
) => {
  try {
    logger.info(`Creating audit log for session deletion`);
    await auditService.recordAudit(
      data.tenantId,
      data.actor,
      EventTypes.SESSION_DELETED,
      "SessionModel",
    );
  } catch (error) {
    logger.error(`Error creating audit log for session deletion: ${error}`);
  }
};

export default SessionDeletedEventHandler;
