import { Router } from "express";
import {
  createSession,
  deleteSession,
  getSession,
  listSessions,
  reorderSessions,
  updateSession,
} from "../controllers/session.controller";
import {
  createSessionValidator,
  deleteSessionValidator,
  getSessionValidator,
  listSessionsValidator,
  reorderSessionsValidator,
  updateSessionValidator,
} from "../middlewares/validators/session.validators";
import { validateRequest } from "../middlewares/validators/validate.middleware";

const router = Router();

router.get("/", listSessionsValidator, validateRequest, listSessions);
router.post("/", createSessionValidator, validateRequest, createSession);
router.patch("/reorder", reorderSessionsValidator, validateRequest, reorderSessions);
router.get("/:sessionId", getSessionValidator, validateRequest, getSession);
router.put("/:sessionId", updateSessionValidator, validateRequest, updateSession);
router.delete(
  "/:sessionId",
  deleteSessionValidator,
  validateRequest,
  deleteSession,
);

export default router;
