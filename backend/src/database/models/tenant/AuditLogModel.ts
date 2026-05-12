import { DataTypes, Model, ModelStatic, Sequelize } from "sequelize";
import BaseModel from "./BaseModel";

class AuditLogModel extends BaseModel {
  declare log_id: string;
  declare actor: string;
  declare action: string; // Like 'CREATE', 'UPDATE', 'DELETE'
  declare target_entity: string; // Like 'ProgramsModel', 'SessionModel'

  static initAuditLogModel(sequelize: Sequelize) {
    return super.initModel(
      {
        audit_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        actor: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        action: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        target_entity: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "audit_logs",
        modelName: "AuditLogModel",
        updatedAt: false, // Audit logs are immutable, so we disable updatedAt
      },
    );
  }

  static associate(models: Record<string, ModelStatic<Model>>) {
    super.associate(models);
    this.belongsTo(models.UserModel!, {
      foreignKey: "actor",
      targetKey: "user_id",
    });
  }
}

export default AuditLogModel;
