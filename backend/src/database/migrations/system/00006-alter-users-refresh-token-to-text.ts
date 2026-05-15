import { DataTypes, type QueryInterface, type Transaction } from "sequelize";

const schema = "wellspring";
const tableName = "users";

type MigrationParams = {
  context: QueryInterface;
};

export const up = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.sequelize.transaction(async (transaction: Transaction) => {
    await queryInterface.changeColumn(
      { tableName, schema },
      "refreshToken",
      {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      { transaction },
    );
  });
};

export const down = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.sequelize.transaction(async (transaction: Transaction) => {
    await queryInterface.changeColumn(
      { tableName, schema },
      "refreshToken",
      {
        type: DataTypes.STRING,
        allowNull: true,
      },
      { transaction },
    );
  });
};

