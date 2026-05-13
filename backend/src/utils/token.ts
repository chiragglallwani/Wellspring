import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

const alphaNumeric =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export const generateAlphaNumericToken = (length: number) => {
  let token = "";

  for (let index = 0; index < length; index += 1) {
    token += alphaNumeric[crypto.randomInt(0, alphaNumeric.length)];
  }

  return token;
};

export const generateRefreshToken = () => crypto.randomBytes(48).toString("hex");

export const getJwtSecret = () =>
  process.env.JWT_SECRET || "local-development-jwt-secret";

export const getRefreshTokenSecret = () =>
  process.env.REFRESH_TOKEN_SECRET || "local-development-refresh-secret";

export const getPasswordResetSecret = () =>
  process.env.PASSWORD_RESET_SECRET || "local-development-reset-secret";

export const signJwt = (
  payload: Record<string, unknown>,
  expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m",
) =>
  jwt.sign(payload, getJwtSecret(), {
    expiresIn: expiresIn as NonNullable<SignOptions["expiresIn"]>,
  });

export const signRefreshJwt = (
  payload: Record<string, unknown>,
  expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d",
) =>
  jwt.sign(payload, getRefreshTokenSecret(), {
    expiresIn: expiresIn as NonNullable<SignOptions["expiresIn"]>,
  });

export const signPasswordResetJwt = (
  payload: Record<string, unknown>,
  expiresIn = process.env.PASSWORD_RESET_EXPIRES_IN || "15m",
) =>
  jwt.sign(payload, getPasswordResetSecret(), {
    expiresIn: expiresIn as NonNullable<SignOptions["expiresIn"]>,
  });
