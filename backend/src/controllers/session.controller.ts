import type { Request, Response } from "express";
import sessionService from "../services/modules/session.service";
import { getPagination } from "../utils/http";

const getSessionPayload = (req: Request) => {
  const {
    program_id,
    client_key,
    type,
    title,
    duration,
    ordered_position,
    instructor_name,
    tags,
    media_file_path,
  } = req.body;

  return {
    program_id,
    client_key,
    type,
    title,
    duration: Number(duration),
    ordered_position: Number(ordered_position),
    instructor_name,
    tags,
    media_file_path,
  };
};

export const createSession = async (req: Request, res: Response) => {
  const result = await sessionService.createSession(
    req.user!.tenantId,
    req.user!.userId,
    getSessionPayload(req),
  );

  res.status(201).json(result);
};

export const listSessions = async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req.query);
  const params = {
    tenantId: req.user!.tenantId,
    page,
    limit,
    offset,
    ...(req.query.programId ? { programId: req.query.programId as string } : {}),
  };
  const result = await sessionService.listSessions(params);

  res.status(200).json(result);
};

export const getSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await sessionService.getSession(
    req.user!.tenantId,
    sessionId as string,
  );

  res.status(200).json(result);
};

export const updateSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await sessionService.updateSession(
    req.user!.tenantId,
    req.user!.userId,
    sessionId as string,
    req.body,
  );

  res.status(200).json(result);
};

export const deleteSession = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const result = await sessionService.deleteSession(
    req.user!.tenantId,
    req.user!.userId,
    sessionId as string,
  );

  res.status(200).json(result);
};

export const reorderSessions = async (req: Request, res: Response) => {
  const { sessions } = req.body;
  const result = await sessionService.reorderSessions(
    req.user!.tenantId,
    req.user!.userId,
    sessions,
  );

  res.status(200).json(result);
};
