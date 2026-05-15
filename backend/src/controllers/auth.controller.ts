import type { Request, Response } from "express";
import { ApiResponseStatus } from "../constants/apiResponse";
import authService from "../services/modules/auth.service";

const isProduction = process.env.NODE_ENV === "production";

/** Cross-origin SPA (e.g. localhost:3000 → API :4443) needs SameSite=None in dev. */
const cookieBase = {
  sameSite: (isProduction ? "strict" : "none") as "strict" | "none",
  /** SameSite=None requires Secure; localhost is a secure context in modern browsers. */
  secure: true,
  path: "/",
};

const setAuthHeaders = (
  res: Response,
  tokens: {
    accessToken: string;
    csrfToken: string;
    refreshToken: string;
  },
) => {
  res.setHeader("Authorization", `Bearer ${tokens.accessToken}`);
  res.setHeader("csrf_token", tokens.csrfToken);
  res.cookie("refreshToken", tokens.refreshToken, {
    ...cookieBase,
    httpOnly: true,
  });
  res.cookie("csrf_token", tokens.csrfToken, {
    ...cookieBase,
    httpOnly: false,
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie("refreshToken", cookieBase);
  res.clearCookie("csrf_token", cookieBase);
};

export const signup = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  const result = await authService.signup({ name, email, password });

  res.status(201).json({
    status: ApiResponseStatus.SUCCESS,
    message: "Signup successful",
    data: result,
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  setAuthHeaders(res, result.data);

  const { userFullName, userEmail, tenantName } = result.data.user;

  res.status(200).json({
    status: result.status,
    message: result.message,
    data: {
      user: {
        userFullName,
        userEmail,
        tenantName,
      },
      accessToken: result.data.accessToken,
      csrfToken: result.data.csrfToken,
    },
  });
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken || typeof refreshToken !== "string") {
    return res.status(401).json({
      status: ApiResponseStatus.UNAUTHORIZED,
      message: "Your session has expired. Please sign in again.",
      error: null,
    });
  }
  const result = await authService.refresh({ refreshToken });
  setAuthHeaders(res, result.data);

  const { userFullName, userEmail, tenantName } = result.data.user;

  res.status(200).json({
    status: ApiResponseStatus.SUCCESS,
    message: "Token refreshed",
    data: {
      user: {
        userFullName,
        userEmail,
        tenantName,
      },
      accessToken: result.data.accessToken,
      csrfToken: result.data.csrfToken,
    },
  });
};

export const logout = async (req: Request, res: Response) => {
  await authService.logout({ userId: req.user!.userId });
  clearAuthCookies(res);

  res.status(200).json({
    status: ApiResponseStatus.SUCCESS,
    message: "Logged out",
    data: null,
  });
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.requestPasswordReset({ email });

  res.status(200).json({
    status: ApiResponseStatus.SUCCESS,
    message: result.message,
    data: result.data,
  });
};

export const verifyPasswordResetOtp = async (req: Request, res: Response) => {
  const { email, code } = req.body;
  const result = await authService.verifyPasswordResetOtp({ email, code });

  res.status(200).json({
    status: ApiResponseStatus.SUCCESS,
    message: result.message,
    data: result.data,
  });
};

export const confirmPasswordReset = async (req: Request, res: Response) => {
  const { email, code, password } = req.body;
  const result = await authService.confirmPasswordReset({
    email,
    code,
    password,
  });

  res.status(200).json({
    status: ApiResponseStatus.SUCCESS,
    message: result.message,
    data: result.data,
  });
};
