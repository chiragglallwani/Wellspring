import { DataTypes, type QueryInterface } from "sequelize";

const schema = "wellspring";
const tableName = "bulk_upload_jobs";

type MigrationParams = {
  context: QueryInterface;
};

export const up = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.addColumn(
    { tableName, schema },
    "skipped_count",
    {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  );
};

export const down = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.removeColumn(
    { tableName, schema },
    "skipped_count",
  );
};
