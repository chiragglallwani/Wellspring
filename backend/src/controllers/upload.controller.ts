import type { Request, Response } from "express";
import { ApiResponseStatus } from "../constants/apiResponse";
import uploadService from "../services/modules/upload.service";

export const presignSessionUpload = async (req: Request, res: Response) => {
  const { program_id, filename, contentType } = req.body as {
    program_id: string;
    filename: string;
    contentType?: string;
  };

  const result = await uploadService.getPresignedUploadForSession({
    programId: program_id,
    filename,
    ...(contentType !== undefined && contentType !== ""
      ? { contentType }
      : {}),
  });

  res.status(200).json(result);
};

export const getSessionMediaPlaybackUrl = async (
  req: Request,
  res: Response,
) => {
  const programId = req.query.program_id as string;
  const filename = req.query.filename as string;

  const result = await uploadService.getSessionMediaPlaybackUrl({
    programId,
    filename,
  });

  res.status(200).json(result);
};

export const bulkLinkSessionMedia = async (req: Request, res: Response) => {
  const file = req.file;
  if (!file?.buffer) {
    return res.status(400).json({
      status: ApiResponseStatus.BAD_REQUEST,
      message: "CSV file is required (field name: file)",
      error: null,
    });
  }

  const programId = (req.body as { program_id: string }).program_id;
  const result = await uploadService.bulkLinkSessionMediaFromCsv(
    programId,
    file.buffer,
  );

  res.status(200).json(result);
};
