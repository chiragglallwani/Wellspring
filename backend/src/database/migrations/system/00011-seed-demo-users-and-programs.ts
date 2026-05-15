import argon2 from "argon2";
import { Op, type QueryInterface, type Transaction } from "sequelize";

const schema = "wellspring";

/** Shared demo password for seeded accounts (local/dev only). */
export const SEED_USER_PASSWORD = "Wellspring1!";

type MigrationParams = {
  context: QueryInterface;
};

type SeedTenant = {
  tenantId: string;
  name: string;
  email: string;
  userId: string;
  userName: string;
  programs: Array<{
    programId: string;
    name: string;
    description: string;
    length: number;
    isActive: boolean;
  }>;
};

const SEED_TENANTS: SeedTenant[] = [
  {
    tenantId: "seedtenant01",
    name: "Harmony Wellness Studio",
    email: "demo1@wellspring.local",
    userId: "a1000001-0001-4000-8000-000000000001",
    userName: "Alex Rivera",
    programs: [
      {
        programId: "b1000001-0001-4000-8000-000000000001",
        name: "Morning Reset",
        description: "A gentle 7-day audio program to start the day with calm focus.",
        length: 7,
        isActive: true,
      },
      {
        programId: "b1000001-0002-4000-8000-000000000002",
        name: "Deep Sleep Journey",
        description: "Evening sessions designed to improve sleep quality and recovery.",
        length: 14,
        isActive: true,
      },
      {
        programId: "b1000001-0003-4000-8000-000000000003",
        name: "Breathwork Basics",
        description: "Foundational breathing practices for stress regulation.",
        length: 5,
        isActive: false,
      },
    ],
  },
  {
    tenantId: "seedtenant02",
    name: "Stillwater Mindfulness",
    email: "demo2@wellspring.local",
    userId: "a1000002-0002-4000-8000-000000000002",
    userName: "Jordan Lee",
    programs: [
      {
        programId: "b1000002-0001-4000-8000-000000000001",
        name: "Stress Relief Essentials",
        description: "Short guided sessions to reduce tension during busy weeks.",
        length: 10,
        isActive: true,
      },
      {
        programId: "b1000002-0002-4000-8000-000000000002",
        name: "Focus Flow",
        description: "Concentration training for creators between client sessions.",
        length: 8,
        isActive: true,
      },
      {
        programId: "b1000002-0003-4000-8000-000000000003",
        name: "Evening Wind-down",
        description: "Progressive relaxation to close the workday with intention.",
        length: 6,
        isActive: true,
      },
    ],
  },
];

const SEED_TENANT_IDS = SEED_TENANTS.map((tenant) => tenant.tenantId);

const setTenantContext = async (
  queryInterface: QueryInterface,
  tenantId: string,
  transaction: Transaction,
) => {
  await queryInterface.sequelize.query(
    `SELECT set_config('app.current_tenant_id', :tenantId, true)`,
    {
      transaction,
      replacements: { tenantId },
    },
  );
};

const seedExists = async (
  queryInterface: QueryInterface,
  transaction: Transaction,
) => {
  const [rows] = await queryInterface.sequelize.query(
    `
      SELECT tenant_id
      FROM "${schema}"."tenant_profiles"
      WHERE tenant_id IN (:tenantIds)
      LIMIT 1
    `,
    {
      transaction,
      replacements: { tenantIds: SEED_TENANT_IDS },
    },
  );

  return Array.isArray(rows) && rows.length > 0;
};

export const up = async ({ context: queryInterface }: MigrationParams) => {
  const passwordHash = await argon2.hash(SEED_USER_PASSWORD);
  const now = new Date();

  await queryInterface.sequelize.transaction(async (transaction) => {
    if (await seedExists(queryInterface, transaction)) {
      return;
    }

    for (const tenant of SEED_TENANTS) {
      await queryInterface.bulkInsert(
        { tableName: "tenant_profiles", schema },
        [
          {
            tenant_id: tenant.tenantId,
            name: tenant.name,
            email: tenant.email,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        { transaction },
      );

      await setTenantContext(queryInterface, tenant.tenantId, transaction);

      await queryInterface.bulkInsert(
        { tableName: "users", schema },
        [
          {
            tenant_id: tenant.tenantId,
            user_id: tenant.userId,
            name: tenant.userName,
            email: tenant.email,
            password: passwordHash,
            refreshToken: null,
            reset_code: null,
            reset_code_expires_at: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        { transaction },
      );

      await queryInterface.bulkInsert(
        { tableName: "programs", schema },
        tenant.programs.map((program) => ({
          tenant_id: tenant.tenantId,
          program_id: program.programId,
          name: program.name,
          description: program.description,
          length: program.length,
          isActive: program.isActive,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })),
        { transaction },
      );
    }
  });
};

export const down = async ({ context: queryInterface }: MigrationParams) => {
  await queryInterface.sequelize.transaction(async (transaction) => {
    for (const tenantId of SEED_TENANT_IDS) {
      await setTenantContext(queryInterface, tenantId, transaction);

      await queryInterface.sequelize.query(
        `
          DELETE FROM "${schema}"."programs"
          WHERE tenant_id = :tenantId
        `,
        { transaction, replacements: { tenantId } },
      );

      await queryInterface.sequelize.query(
        `
          DELETE FROM "${schema}"."users"
          WHERE tenant_id = :tenantId
        `,
        { transaction, replacements: { tenantId } },
      );
    }

    await queryInterface.bulkDelete(
      { tableName: "tenant_profiles", schema },
      { tenant_id: { [Op.in]: SEED_TENANT_IDS } },
      { transaction },
    );
  });
};
