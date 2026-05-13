import { DataTypes, type QueryInterface, type Transaction } from "sequelize";

const schema = "wellspring";
const tableName = "sessions";
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
        session_id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        client_key: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        program_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: "programs",
              schema,
            },
            key: "program_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
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
          allowNull: false,
          defaultValue: [],
        },
        media_file_path: {
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
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "${schema}"."enum_sessions_type";`,
      { transaction },
    );
  });
};
