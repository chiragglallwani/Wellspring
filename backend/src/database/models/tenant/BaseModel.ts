import {
  DataTypes,
  Model,
  type InitOptions,
  type ModelAttributes,
  type ModelStatic,
  type UpdateOptions,
} from "sequelize";
import { getTenantId } from "../../../utils/asyncstorage";

class BaseModel extends Model {
  declare tenant_id: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt: Date | null;

  static initModel(
    attributes: ModelAttributes<BaseModel>,
    options: InitOptions<BaseModel>,
  ) {
    return super.init(
      {
        tenant_id: {
          type: DataTypes.STRING,
          references: {
            model: {
              tableName: "tenant_profiles",
            },
            key: "tenant_id",
          },
          field: "tenant_id",
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        ...attributes,
      },
      {
        ...options,
        timestamps: true,
        paranoid: true,
        hooks: {
          beforeCreate: (instance) => {
            const tenantId = getTenantId();
            if (!instance.tenant_id) {
              instance.tenant_id = tenantId;
            } else if (instance.tenant_id !== tenantId) {
              throw new Error("Tenant ID mismatch");
            }
            instance.createdAt = new Date();
          },
          beforeDestroy: (instance) => {
            const tenantId = getTenantId();
            if (!instance.tenant_id) {
              instance.tenant_id = tenantId;
            } else if (instance.tenant_id !== tenantId) {
              throw new Error("Tenant ID mismatch");
            }
            instance.deletedAt = new Date();
          },
          beforeRestore: (instance) => {
            const tenantId = getTenantId();
            if (instance.tenant_id !== tenantId) {
              throw new Error("Tenant ID mismatch");
            }
          },
          beforeUpdate: (instance) => {
            const tenantId = getTenantId();
            if (!instance.tenant_id) {
              instance.tenant_id = tenantId;
            } else if (instance.tenant_id !== tenantId) {
              throw new Error("Tenant ID mismatch");
            }
            instance.updatedAt = new Date();
          },
          beforeSave: (instance) => {
            const tenantId = getTenantId();
            if (!instance.tenant_id) {
              instance.tenant_id = tenantId;
            } else if (instance.tenant_id !== tenantId) {
              throw new Error("Tenant ID mismatch");
            }
          },
          beforeUpsert: (values) => {
            const tenantId = getTenantId();
            if (!values.tenant_id) {
              values.tenant_id = tenantId;
            } else if (values.tenant_id !== tenantId) {
              throw new Error("Tenant ID mismatch");
            }
          },
          beforeBulkCreate: (instances) => {
            const tenantId = getTenantId();
            for (const instance of instances) {
              if (!instance.tenant_id) {
                instance.tenant_id = tenantId;
              } else if (instance.tenant_id !== tenantId) {
                throw new Error("Tenant ID mismatch");
              }
            }
          },
          beforeBulkUpdate: (options: UpdateOptions<BaseModel>) => {
            const tenantId = getTenantId();
            if (!options.where) {
              options.where = {};
            }
            options.where = {
              ...options.where,
              tenant_id: tenantId,
            } as any;
          },
          beforeFind: (options) => {
            const tenantId = getTenantId();
            if (!options.where) {
              options.where = {};
            }
            options.where = {
              ...options.where,
              tenant_id: tenantId,
            } as any;
          },
          beforeFindAfterExpandIncludeAll: (options) => {
            const tenantId = getTenantId();
            if (!options.where) {
              options.where = {};
            }
            options.where = {
              ...options.where,
              tenant_id: tenantId,
            } as any;
          },
          beforeFindAfterOptions: (options) => {
            const tenantId = getTenantId();
            if (!options.where) {
              options.where = {};
            }
            options.where = {
              ...options.where,
              tenant_id: tenantId,
            } as any;
          },
          beforeCount: (options) => {
            const tenantId = getTenantId();
            if (!options.where) {
              options.where = {};
            }
            options.where = {
              ...options.where,
              tenant_id: tenantId,
            } as any;
          },
        },
      },
    );
  }

  static associate(models: Record<string, ModelStatic<Model>>) {
    this.belongsTo(models.Tenant!, {
      foreignKey: "tenant_id",
      targetKey: "tenant_id",
    });
  }
}

export default BaseModel;
