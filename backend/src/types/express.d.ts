import type { JwtUserPayload } from "../middlewares/auth.middleware";

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
