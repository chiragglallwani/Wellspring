import { api } from "./api";

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

export type BulkUploadJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type BulkUploadRowFailure = {
  rowNumber: number;
  reason: string;
  client_key?: string;
  title?: string;
};

export type BulkUploadJobData = {
  job_id: string;
  program_id: string;
  status: BulkUploadJobStatus;
  total_rows: number;
  processed_count: number;
  failed_count: number;
  skipped_count: number;
  failures: BulkUploadRowFailure[];
  error_message: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const bulkUploadJobsApi = {
  checkExistingClientKeys(programId: string, clientKeys: string[]) {
    return api.post<ApiEnvelope<{ existing: string[] }>>(
      "/uploads/bulk-jobs/existing-client-keys",
      { program_id: programId, client_keys: clientKeys },
    );
  },

  start(programId: string, csvFile: File) {
    const formData = new FormData();
    formData.append("program_id", programId);
    formData.append("file", csvFile);
    return api.post<
      ApiEnvelope<{ job_id: string; status: BulkUploadJobStatus }>
    >("/uploads/bulk-jobs", formData);
  },

  getStatus(jobId: string) {
    return api.get<ApiEnvelope<BulkUploadJobData>>(
      `/uploads/bulk-jobs/${jobId}`,
    );
  },
};
