import { Router } from "express";
import auditRoutes from "./audit.routes";
import authRoutes from "./auth.routes";
import programRoutes from "./program.routes";
import sessionRoutes from "./session.routes";
import { authMiddleware } from "../middlewares/auth.middleware";
import { csrfMiddleware } from "../middlewares/csrf.middleware";

const router = Router();
const protectedMiddlewares = [authMiddleware, csrfMiddleware];

router.use("/auth", authRoutes);
router.use("/programs", protectedMiddlewares, programRoutes);
router.use("/sessions", protectedMiddlewares, sessionRoutes);
router.use("/audit", protectedMiddlewares, auditRoutes);

export default router;
