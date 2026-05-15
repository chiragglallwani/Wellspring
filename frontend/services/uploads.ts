import { api } from "./api";

export type PresignUploadBody = {
  program_id: string;
  filename: string;
  contentType?: string;
  client_key?: string;
};

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

export type PresignUploadPayload = {
  presignedUploadUrl: string;
  key: string;
  expiresIn: number;
};

export const uploadsApi = {
  presign(body: PresignUploadBody) {
    return api.post<ApiEnvelope<PresignUploadPayload>>("/uploads/presign", body);
  },

  mediaPlaybackUrl(params: { program_id: string; filename: string }) {
    return api.get("/uploads/media-playback-url", { params });
  },

  bulkLinkFromCsv(programId: string, file: File) {
    const formData = new FormData();
    formData.append("program_id", programId);
    formData.append("file", file);
    return api.post("/uploads/bulk", formData);
  },
};
