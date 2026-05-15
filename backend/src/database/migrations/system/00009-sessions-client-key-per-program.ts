import { type QueryInterface } from "sequelize";

const schema = "wellspring";
const tableName = "sessions";

type MigrationParams = {
  context: QueryInterface;
};

/**
 * Drop global unique on client_key; enforce uniqueness per tenant + program instead.
 */
export const up = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `
        ALTER TABLE "${schema}"."${tableName}"
        DROP CONSTRAINT IF EXISTS "${tableName}_client_key_key";
      `,
      { transaction },
    );

    await queryInterface.sequelize.query(
      `
        ALTER TABLE "${schema}"."${tableName}"
        DROP CONSTRAINT IF EXISTS "${tableName}_client_key_key1";
      `,
      { transaction },
    );

    await queryInterface.sequelize.query(
      `
        CREATE UNIQUE INDEX IF NOT EXISTS "sessions_tenant_program_client_key_unique"
        ON "${schema}"."${tableName}" ("tenant_id", "program_id", "client_key")
        WHERE "deletedAt" IS NULL;
      `,
      { transaction },
    );
  });
};

export const down = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `
        DROP INDEX IF EXISTS "${schema}"."sessions_tenant_program_client_key_unique";
      `,
      { transaction },
    );

    await queryInterface.sequelize.query(
      `
        ALTER TABLE "${schema}"."${tableName}"
        ADD CONSTRAINT "${tableName}_client_key_key" UNIQUE ("client_key");
      `,
      { transaction },
    );
  });
};
