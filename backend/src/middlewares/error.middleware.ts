import type { NextFunction, Request, Response } from "express";
import logger from "../config/logger";
import { ApiResponseStatus } from "../constants/apiResponse";
import { HttpError } from "../utils/http";

export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      status: ApiResponseStatus.FAILURE,
      message: error.message,
      error: null,
    });
  }

  logger.error("Unhandled request error", {
    error: error.message,
    stackTrace: error.stack,
  });

  return res.status(500).json({
    status: ApiResponseStatus.FAILURE,
    message: "Internal server error",
    error: null,
  });
};
