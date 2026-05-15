import { DataTypes, Sequelize, type ModelStatic, type Model } from "sequelize";
import BaseModel from "./BaseModel";

class SessionModel extends BaseModel {
  declare session_id: string;
  declare program_id: string;
  declare client_key: string;
  declare type: "audio" | "video";
  declare title: string;
  declare duration: number;
  declare ordered_position: number;
  declare instructor_name: string;
  declare tags: string[];
  declare media_file_path: string;

  static initSessionModel(sequelize: Sequelize) {
    return super.initModel(
      {
        session_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        program_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        client_key: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        type: {
          type: DataTypes.ENUM("audio", "video"),
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        duration: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        ordered_position: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        instructor_name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        tags: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          defaultValue: [],
        },
        media_file_path: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "sessions",
        modelName: "SessionModel",
        indexes: [
          {
            name: "sessions_tenant_program_client_key_unique",
            unique: true,
            fields: ["tenant_id", "program_id", "client_key"],
            where: { deletedAt: null },
          },
        ],
      },
    );
  }

  static associate(models: Record<string, ModelStatic<Model>>) {
    super.associate(models);
    this.belongsTo(models.ProgramsModel!, {
      foreignKey: "program_id",
      as: "program",
    });
  }
}

export default SessionModel;
