import type { NextFunction, Request, Response } from "express";
import { ApiResponseStatus } from "../constants/apiResponse";

export const csrfMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const headerToken = req.headers.csrf_token;
  const csrfHeader = Array.isArray(headerToken) ? headerToken[0] : headerToken;
  const csrfCookie = req.cookies?.csrf_token;

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return res.status(401).json({
      status: ApiResponseStatus.UNAUTHORIZED,
      message: "Your session could not be verified. Please sign in again.",
      error: null,
    });
  }

  return next();
};
