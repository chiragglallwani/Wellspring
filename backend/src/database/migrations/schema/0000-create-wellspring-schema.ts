import { QueryInterface } from "sequelize";

export const up = async ({
  context: queryInterface,
}: {
  context: QueryInterface;
}) => {
  await queryInterface.sequelize.query(
    `CREATE SCHEMA IF NOT EXISTS wellspring;`,
  );
};

export const down = async ({
  context: queryInterface,
}: {
  context: QueryInterface;
}) => {
  await queryInterface.sequelize.query(`DROP SCHEMA IF EXISTS wellspring;`);
};
