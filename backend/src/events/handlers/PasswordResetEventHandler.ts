import logger from "../../config/logger";
import auditService from "../../services/modules/audit.service";
import { EventTypes } from "../types/EventTypes";

type PasswordResetEventHandlerData = {
  tenantId: string;
  actor: string;
  targetEntity: string;
};

const passwordResetEventHandler = async (data: PasswordResetEventHandlerData) => {
  try {
    logger.info("Creating audit log for password reset");
    await auditService.recordAudit(
      data.tenantId,
      data.actor,
      EventTypes.PASSWORD_RESETED,
      data.targetEntity,
    );
  } catch (error) {
    logger.error(`Error creating audit log for password reset: ${error}`);
  }
};

export default passwordResetEventHandler;
