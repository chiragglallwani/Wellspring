import { Op, type Transaction, type WhereOptions } from "sequelize";
import AuditLogModel from "../../database/models/tenant/AuditLogModel";
import { ApiResponseStatus } from "../../constants/apiResponse";

type AuditFilters = {
  tenantId: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
  offset: number;
};

class AuditService {
  async recordAudit(
    tenantId: string,
    actor: string,
    action: string,
    targetEntity: string,
    transaction?: Transaction,
  ) {
    if (transaction) {
      await AuditLogModel.create(
        {
          tenant_id: tenantId,
          actor,
          action,
          target_entity: targetEntity,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { transaction },
      );
      return;
    }

    const localTx = await AuditLogModel.sequelize!.transaction();
    try {
      await AuditLogModel.create(
        {
          tenant_id: tenantId,
          actor,
          action,
          target_entity: targetEntity,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { transaction: localTx },
      );
      await localTx.commit();
    } catch (error) {
      await localTx.rollback();
      throw error;
    }
  }

  async getAuditLogs(filters: AuditFilters) {
    const transaction = await AuditLogModel.sequelize!.transaction();
    const where: WhereOptions = {};

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate ? { [Op.gte]: new Date(filters.startDate) } : {}),
        ...(filters.endDate ? { [Op.lte]: new Date(filters.endDate) } : {}),
      };
    }

    const { rows, count } = await AuditLogModel.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: filters.limit,
      offset: filters.offset,
      transaction,
    });

    await transaction.commit();

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Audit logs fetched",
      data: {
        items: rows,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: count,
          totalPages: Math.ceil(count / filters.limit),
        },
      },
    };
  }
}

export default new AuditService();
