import { DataTypes, type QueryInterface, type Transaction } from "sequelize";

const schema = "wellspring";
const tableName = "users";

type MigrationParams = {
  context: QueryInterface;
};

export const up = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.sequelize.transaction(async (transaction: Transaction) => {
    await queryInterface.addColumn(
      { tableName, schema },
      "reset_code",
      {
        type: DataTypes.STRING(6),
        allowNull: true,
      },
      { transaction },
    );

    await queryInterface.addColumn(
      { tableName, schema },
      "reset_code_expires_at",
      {
        type: DataTypes.DATE,
        allowNull: true,
      },
      { transaction },
    );
  });
};

export const down = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.sequelize.transaction(async (transaction: Transaction) => {
    await queryInterface.removeColumn(
      { tableName, schema },
      "reset_code_expires_at",
      { transaction },
    );
    await queryInterface.removeColumn(
      { tableName, schema },
      "reset_code",
      { transaction },
    );
  });
};
