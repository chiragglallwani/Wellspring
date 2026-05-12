import { DataTypes, Model, ModelStatic, Sequelize } from "sequelize";
import BaseModel from "./BaseModel";

class UserModel extends BaseModel {
  declare user_id: string;
  declare name: string;
  declare email: string;
  declare password: string;
  declare refreshToken: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt: Date | null;

  static initUserModel(sequelize: Sequelize) {
    return super.initModel(
      {
        user_id: {
          type: DataTypes.UUID,
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
        password: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        refreshToken: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "users",
        modelName: "UserModel",
        timestamps: true,
        paranoid: true,
      },
    );
  }

  static associate(models: Record<string, ModelStatic<Model>>) {
    super.associate(models);
  }
}

export default UserModel;
