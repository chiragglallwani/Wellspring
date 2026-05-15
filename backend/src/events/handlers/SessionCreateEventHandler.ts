import logger from "../../config/logger";
import { EventTypes } from "../types/EventTypes";
import auditService from "../../services/modules/audit.service";
type SessionCreateEventHandlerData = {
  tenantId: string;
  actor: string;
  action: string;
  targetEntity: string;
};

const SessionCreateEventHandler = async (
  data: SessionCreateEventHandlerData,
) => {
  try {
    logger.info(`Creating audit log for session creation`);
    await auditService.recordAudit(
      data.tenantId,
      data.actor,
      EventTypes.SESSION_CREATED,
      "SessionModel",
    );
  } catch (error) {
    logger.error(`Error creating audit log for session creation: ${error}`);
  }
};

export default SessionCreateEventHandler;
