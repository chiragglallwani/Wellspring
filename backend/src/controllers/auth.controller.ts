import type { Request, Response } from "express";
import { ApiResponseStatus } from "../constants/apiResponse";
import authService from "../services/modules/auth.service";

const setAuthHeaders = (
  res: Response,
  tokens: {
    accessToken: string;
    csrfToken: string;
  },
) => {
  res.setHeader("Authorization", `Bearer ${tokens.accessToken}`);
  res.setHeader("csrf_token", tokens.csrfToken);
  res.cookie("csrf_token", tokens.csrfToken, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "local",
  });
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
  const { email, password, tenantId } = req.body;
  const result = await authService.login({ email, password, tenantId });
  setAuthHeaders(res, result.data);

  res.status(200).json({
    status: ApiResponseStatus.SUCCESS,
    message: "Login successful",
  });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh({ refreshToken });
  setAuthHeaders(res, result.data);

  res.status(200).json({
    status: ApiResponseStatus.SUCCESS,
    message: "Token refreshed",
  });
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email, tenantId } = req.body;
  const result = await authService.requestPasswordReset({ email, tenantId });

  res.status(200).json({
    status: ApiResponseStatus.SUCCESS,
    message: "Password reset requested",
    data: result,
  });
};

export const confirmPasswordReset = async (req: Request, res: Response) => {
  const { resetToken, password } = req.body;
  const result = await authService.confirmPasswordReset({
    resetToken,
    password,
  });

  res.status(200).json({
    status: ApiResponseStatus.SUCCESS,
    message: "Password reset successful",
    data: result,
  });
};
