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

function sendUnauthorized(res: Response, message: string) {
  return res.status(401).json({
    status: ApiResponseStatus.UNAUTHORIZED,
    message,
    error: null,
  });
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authorizationHeader = req.get("Authorization") ?? "";
  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : undefined;

  if (!token) {
    return sendUnauthorized(res, "Please sign in to continue.");
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtUserPayload;

    if (!payload.tenantId) {
      return sendUnauthorized(
        res,
        "Your session is invalid. Please sign in again.",
      );
    }
    setAsyncStorage({ tenantId: payload.tenantId });

    const user = await UserModel.findOne({
      where: { user_id: payload.userId },
    });
    if (!user) {
      return sendUnauthorized(
        res,
        "Your account could not be found. Please sign in again.",
      );
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
    if (error instanceof jwt.TokenExpiredError) {
      return sendUnauthorized(
        res,
        "Your session has expired. Please sign in again.",
      );
    }

    return sendUnauthorized(
      res,
      "Your session is invalid. Please sign in again.",
    );
  }
};
