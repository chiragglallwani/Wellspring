"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  auditApi,
  AUDIT_ACTION_OPTIONS,
  type ApiAuditLogRow,
} from "@/services/audit";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";

type AppliedFilters = {
  action: string;
  startDate: string;
  endDate: string;
};

const EMPTY_FILTERS: AppliedFilters = {
  action: "",
  startDate: "",
  endDate: "",
};

function formatAuditTimestamp(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatActionLabel(action: string): string {
  const known = AUDIT_ACTION_OPTIONS.find((o) => o.value === action);
  if (known && known.value) return known.label;
  return action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatTargetEntity(entity: string): string {
  return entity.replace(/Model$/, "").replace(/([A-Z])/g, " $1").trim();
}

const NAME_EMAIL_SEP = " · ";

function parseNameEmail(nameEmail: string): { name: string; email: string } {
  if (nameEmail.includes(NAME_EMAIL_SEP)) {
    const [name, email] = nameEmail.split(NAME_EMAIL_SEP);
    return { name: name?.trim() ?? nameEmail, email: email?.trim() ?? "" };
  }
  return { name: nameEmail, email: "" };
}

function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function toIsoStartOfDay(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toIsoEndOfDay(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<ApiAuditLogRow[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<AppliedFilters>(EMPTY_FILTERS);

  const loadAuditLogs = useCallback(
    async (page: number, limit: number, filters: AppliedFilters) => {
      setListError(null);
      setListLoading(true);
      try {
        const params: Parameters<typeof auditApi.list>[0] = { page, limit };
        if (filters.action) params.action = filters.action;
        if (filters.startDate) {
          params.startDate = toIsoStartOfDay(filters.startDate);
        }
        if (filters.endDate) {
          params.endDate = toIsoEndOfDay(filters.endDate);
        }

        const res = await auditApi.list(params);
        const payload = res.data.data;
        setLogs(payload.items);
        setPagination(payload.pagination);
      } catch (error) {
        const message = getApiErrorMessage(error, "Unable to load audit logs.");
        setListError(message);
        setLogs([]);
        toast.error(message);
      } finally {
        setListLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void loadAuditLogs(pagination.page, pagination.limit, appliedFilters);
    });
  }, [loadAuditLogs, pagination.page, pagination.limit, appliedFilters]);

  const onPageChange = (nextPage: number) => {
    setPagination((prev) => ({ ...prev, page: nextPage }));
  };

  const onLimitChange = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...draftFilters });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters =
    !!appliedFilters.action ||
    !!appliedFilters.startDate ||
    !!appliedFilters.endDate;

  const rangeStart =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight">
            Activity Audit Log
          </h2>
          <p className="text-muted-foreground mt-2 font-medium">
            Tenant activity recorded for programs, sessions, and administration.
          </p>
        </div>
      </div>

      {/* Filters (API-supported query params only) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          Filters
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label
              htmlFor="audit-action"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Action
            </Label>
            <select
              id="audit-action"
              value={draftFilters.action}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, action: e.target.value }))
              }
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {AUDIT_ACTION_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="audit-start-date"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Start date
            </Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="audit-start-date"
                type="date"
                value={draftFilters.startDate}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="audit-end-date"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              End date
            </Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="audit-end-date"
                type="date"
                value={draftFilters.endDate}
                min={draftFilters.startDate || undefined}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="audit-limit"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Page size
            </Label>
            <select
              id="audit-limit"
              value={pagination.limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="h-10 font-bold"
            onClick={applyFilters}
            disabled={listLoading}
          >
            Apply filters
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 font-bold"
            onClick={clearFilters}
            disabled={listLoading || !hasActiveFilters}
          >
            Clear filters
          </Button>
          {hasActiveFilters && (
            <Badge variant="secondary" className="font-bold">
              Filters active
            </Badge>
          )}
        </div>
      </div>

      {listError && (
        <p className="text-sm font-medium text-destructive">{listError}</p>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-b border-border">
              <TableHead className="px-8 py-5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Timestamp
              </TableHead>
              <TableHead className="px-8 py-5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Actor
              </TableHead>
              <TableHead className="px-8 py-5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Action
              </TableHead>
              <TableHead className="px-8 py-5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Target
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listLoading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-8 py-16 text-center text-muted-foreground"
                >
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                  Loading audit logs…
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-8 py-12 text-center text-muted-foreground"
                >
                  {hasActiveFilters
                    ? "No events match your filters."
                    : "No audit events recorded yet."}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((event) => (
                <TableRow
                  key={event.audit_id}
                  className="hover:bg-primary/5 transition-colors border-b border-border/50 last:border-0"
                >
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                        {formatAuditTimestamp(event.createdAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    {(() => {
                      const { name, email } = parseNameEmail(event.name_email);
                      return (
                        <div className="flex items-center gap-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-accent text-xs font-bold text-accent-foreground">
                            {initialsFromName(name)}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-bold text-foreground truncate">
                              {name}
                            </span>
                            {email ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {email}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-2 py-0.5 border-primary/20 text-primary font-bold uppercase tracking-wide bg-primary/5"
                    >
                      {formatActionLabel(event.action)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatTargetEntity(event.target_entity)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="px-8 py-5 flex items-center justify-between bg-muted/10 border-t border-border">
          <span className="text-xs font-semibold text-muted-foreground">
            {pagination.total === 0
              ? "No events"
              : `Showing ${rangeStart}–${rangeEnd} of ${pagination.total} events`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="w-9 h-9 border-border"
              disabled={pagination.page <= 1 || listLoading}
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-semibold tabular-nums px-2">
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="w-9 h-9 border-border"
              disabled={
                pagination.page >= pagination.totalPages || listLoading
              }
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
