import { query } from "express-validator";

export const getAuditLogsValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("action").optional().isString().trim().notEmpty(),
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
];
