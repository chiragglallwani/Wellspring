import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiResponseStatus } from "../constants/apiResponse";
import { setAsyncStorage } from "../utils/asyncstorage";
import { getJwtSecret } from "../utils/token";

export type JwtUserPayload = {
  userId: string;
  tenantId: string;
  userFullName: string;
  userEmail: string;
};

export const authMiddleware = (
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

    req.user = payload;
    setAsyncStorage({ tenantId: payload.tenantId, user: payload }); // todo: remove user from async storage
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
