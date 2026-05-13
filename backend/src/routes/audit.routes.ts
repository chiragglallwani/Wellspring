import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller";
import { getAuditLogsValidator } from "../middlewares/validators/audit.validators";
import { validateRequest } from "../middlewares/validators/validate.middleware";

const router = Router();

router.get("/", getAuditLogsValidator, validateRequest, getAuditLogs);

export default router;
