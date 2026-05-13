import { Router } from "express";
import {
  confirmPasswordReset,
  login,
  refresh,
  requestPasswordReset,
  signup,
} from "../controllers/auth.controller";
import { csrfMiddleware } from "../middlewares/csrf.middleware";
import {
  confirmPasswordResetValidator,
  loginValidator,
  refreshValidator,
  requestPasswordResetValidator,
  signupValidator,
} from "../middlewares/validators/auth.validators";
import { validateRequest } from "../middlewares/validators/validate.middleware";

const router = Router();

router.post("/signup", signupValidator, validateRequest, signup);
router.post("/login", loginValidator, validateRequest, login);
router.post("/refresh", csrfMiddleware, refreshValidator, validateRequest, refresh);
router.post(
  "/password-reset/request",
  requestPasswordResetValidator,
  validateRequest,
  requestPasswordReset,
);
router.post(
  "/password-reset/confirm",
  confirmPasswordResetValidator,
  validateRequest,
  confirmPasswordReset,
);

export default router;
