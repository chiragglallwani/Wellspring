import { api } from "./api";

export type CreateProgramBody = {
  name: string;
  description: string;
  length: number;
  isActive?: boolean;
};

export type UpdateProgramBody = Partial<CreateProgramBody>;

/** Row shape returned from GET /programs/:id and list `items` (Sequelize JSON). */
export type ApiProgramRow = {
  program_id: string;
  name: string;
  description: string;
  length: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ApiEnvelope<T> = {
  status: string;
  message: string;
  data: T;
};

export type ProgramsListPayload = {
  items: ApiProgramRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const programsApi = {
  list(params?: { page?: number; limit?: number }) {
    return api.get<ApiEnvelope<ProgramsListPayload>>("/programs", { params });
  },

  create(body: CreateProgramBody) {
    return api.post<ApiEnvelope<unknown>>("/programs", body);
  },

  get(programId: string) {
    return api.get<ApiEnvelope<ApiProgramRow>>("/programs/" + programId);
  },

  update(programId: string, body: UpdateProgramBody) {
    return api.put<ApiEnvelope<ApiProgramRow>>(`/programs/${programId}`, body);
  },

  remove(programId: string) {
    return api.delete(`/programs/${programId}`);
  },
};
