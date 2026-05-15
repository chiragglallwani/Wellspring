import logger from "../../config/logger";
import auditService from "../../services/modules/audit.service";
import { EventTypes } from "../types/EventTypes";

type TenantCreateEventHandlerData = {
  tenantId: string;
  actor: string;
  action: string;
  targetEntity: string;
};

const tenantCreateEventHandler = async (data: TenantCreateEventHandlerData) => {
  try {
    logger.info(`Creating audit log for tenant creation`);
    await auditService.recordAudit(
      data.tenantId,
      data.actor,
      EventTypes.TENANT_CREATED,
      "Tenant",
    );
  } catch (error) {
    logger.error(`Error creating audit log for tenant creation: ${error}`);
  }
};

export default tenantCreateEventHandler;

