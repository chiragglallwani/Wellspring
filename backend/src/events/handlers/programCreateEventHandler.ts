import { Transaction } from "sequelize";
import auditService from "../../services/modules/audit.service";
import logger from "../../config/logger";
import { EventTypes } from "../types/EventTypes";

type ProgramCreateEventHandlerData = {
  tenantId: string;
  actor: string;
  action: string;
  targetEntity: string;
  transaction: Transaction;
};

const ProgramCreateEventHandler = async (
  data: ProgramCreateEventHandlerData,
) => {
  try {
    logger.info(`Creating audit log for program creation`);
    await auditService.recordAudit(
      data.tenantId,
      data.actor,
      EventTypes.PROGRAM_CREATED,
      "ProgramsModel",
      data.transaction,
    );
  } catch (error) {
    logger.error(`Error creating audit log for program creation: ${error}`);
  }
};

export default ProgramCreateEventHandler;
