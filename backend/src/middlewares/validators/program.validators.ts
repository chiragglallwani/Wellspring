import { body, param, query } from "express-validator";

export const listProgramsValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createProgramValidator = [
  body("name").isString().trim().notEmpty(),
  body("description").isString().trim().notEmpty(),
  body("length").isInt({ min: 1 }).toInt(),
  body("isActive").optional().isBoolean().toBoolean(),
];

export const getProgramValidator = [
  param("programId").isUUID(),
];

export const updateProgramValidator = [
  param("programId").isUUID(),
  body("name").optional().isString().trim().notEmpty(),
  body("description").optional().isString().trim().notEmpty(),
  body("length").optional().isInt({ min: 1 }).toInt(),
  body("isActive").optional().isBoolean().toBoolean(),
];

export const deleteProgramValidator = [
  param("programId").isUUID(),
];
