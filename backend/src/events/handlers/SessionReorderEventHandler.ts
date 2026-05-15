import logger from "../../config/logger";
import auditService from "../../services/modules/audit.service";
import { EventTypes } from "../types/EventTypes";

type SessionReorderEventHandlerData = {
  tenantId: string;
  actor: string;
  action: string;
  targetEntity: string;
};

const SessionReorderEventHandler = async (
  data: SessionReorderEventHandlerData,
) => {
  try {
    logger.info(`Creating audit log for session reordering`);
    await auditService.recordAudit(
      data.tenantId,
      data.actor,
      EventTypes.SESSION_REORDERED,
      "SessionModel",
    );
  } catch (error) {
    logger.error(`Error creating audit log for session reordering: ${error}`);
  }
};

export default SessionReorderEventHandler;
