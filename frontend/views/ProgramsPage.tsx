"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ProgramsDialog,
  type ProgramsSheetState,
} from "@/components/programs/ProgramsDialog";
import { getApiErrorMessage } from "@/lib/apiError";
import { Program } from "@/types/types";
import { ApiProgramRow, programsApi } from "@/services/programs";
import { toast } from "sonner";

function formatProgramDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function mapRowToProgram(row: ApiProgramRow): Program {
  return {
    id: row.program_id,
    title: row.name,
    category: "Program",
    status: row.isActive ? "LIVE" : "DRAFT",
    dateCreated: formatProgramDate(row.createdAt),
    sessionsCount: row.length,
  };
}

export function ProgramsPage() {
  const [sheet, setSheet] = useState<ProgramsSheetState>({ kind: "closed" });
  const [programs, setPrograms] = useState<Program[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24,
    total: 0,
    totalPages: 0,
  });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Program | null>(null);
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(
    null,
  );

  const loadPrograms = useCallback(async (page: number) => {
    setListError(null);
    setListLoading(true);
    try {
      const res = await programsApi.list({ page, limit: 10 });
      const payload = res.data.data;
      setPrograms(payload.items.map(mapRowToProgram));
      setPagination(payload.pagination);
      toast.success(res.data.message);
    } catch (error) {
      toast.error((error as Error).message);
      setListError((error as Error).message);
      setPrograms([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const onPageChange = useCallback(
    (page: number) => {
      setPagination({ ...pagination, page });
      void loadPrograms(page);
    },
    [pagination, loadPrograms],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void loadPrograms(1);
    });
  }, [loadPrograms]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;

    setDeletingProgramId(pendingDelete.id);
    try {
      await programsApi.remove(pendingDelete.id);
      toast.success("Program deleted");

      const isLastOnPage = programs.length === 1 && pagination.page > 1;
      const nextPage = isLastOnPage ? pagination.page - 1 : pagination.page;
      await loadPrograms(nextPage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to delete program."));
    } finally {
      setDeletingProgramId(null);
      setPendingDelete(null);
    }
  }, [pendingDelete, programs.length, pagination.page, loadPrograms]);

  const rangeLabel =
    pagination.total === 0
      ? "No programs"
      : `Showing 1–${programs.length} of ${pagination.total} programs`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight">
            Program Management
          </h2>
          <p className="text-muted-foreground mt-2 font-medium">
            Manage and curate clinical wellness journeys for your members.
          </p>
        </div>
        <div className="flex gap-3">
          <ProgramsDialog
            state={sheet}
            onStateChange={setSheet}
            onCompleted={loadPrograms}
          />
        </div>
      </div>

      {listError && (
        <p className="text-sm text-destructive font-medium">{listError}</p>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="w-[450px] px-8 py-5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Program Name
              </TableHead>
              <TableHead className="px-8 py-5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="px-8 py-5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Date Created
              </TableHead>
              <TableHead className="text-right px-8 py-5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listLoading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-8 py-12 text-center text-muted-foreground"
                >
                  Loading programs…
                </TableCell>
              </TableRow>
            ) : programs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="px-8 py-12 text-center text-muted-foreground"
                >
                  No programs yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              programs.map((program) => (
                <TableRow
                  key={program.id}
                  className="group hover:bg-primary/5 transition-colors border-b border-border/50 last:border-0"
                >
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div>
                        <span className="block font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          {program.title}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {program.category} • {program.sessionsCount} sessions
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <Badge
                      variant={
                        program.status === "LIVE" ? "secondary" : "outline"
                      }
                      className={
                        program.status === "LIVE"
                          ? "bg-accent text-accent-foreground font-bold"
                          : "text-muted-foreground font-bold"
                      }
                    >
                      {program.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-sm font-medium text-muted-foreground">
                    {program.dateCreated}
                  </TableCell>
                  <TableCell className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-primary"
                        onClick={() =>
                          setSheet({ kind: "edit", programId: program.id })
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                        disabled={deletingProgramId === program.id}
                        aria-label={`Delete ${program.title}`}
                        onClick={() => setPendingDelete(program)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="px-8 py-5 flex items-center justify-between bg-muted/10 border-t border-border">
          <span className="text-xs font-semibold text-muted-foreground">
            {rangeLabel}
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
              disabled={pagination.page >= pagination.totalPages || listLoading}
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete program?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `“${pendingDelete.title}” and all of its sessions will be permanently removed. This cannot be undone.`
                : "This program will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingProgramId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!!deletingProgramId}
              onClick={() => void handleConfirmDelete()}
            >
              {deletingProgramId ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
