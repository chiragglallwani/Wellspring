import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { ApiResponseStatus } from "../../constants/apiResponse";

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    status: ApiResponseStatus.BAD_REQUEST,
    message: "Validation failed",
    error: result.array(),
  });
};
