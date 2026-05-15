import { body } from "express-validator";

export const signupValidator = [
  body("name").isString().trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/)
    .withMessage(
      "Password must contain at least one letter, one number, and one special character",
    ),
];

export const loginValidator = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().notEmpty(),
];

export const requestPasswordResetValidator = [
  body("email").isEmail().normalizeEmail(),
  body("tenantId").optional().isString().trim().notEmpty(),
];

export const confirmPasswordResetValidator = [
  body("resetToken").isString().trim().notEmpty(),
  body("password").isString().isLength({ min: 8 }),
];
