import { Router } from "express";
import {
  bulkLinkSessionMedia,
  checkBulkExistingClientKeys,
  getBulkUploadJobStatus,
  getSessionMediaPlaybackUrl,
  presignSessionUpload,
  startBulkUploadJob,
} from "../controllers/upload.controller";
import { csvUpload } from "../middlewares/uploadCsv.middleware";
import {
  bulkExistingClientKeysValidator,
  bulkMediaCsvValidator,
  bulkUploadJobStatusValidator,
  bulkUploadJobValidator,
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
router.post(
  "/bulk-jobs/existing-client-keys",
  bulkExistingClientKeysValidator,
  validateRequest,
  checkBulkExistingClientKeys,
);
router.post(
  "/bulk-jobs",
  csvUpload.single("file"),
  bulkUploadJobValidator,
  validateRequest,
  startBulkUploadJob,
);
router.get(
  "/bulk-jobs/:jobId",
  bulkUploadJobStatusValidator,
  validateRequest,
  getBulkUploadJobStatus,
);

export default router;
