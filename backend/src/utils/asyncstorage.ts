import { AsyncLocalStorage } from "async_hooks";
import type { NextFunction, Request, Response } from "express";

export const asyncLocalStorage = new AsyncLocalStorage();

export const asyncStorageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  asyncLocalStorage.run({}, () => {
    next();
  });
};

/**
 * Sets a value in the AsyncLocalStorage store.
 * @param {Object} data - Data to store (e.g., { tenantId: 'some-tenant-id' }).
 */
export const setAsyncStorage = (data: Record<string, unknown>) => {
  const store = asyncLocalStorage.getStore();
  if (store) {
    Object.assign(store, data);
  } else {
    throw new Error("AsyncLocalStorage store not initialized");
  }
};

/**
 * Retrieves a value from the AsyncLocalStorage store.
 * @returns {Record<string, unknown>|null} - The stored data or null if no context is available.
 */
export const getAsyncStorage = (): Record<string, unknown> => {
  return asyncLocalStorage.getStore() as Record<string, unknown>;
};

/**
 * Retrieves the tenantId from the AsyncLocalStorage store.
 * @returns {string} - The tenantId or throws an error if missing.
 */
export const getTenantId = (): string => {
  const store = getAsyncStorage();
  const tenantId = store?.tenantId as string;
  if (!tenantId) {
    throw new Error("Tenant ID is missing from the context");
  }
  return tenantId;
};
