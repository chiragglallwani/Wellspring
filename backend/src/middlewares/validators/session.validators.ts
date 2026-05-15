import { body, param, type ValidationChain } from "express-validator";

export const listSessionsValidator: ValidationChain[] = [];

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
  body("media_file_path").optional().isString().trim().notEmpty(),
  body("object_key").optional().isString().trim().notEmpty(),
  body().custom((_value, { req }) => {
    const objectKey =
      typeof req.body?.object_key === "string" ? req.body.object_key.trim() : "";
    const mediaPath =
      typeof req.body?.media_file_path === "string"
        ? req.body.media_file_path.trim()
        : "";
    if (!objectKey && !mediaPath) {
      throw new Error(
        "Provide object_key from the presign response (recommended) or media_file_path with the same S3 key",
      );
    }
    if (objectKey && mediaPath && objectKey !== mediaPath) {
      throw new Error(
        "object_key and media_file_path must match when both are sent",
      );
    }
    return true;
  }),
];

export const getSessionValidator = [param("sessionId").isUUID()];

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
  body("object_key").optional().isString().trim().notEmpty(),
  body().custom((_value, { req }) => {
    const objectKey =
      typeof req.body?.object_key === "string" ? req.body.object_key.trim() : "";
    const mediaPath =
      typeof req.body?.media_file_path === "string"
        ? req.body.media_file_path.trim()
        : "";
    if (objectKey && mediaPath && objectKey !== mediaPath) {
      throw new Error(
        "object_key and media_file_path must match when both are sent",
      );
    }
    return true;
  }),
];

export const deleteSessionValidator = [param("sessionId").isUUID()];

export const reorderSessionsValidator = [
  body("sessions").isArray({ min: 1 }),
  body("sessions.*.sessionId").isUUID(),
  body("sessions.*.orderedPosition").isInt({ min: 0 }).toInt(),
];
