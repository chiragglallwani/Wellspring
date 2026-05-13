import type { Request, Response } from "express";
import { ApiResponseStatusToCodesMap } from "../constants/apiResponse";
import auditService from "../services/modules/audit.service";
import { getPagination } from "../utils/http";

export const getAuditLogs = async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req.query);
  const filters = {
    tenantId: req.user!.tenantId,
    page,
    limit,
    offset,
    ...(req.query.action ? { action: req.query.action as string } : {}),
    ...(req.query.startDate
      ? { startDate: req.query.startDate as string }
      : {}),
    ...(req.query.endDate ? { endDate: req.query.endDate as string } : {}),
  };
  const result = await auditService.getAuditLogs(filters);

  res.status(ApiResponseStatusToCodesMap[result.status] ?? 200).json(result);
};
