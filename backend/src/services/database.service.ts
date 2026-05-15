import { Sequelize } from "sequelize";
import logger from "../config/logger";
import migrationService from "./migration.service";
import Tenant from "../database/models/system/Tenant";
import UserModel from "../database/models/tenant/UserModel";
import ProgramsModel from "../database/models/tenant/ProgramsModel";
import SessionModel from "../database/models/tenant/SessionModel";
import AuditLogModel from "../database/models/tenant/AuditLogModel";
import BulkUploadJobModel from "../database/models/tenant/BulkUploadJobModel";

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
    const models = {
      Tenant: Tenant.initModel(connection),
      UserModel: UserModel.initUserModel(connection),
      ProgramsModel: ProgramsModel.initProgramsModel(connection),
      SessionModel: SessionModel.initSessionModel(connection),
      AuditLogModel: AuditLogModel.initAuditLogModel(connection),
      BulkUploadJobModel: BulkUploadJobModel.initBulkUploadJobModel(connection),
    };

    Object.values(models).forEach((model: any) => {
      if (typeof model.associate === "function") {
        model.associate(models);
      }
    });

    logger.info("Models registered and associations established.");
  }

  async cleanUp() {
    await this.wellSpringSchemaConnection.close();
  }
}

export default new DatabaseService();
