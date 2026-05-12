import { DataTypes, type QueryInterface, type Transaction } from "sequelize";

const schema = "wellspring";
const tableName = "audit_logs";
const policyName = `${tableName}_tenant_isolation`;
const tenantPolicyCheck =
  "tenant_id = current_setting('app.current_tenant_id', true)";

type MigrationParams = {
  context: QueryInterface;
};

const addTenantIsolationPolicy = async (
  queryInterface: QueryInterface,
  transaction: Transaction,
) => {
  await queryInterface.sequelize.query(
    `
      ALTER TABLE "${schema}"."${tableName}" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "${schema}"."${tableName}" FORCE ROW LEVEL SECURITY;
      CREATE POLICY "${policyName}"
        ON "${schema}"."${tableName}"
        USING (${tenantPolicyCheck})
        WITH CHECK (${tenantPolicyCheck});
    `,
    { transaction },
  );
};

export const up = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      { tableName, schema },
      {
        tenant_id: {
          type: DataTypes.STRING,
          allowNull: false,
          references: {
            model: {
              tableName: "tenant_profiles",
              schema,
            },
            key: "tenant_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        audit_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        actor: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: "users",
              schema,
            },
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        action: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        target_entity: {
          type: DataTypes.STRING,
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
      { transaction },
    );

    await queryInterface.addIndex(
      { tableName, schema },
      ["tenant_id", "actor"],
      { transaction },
    );
    await addTenantIsolationPolicy(queryInterface, transaction);
  });
};

export const down = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.sequelize.query(
      `DROP POLICY IF EXISTS "${policyName}" ON "${schema}"."${tableName}";`,
      { transaction },
    );
    await queryInterface.dropTable({ tableName, schema }, { transaction });
  });
};
