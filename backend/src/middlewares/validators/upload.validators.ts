import { body, param, query } from "express-validator";

export const presignUploadValidator = [
  body("program_id").isUUID(),
  body("filename").isString().trim().notEmpty(),
  body("client_key").optional().isString().trim().notEmpty().isLength({ max: 255 }),
  body("contentType").optional().isString().trim().notEmpty(),
];

export const mediaPlaybackUrlValidator = [
  query("program_id").isUUID(),
  query("filename").isString().trim().notEmpty(),
];

export const bulkMediaCsvValidator = [
  body("program_id").isUUID(),
];

export const bulkUploadJobValidator = [body("program_id").isUUID()];

export const bulkUploadJobStatusValidator = [
  param("jobId").isUUID(),
];

export const bulkExistingClientKeysValidator = [
  body("program_id").isUUID(),
  body("client_keys").isArray({ min: 0, max: 500 }),
  body("client_keys.*").isString().trim().notEmpty().isLength({ max: 255 }),
];
