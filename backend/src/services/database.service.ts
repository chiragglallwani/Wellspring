import { Sequelize } from "sequelize";
import logger from "../config/logger.js";
import migrationService from "./migration.service.js";
import dotenv from "dotenv";

dotenv.config();

const databaseName = process.env.DATABASE_NAME as string;
const databaseUser = process.env.DATABASE_USER as string;
const databasePassword = process.env.DATABASE_PASSWORD as string;
const databaseHost = process.env.DATABASE_HOST as string;
const databasePort = process.env.DATABASE_PORT as string;
const databaseSsl =
  process.env.NODE_ENV === "local" ? false : (true as boolean);

class DatabaseService {
  private wellSpringSchemaConnection!: Sequelize;

  async initializeWellSpringSchemaConnection() {
    try {
      this.wellSpringSchemaConnection = new Sequelize(
        databaseName,
        databaseUser,
        databasePassword,
        {
          dialect: "postgres",
          dialectOptions: {
            keepAlive: true,
          },
          pool: {
            max: 20,
            min: 4,
            acquire: 30000,
            idle: 10000,
            evict: 15000,
          },
          retry: {
            max: 3,
          },
          host: databaseHost,
          port: parseInt(databasePort),
          logging: (msg) => logger.debug(msg),
          ssl: databaseSsl,
          schema: "wellspring",
        },
      );
      await this.wellSpringSchemaConnection.authenticate();
      await this.registerModels(this.wellSpringSchemaConnection);
      await migrationService.setConnection(this.wellSpringSchemaConnection);
      logger.info("Database connection initialized", {
        environment: process.env.NODE_ENV,
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Error initializing wellspring schema connection", {
          error: error.message,
          stackTrace: error.stack,
        });
      }
      throw error;
    }
  }

  async registerModels(connection: Sequelize) {
    // todo: register the models for the wellspring schema
  }

  async cleanUp() {
    await this.wellSpringSchemaConnection.close();
  }
}

export default new DatabaseService();
