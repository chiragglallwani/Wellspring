import { body, param, query } from "express-validator";

export const listSessionsValidator = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("programId").optional().isUUID(),
];

export const createSessionValidator = [
  body("program_id").isUUID(),
  body("client_key").isString().trim().notEmpty(),
  body("type").isIn(["audio", "video"]),
  body("title").isString().trim().notEmpty(),
  body("duration").isInt({ min: 1 }).toInt(),
  body("ordered_position").isInt({ min: 0 }).toInt(),
  body("instructor_name").isString().trim().notEmpty(),
  body("tags").optional().isArray(),
  body("tags.*").optional().isString().trim().notEmpty(),
  body("media_file_path").isString().trim().notEmpty(),
];

export const getSessionValidator = [
  param("sessionId").isUUID(),
];

export const updateSessionValidator = [
  param("sessionId").isUUID(),
  body("program_id").optional().isUUID(),
  body("client_key").optional().isString().trim().notEmpty(),
  body("type").optional().isIn(["audio", "video"]),
  body("title").optional().isString().trim().notEmpty(),
  body("duration").optional().isInt({ min: 1 }).toInt(),
  body("ordered_position").optional().isInt({ min: 0 }).toInt(),
  body("instructor_name").optional().isString().trim().notEmpty(),
  body("tags").optional().isArray(),
  body("tags.*").optional().isString().trim().notEmpty(),
  body("media_file_path").optional().isString().trim().notEmpty(),
];

export const deleteSessionValidator = [
  param("sessionId").isUUID(),
];

export const reorderSessionsValidator = [
  body("sessions").isArray({ min: 1 }),
  body("sessions.*.sessionId").isUUID(),
  body("sessions.*.orderedPosition").isInt({ min: 0 }).toInt(),
];
