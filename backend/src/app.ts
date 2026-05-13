import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import logger from "./config/logger.js";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import migrationService from "./services/migration.service.js";
import databaseService from "./services/database.service.js";
import eventService from "./events/event.service.js";
import { asyncStorageMiddleware } from "./utils/asyncstorage.js";
import routes from "./routes";
import { errorMiddleware } from "./middlewares/error.middleware";

dotenv.config();

async function intializeDatabase() {
  try {
    await migrationService.runSchemaMigrations();
    await databaseService.initializeWellSpringSchemaConnection();
    await migrationService.runSystemMigrations();
    logger.info("Database migrations completed", {
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error initializing database migrations", {
        error: error.message,
        stackTrace: error.stack,
      });
    }
    throw error;
  }
}

const app = express();
app.use(asyncStorageMiddleware);
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "csrf_token"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_IN_MS),
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "failure",
    message: "Too many requests",
  },
  headers: true,
});
app.use(limiter);
app.use("/api/v1", routes);
app.use(errorMiddleware);

intializeDatabase()
  .then(() => {
    eventService.registerHandlers();
    app.listen(process.env.PORT, () => {
      logger.info(`Server is running on port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  });
