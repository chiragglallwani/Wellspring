import type { Request, Response } from "express";
import programService from "../services/modules/program.service";
import { getPagination } from "../utils/http";

const getProgramPayload = (req: Request) => {
  const { name, description, length, isActive } = req.body;

  return {
    name,
    description,
    length: Number(length),
    isActive,
  };
};

export const createProgram = async (req: Request, res: Response) => {
  const result = await programService.createProgram(
    req.user!.tenantId,
    req.user!.userId,
    getProgramPayload(req),
  );

  res.status(201).json(result);
};

export const listPrograms = async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req.query);
  const result = await programService.listPrograms({
    tenantId: req.user!.tenantId,
    page,
    limit,
    offset,
  });

  res.status(200).json(result);
};

export const getProgram = async (req: Request, res: Response) => {
  const { programId } = req.params;
  const program = await programService.getProgram(
    req.user!.tenantId,
    programId as string,
  );

  res.status(200).json(program);
};

export const updateProgram = async (req: Request, res: Response) => {
  const { programId } = req.params;
  const program = await programService.updateProgram(
    req.user!.tenantId,
    req.user!.userId,
    programId as string,
    req.body,
  );

  res.status(200).json(program);
};

export const deleteProgram = async (req: Request, res: Response) => {
  const { programId } = req.params;
  const result = await programService.deleteProgram(
    req.user!.tenantId,
    req.user!.userId,
    programId as string,
  );

  res.status(200).json(result);
};
