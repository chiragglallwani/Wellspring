import { body, query } from "express-validator";

export const presignUploadValidator = [
  body("program_id").isUUID(),
  body("filename").isString().trim().notEmpty(),
  body("contentType").optional().isString().trim().notEmpty(),
];

export const mediaPlaybackUrlValidator = [
  query("program_id").isUUID(),
  query("filename").isString().trim().notEmpty(),
];

export const bulkMediaCsvValidator = [
  body("program_id").isUUID(),
];
