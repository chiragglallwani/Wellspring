import { DataTypes, type QueryInterface } from "sequelize";

type MigrationParams = {
  context: QueryInterface;
};

const schema = "wellspring";
const tableName = "tenant_profiles";

export const up = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.createTable(
    {
      tableName,
      schema,
    },
    {
      tenant_id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        unique: true,
        type: DataTypes.STRING(255),
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
  );
};

export const down = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.dropTable({
    tableName,
    schema,
  });
  await queryInterface.sequelize.query(`DROP SCHEMA IF EXISTS "${schema}";`);
};
