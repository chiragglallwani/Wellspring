import { DataTypes, Model, Sequelize, type ModelStatic } from "sequelize";

class Tenant extends Model {
  declare tenant_id: string;
  declare name: string;
  declare email: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt: Date | null;

  static initModel(sequelize: Sequelize) {
    return Tenant.init(
      {
        tenant_id: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        email: {
          unique: true,
          type: DataTypes.STRING,
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
      },
      {
        sequelize,
        tableName: "tenant_profiles",
        modelName: "Tenant",
        timestamps: true,
        paranoid: true,
        hooks: {
          beforeUpdate: async (tenant: Tenant) => {
            tenant.updatedAt = new Date();
          },
        },
      },
    );
  }

  static associate(models: Record<string, ModelStatic<Model>>) {
    this.hasMany(models.UserModel!, {
      foreignKey: "tenant_id",
      sourceKey: "tenant_id",
    });
    this.hasMany(models.ProgramsModel!, {
      foreignKey: "tenant_id",
      sourceKey: "tenant_id",
    });
    this.hasMany(models.AuditLogModel!, {
      foreignKey: "tenant_id",
      sourceKey: "tenant_id",
    });
  }
}

export default Tenant;
