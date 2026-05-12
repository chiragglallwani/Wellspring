import { Umzug, SequelizeStorage } from "umzug";
import logger from "../config/logger.js";
import { Sequelize } from "sequelize";

class MigrationService {
  private connection!: Sequelize;
  setConnection(connection: Sequelize) {
    this.connection = connection;
  }
  createUmzug(sequelize: Sequelize, migrationType: "schema" | "wellspring") {
    const migrations = {
      glob:
        migrationType === "schema"
          ? `src/database/migrations/schema/*.ts`
          : `src/database/migrations/system/*.ts`,
      cwd: process.cwd(),
    };

    return new Umzug({
      migrations,
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger,
    });
  }
  async runSchemaMigrations() {
    await this.initializePublicSchemaConnection();
    const umzug = this.createUmzug(this.connection, "schema");
    await umzug.up();
    await this.connection.close();
  }

  async runSystemMigrations() {
    const umzug = this.createUmzug(this.connection, "wellspring");
    await umzug.up();
  }

  async initializePublicSchemaConnection() {
    try {
      this.setConnection(
        new Sequelize(
          process.env.DATABASE_NAME as string,
          process.env.DATABASE_USER as string,
          process.env.DATABASE_PASSWORD as string,
          {
            dialect: "postgres",
            host: process.env.DATABASE_HOST as string,
            port: parseInt(process.env.DATABASE_PORT as string),
            logging: (msg) => logger.debug(msg),
            ssl: process.env.NODE_ENV !== "local",
          },
        ),
      );
      await this.connection.authenticate();
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Public schema connection failed", {
          error: error.message,
          stackTrace: error.stack,
        });
      }
      throw error;
    }
  }
}

export default new MigrationService();
