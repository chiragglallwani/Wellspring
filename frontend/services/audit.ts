import { api } from "./api";

export type AuditLogQuery = {
  page?: number;
  limit?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
};

export type ApiAuditLogRow = {
  audit_id: string;
  name_email: string;
  action: string;
  target_entity: string;
  createdAt: string;
};

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

export type AuditLogsListPayload = {
  items: ApiAuditLogRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/** Actions recorded by the backend (exact match for `action` query param). */
export const AUDIT_ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "PROGRAM_CREATED", label: "Program created" },
  { value: "DELETE_PROGRAM", label: "Program deleted" },
  { value: "SESSION_CREATED", label: "Session created" },
  { value: "SESSION_REORDERED", label: "Sessions reordered" },
  { value: "SESSION_DELETED", label: "Session deleted" },
  { value: "BULK_SESSION_CREATED", label: "Bulk sessions created" },
  { value: "TENANT_CREATED", label: "Tenant created" },
  { value: "PASSWORD_RESETED", label: "Password reset" },
] as const;

export const auditApi = {
  list(params?: AuditLogQuery) {
    return api.get<ApiEnvelope<AuditLogsListPayload>>("/audit", { params });
  },
};
