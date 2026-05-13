import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiResponseStatus } from "../constants/apiResponse";
import { setAsyncStorage } from "../utils/asyncstorage";
import { getJwtSecret } from "../utils/token";
import UserModel from "../database/models/tenant/UserModel";
import logger from "../config/logger";

export type JwtUserPayload = {
  userId: string;
  tenantId: string;
  userFullName: string;
  userEmail: string;
};

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authorizationHeader = req.headers.authorization;
  const token = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : undefined;

  if (!token) {
    return res.status(403).json({
      status: ApiResponseStatus.UNAUTHORIZED,
      message: "Authorization bearer token is required",
      error: null,
    });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtUserPayload;

    if (!payload.tenantId) {
      return res.status(403).json({
        status: ApiResponseStatus.UNAUTHORIZED,
        message: "Tenant ID is missing from token",
        error: null,
      });
    }
    setAsyncStorage({ tenantId: payload.tenantId });

    const user = await UserModel.findOne({
      where: { user_id: payload.userId },
    });
    if (!user) {
      return res.status(403).json({
        status: ApiResponseStatus.UNAUTHORIZED,
        message: "User not found",
        error: null,
      });
    }

    logger.info("User found", { tokenPayload: payload, user });

    req.user = {
      userId: user.user_id,
      tenantId: payload.tenantId,
      userFullName: user.name,
      userEmail: user.email,
    };
    setAsyncStorage({ tenantId: payload.tenantId, user });
    return next();
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? "Token expired"
        : "Invalid authorization token";

    return res.status(403).json({
      status: ApiResponseStatus.UNAUTHORIZED,
      message,
      error: null,
    });
  }
};
