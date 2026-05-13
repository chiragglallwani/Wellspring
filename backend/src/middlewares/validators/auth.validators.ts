import { body } from "express-validator";

export const signupValidator = [
  body("name").isString().trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8 }),
];

export const loginValidator = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().notEmpty(),
  body("tenantId").optional().isString().trim().notEmpty(),
];

export const refreshValidator = [
  body("refreshToken").isString().trim().notEmpty(),
];

export const requestPasswordResetValidator = [
  body("email").isEmail().normalizeEmail(),
  body("tenantId").optional().isString().trim().notEmpty(),
];

export const confirmPasswordResetValidator = [
  body("resetToken").isString().trim().notEmpty(),
  body("password").isString().isLength({ min: 8 }),
];
