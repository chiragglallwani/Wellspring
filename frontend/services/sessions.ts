import { isAxiosError } from "axios";
import { api } from "./api";

export function formatSessionsRequestError(error: unknown): string {
  if (isAxiosError(error)) {
    const body = error.response?.data;
    if (body && typeof body === "object" && "message" in body) {
      const m = (body as { message?: unknown }).message;
      if (typeof m === "string") return m;
      if (Array.isArray(m) && typeof m[0] === "string") return m[0];
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export type ApiSessionRow = {
  session_id: string;
  program_id: string;
  client_key: string;
  type: "audio" | "video";
  title: string;
  duration: number;
  ordered_position: number;
  instructor_name: string;
  tags?: string[];
  media_file_path?: string;
};

export type ProgramSessionsGroup = {
  program_id: string;
  name: string;
  description: string;
  sessionsLength: number;
  sessions: ApiSessionRow[];
};

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

export type SessionsListPayload = {
  programs: ProgramSessionsGroup[];
};

export type CreateSessionBody = {
  program_id: string;
  client_key: string;
  type: "audio" | "video";
  title: string;
  duration: number;
  ordered_position: number;
  instructor_name: string;
  tags?: string[];
  media_file_path: string;
};

export type ReorderSessionsBody = {
  sessions: { sessionId: string; orderedPosition: number }[];
};

export type UpdateSessionBody = {
  client_key?: string;
  type?: "audio" | "video";
  title?: string;
  duration?: number;
  instructor_name?: string;
  tags?: string[];
};

export const sessionsApi = {
  list() {
    return api.get<ApiEnvelope<SessionsListPayload>>("/sessions");
  },

  create(body: CreateSessionBody) {
    return api.post("/sessions", body);
  },

  reorder(body: ReorderSessionsBody) {
    return api.patch("/sessions/reorder", body);
  },

  get(sessionId: string) {
    return api.get(`/sessions/${sessionId}`);
  },

  update(sessionId: string, body: UpdateSessionBody) {
    return api.put(`/sessions/${sessionId}`, body);
  },

  remove(sessionId: string) {
    return api.delete(`/sessions/${sessionId}`);
  },
};
