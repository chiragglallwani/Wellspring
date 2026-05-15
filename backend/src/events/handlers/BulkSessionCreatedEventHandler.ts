import logger from "../../config/logger";
import { EventTypes } from "../types/EventTypes";
import auditService from "../../services/modules/audit.service";

type BulkSessionCreatedEventHandlerData = {
  tenantId: string;
  actor: string;
  targetEntity: string;
};

const BulkSessionCreatedEventHandler = async (
  data: BulkSessionCreatedEventHandlerData,
) => {
  try {
    logger.info("Creating audit log for bulk session import completion");
    await auditService.recordAudit(
      data.tenantId,
      data.actor,
      EventTypes.BULK_SESSION_CREATED,
      data.targetEntity,
    );
  } catch (error) {
    logger.error(
      `Error creating audit log for bulk session import: ${error}`,
    );
  }
};

export default BulkSessionCreatedEventHandler;
