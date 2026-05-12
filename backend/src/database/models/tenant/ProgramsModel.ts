import { DataTypes, Model, ModelStatic, Sequelize } from "sequelize";
import BaseModel from "./BaseModel";

class ProgramsModel extends BaseModel {
  declare program_id: string;
  declare name: string;
  declare description: string;
  declare length: number;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt: Date | null;

  static initProgramsModel(sequelize: Sequelize) {
    return super.initModel(
      {
        program_id: {
          type: DataTypes.UUID,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        length: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: "programs",
        modelName: "ProgramsModel",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  static associate(models: Record<string, ModelStatic<Model>>) {
    super.associate(models);

    this.hasMany(models.SessionModel!, {
      foreignKey: "program_id",
      as: "sessions",
      onDelete: "CASCADE", // delete its sessions on program deletion
    });
  }
}

export default ProgramsModel;
