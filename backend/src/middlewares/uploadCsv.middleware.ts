import multer from "multer";
import { HttpError } from "../utils/http";

const storage = multer.memoryStorage();

export const csvUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const mimeOk =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/csv" ||
      file.mimetype === "application/vnd.ms-excel";
    if (mimeOk || name.endsWith(".csv")) {
      cb(null, true);
      return;
    }
    cb(new HttpError(400, "Only CSV uploads are allowed"));
  },
});
