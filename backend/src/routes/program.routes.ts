import { Router } from "express";
import {
  createProgram,
  deleteProgram,
  getProgram,
  listPrograms,
  updateProgram,
} from "../controllers/program.controller";
import {
  createProgramValidator,
  deleteProgramValidator,
  getProgramValidator,
  listProgramsValidator,
  updateProgramValidator,
} from "../middlewares/validators/program.validators";
import { validateRequest } from "../middlewares/validators/validate.middleware";

const router = Router();

router.get("/", listProgramsValidator, validateRequest, listPrograms);
router.post("/", createProgramValidator, validateRequest, createProgram);
router.get("/:programId", getProgramValidator, validateRequest, getProgram);
router.put("/:programId", updateProgramValidator, validateRequest, updateProgram);
router.delete(
  "/:programId",
  deleteProgramValidator,
  validateRequest,
  deleteProgram,
);

export default router;
