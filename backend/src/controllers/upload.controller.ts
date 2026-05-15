import type { Request, Response } from "express";
import { ApiResponseStatus } from "../constants/apiResponse";
import uploadService from "../services/modules/upload.service";
import bulkUploadJobService from "../services/modules/bulkUploadJob.service";

export const presignSessionUpload = async (req: Request, res: Response) => {
  const { program_id, filename, contentType, client_key } = req.body as {
    program_id: string;
    filename: string;
    contentType?: string;
    client_key?: string;
  };

  const result = await uploadService.getPresignedUploadForSession({
    programId: program_id,
    filename,
    ...(client_key?.trim() ? { clientKey: client_key.trim() } : {}),
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
  const result = await uploadService.bulkLinkSessionMediaFromCsvResponse(
    programId,
    file.buffer,
  );

  res.status(200).json(result);
};

export const checkBulkExistingClientKeys = async (
  req: Request,
  res: Response,
) => {
  const { program_id, client_keys } = req.body as {
    program_id: string;
    client_keys: string[];
  };

  const result = await uploadService.findExistingClientKeys(
    program_id,
    client_keys,
  );

  res.status(200).json(result);
};

export const startBulkUploadJob = async (req: Request, res: Response) => {
  const file = req.file;
  if (!file?.buffer) {
    return res.status(400).json({
      status: ApiResponseStatus.BAD_REQUEST,
      message: "CSV file is required (field name: file)",
      error: null,
    });
  }

  const programId = (req.body as { program_id: string }).program_id;
  const result = await bulkUploadJobService.createJob(
    programId,
    file.buffer,
    req.user!.userId,
  );

  res.status(202).json(result);
};

export const getBulkUploadJobStatus = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const result = await bulkUploadJobService.getJob(jobId as string);
  res.status(200).json(result);
};
