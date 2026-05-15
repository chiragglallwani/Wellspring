import { Op, type Transaction, type WhereOptions } from "sequelize";
import AuditLogModel from "../../database/models/tenant/AuditLogModel";
import UserModel from "../../database/models/tenant/UserModel";
import { ApiResponseStatus } from "../../constants/apiResponse";

function formatActorNameEmail(
  user: { name: string; email: string } | null | undefined,
  actorId: string,
): string {
  if (user?.name && user?.email) {
    return `${user.name} · ${user.email}`;
  }
  return actorId;
}

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
      include: [
        {
          model: UserModel,
          attributes: ["name", "email"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: filters.limit,
      offset: filters.offset,
      transaction,
    });

    await transaction.commit();

    const items = rows.map((row) => {
      const plain = row.get({ plain: true }) as {
        audit_id: string;
        actor: string;
        action: string;
        target_entity: string;
        createdAt: Date;
        UserModel?: { name: string; email: string } | null;
      };

      return {
        audit_id: plain.audit_id,
        name_email: formatActorNameEmail(plain.UserModel, plain.actor),
        action: plain.action,
        target_entity: plain.target_entity,
        createdAt: plain.createdAt,
      };
    });

    return {
      status: ApiResponseStatus.SUCCESS,
      message: "Audit logs fetched",
      data: {
        items,
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
