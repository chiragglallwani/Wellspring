import { Router } from "express";
import {
  bulkLinkSessionMedia,
  getSessionMediaPlaybackUrl,
  presignSessionUpload,
} from "../controllers/upload.controller";
import { csvUpload } from "../middlewares/uploadCsv.middleware";
import {
  bulkMediaCsvValidator,
  mediaPlaybackUrlValidator,
  presignUploadValidator,
} from "../middlewares/validators/upload.validators";
import { validateRequest } from "../middlewares/validators/validate.middleware";

const router = Router();

router.post(
  "/presign",
  presignUploadValidator,
  validateRequest,
  presignSessionUpload,
);
router.get(
  "/media-playback-url",
  mediaPlaybackUrlValidator,
  validateRequest,
  getSessionMediaPlaybackUrl,
);
router.post(
  "/bulk",
  csvUpload.single("file"),
  bulkMediaCsvValidator,
  validateRequest,
  bulkLinkSessionMedia,
);

export default router;
