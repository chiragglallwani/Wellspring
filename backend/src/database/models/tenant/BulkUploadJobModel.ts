import { DataTypes, type ModelStatic, type Model, Sequelize } from "sequelize";
import BaseModel from "./BaseModel";

export type BulkUploadJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type BulkUploadRowFailure = {
  rowNumber: number;
  reason: string;
  client_key?: string;
  title?: string;
};

class BulkUploadJobModel extends BaseModel {
  declare job_id: string;
  declare program_id: string;
  declare created_by: string;
  declare status: BulkUploadJobStatus;
  declare total_rows: number;
  declare processed_count: number;
  declare failed_count: number;
  declare skipped_count: number;
  declare failures: BulkUploadRowFailure[];
  declare error_message: string | null;

  static initBulkUploadJobModel(sequelize: Sequelize) {
    return super.initModel(
      {
        job_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        program_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        created_by: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
          allowNull: false,
          defaultValue: "pending",
        },
        total_rows: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        processed_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        failed_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        skipped_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        failures: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        error_message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "bulk_upload_jobs",
        modelName: "BulkUploadJobModel",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  static associate(models: Record<string, ModelStatic<Model>>) {
    super.associate(models);
    this.belongsTo(models.ProgramsModel!, {
      foreignKey: "program_id",
      as: "program",
    });
    this.belongsTo(models.UserModel!, {
      foreignKey: "created_by",
      targetKey: "user_id",
      as: "creator",
    });
  }
}

export default BulkUploadJobModel;
