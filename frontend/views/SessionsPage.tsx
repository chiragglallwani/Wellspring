"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Reorder } from "motion/react";
import {
  GripHorizontal,
  Trash2,
  Clock,
  Eye,
  Plus,
  Film,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";
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
  SessionSheet,
  type SessionSheetState,
} from "@/components/sessions/SessionSheet";
import {
  formatSessionsRequestError,
  sessionsApi,
  type ApiSessionRow,
  type ProgramSessionsGroup,
} from "@/services/sessions";

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function totalDurationSeconds(programs: ProgramSessionsGroup[]): number {
  return programs.reduce(
    (sum, program) =>
      sum +
      program.sessions.reduce(
        (sessionSum, session) => sessionSum + session.duration,
        0,
      ),
    0,
  );
}

type ProgramSessionsReorderListProps = {
  programId: string;
  programName: string;
  sessions: ApiSessionRow[];
  onSessionsChange: (programId: string, sessions: ApiSessionRow[]) => void;
  onEdit: (programId: string, programName: string, session: ApiSessionRow) => void;
  onDeleteRequest: (programId: string, session: ApiSessionRow) => void;
  reorderingDisabled?: boolean;
  deletingSessionId?: string | null;
};

function ProgramSessionsReorderList({
  programId,
  programName,
  sessions,
  onSessionsChange,
  onEdit,
  onDeleteRequest,
  reorderingDisabled,
  deletingSessionId,
}: ProgramSessionsReorderListProps) {
  const handleReorder = async (next: ApiSessionRow[]) => {
    const previous = sessions;
    const withPositions = next.map((session, index) => ({
      ...session,
      ordered_position: index,
    }));

    onSessionsChange(programId, withPositions);

    try {
      await sessionsApi.reorder({
        sessions: withPositions.map((session, index) => ({
          sessionId: session.session_id,
          orderedPosition: index,
        })),
      });
    } catch (error) {
      onSessionsChange(programId, previous);
      toast.error(formatSessionsRequestError(error));
    }
  };

  if (sessions.length === 0) {
    return (
      <p className="py-6 text-center text-sm font-medium text-muted-foreground">
        No sessions in this program yet.
      </p>
    );
  }

  return (
    <Reorder.Group
      axis="y"
      values={sessions}
      onReorder={handleReorder}
      className="space-y-3"
    >
      {sessions.map((session, index) => (
        <Reorder.Item
          key={session.session_id}
          value={session}
          className="group outline-none"
          drag={!reorderingDisabled && !deletingSessionId}
        >
          <div className="flex items-center gap-6 rounded-2xl border border-border bg-background p-4 shadow-sm transition-all hover:border-primary/40 active:scale-[0.99] active:shadow-lg active:shadow-primary/5">
            <div className="cursor-grab p-2 text-muted-foreground active:cursor-grabbing group-hover:text-primary">
              <GripHorizontal className="h-5 w-5" />
            </div>

            <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted">
              <Film className="h-7 w-7 text-muted-foreground" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                {String(index + 1).padStart(2, "0")}. {session.title}
              </h3>
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                {session.instructor_name} · {session.type}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full border-border bg-muted/50 px-3 py-1 font-bold text-primary"
              >
                <Clock className="h-3 w-3" />
                {formatDuration(session.duration)}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:bg-primary/5 hover:text-primary"
                disabled={reorderingDisabled || !!deletingSessionId}
                aria-label={`Edit ${session.title}`}
                onClick={() => onEdit(programId, programName, session)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                disabled={reorderingDisabled || deletingSessionId === session.session_id}
                aria-label={`Delete ${session.title}`}
                onClick={() => onDeleteRequest(programId, session)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}

export default function SessionsPage() {
  const [programs, setPrograms] = useState<ProgramSessionsGroup[]>([]);
  const [openPanels, setOpenPanels] = useState<string[]>([]);
  const [sheet, setSheet] = useState<SessionSheetState>({ kind: "closed" });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    programId: string;
    session: ApiSessionRow;
  } | null>(null);

  const loadSessions = useCallback(async () => {
    setListError(null);
    setLoading(true);
    try {
      const res = await sessionsApi.list();
      const nextPrograms = res.data.data.programs;
      setPrograms(nextPrograms);
      setOpenPanels((current) =>
        current.length > 0
          ? current
          : nextPrograms[0]
            ? [nextPrograms[0].program_id]
            : [],
      );
    } catch (error) {
      setListError(formatSessionsRequestError(error));
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadSessions();
    });
  }, [loadSessions]);

  const handleSessionsChange = useCallback(
    (programId: string, sessions: ApiSessionRow[]) => {
      setPrograms((prev) =>
        prev.map((program) =>
          program.program_id === programId
            ? {
                ...program,
                sessions,
                sessionsLength: sessions.length,
              }
            : program,
        ),
      );
    },
    [],
  );

  const handleEditSession = useCallback(
    (programId: string, programName: string, session: ApiSessionRow) => {
      setSheet({
        kind: "edit",
        programId,
        programName,
        session,
      });
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;

    const { programId, session } = pendingDelete;
    setDeletingSessionId(session.session_id);

    try {
      await sessionsApi.remove(session.session_id);
      setPrograms((prev) =>
        prev.map((program) => {
          if (program.program_id !== programId) return program;
          const nextSessions = program.sessions
            .filter((s) => s.session_id !== session.session_id)
            .map((s, index) => ({ ...s, ordered_position: index }));
          return {
            ...program,
            sessions: nextSessions,
            sessionsLength: nextSessions.length,
          };
        }),
      );
      toast.success("Session deleted");
    } catch (error) {
      toast.error(formatSessionsRequestError(error));
    } finally {
      setDeletingSessionId(null);
      setPendingDelete(null);
    }
  }, [pendingDelete]);

  const totalSessions = useMemo(
    () =>
      programs.reduce((count, program) => count + program.sessions.length, 0),
    [programs],
  );

  const totalDurationLabel = useMemo(
    () => formatDuration(totalDurationSeconds(programs)),
    [programs],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Session Organizer
          </h2>
          <p className="mt-2 max-w-lg font-medium text-muted-foreground">
            Expand a program to view and drag sessions into the order patients
            should experience them. Changes save automatically when you reorder.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 border-primary px-6 font-bold text-primary hover:bg-primary/5"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview Program
          </Button>
        </div>
      </div>

      {listError && (
        <p className="text-sm font-medium text-destructive">{listError}</p>
      )}

      {loading ? (
        <p className="py-12 text-center text-muted-foreground">
          Loading sessions…
        </p>
      ) : programs.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No programs yet. Create a program first, then add sessions.
        </p>
      ) : (
        <Accordion
          multiple
          value={openPanels}
          onValueChange={setOpenPanels}
          className="gap-3"
        >
          {programs.map((program) => (
            <AccordionItem key={program.program_id} value={program.program_id}>
              <AccordionHeader>
                <AccordionTrigger className="w-full">
                  <div className="flex min-w-0 flex-1 flex-col gap-1 pr-4 text-left">
                    <span className="text-lg font-bold text-foreground">
                      {program.name}
                    </span>
                    <span className="line-clamp-2 text-sm font-medium text-muted-foreground">
                      {program.description}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">
                      {program.sessionsLength} session
                      {program.sessionsLength === 1 ? "" : "s"}
                    </span>
                  </div>
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionPanel>
                <div className="my-4 flex items-center justify-between gap-4">
                  <p className="text-lg font-bold text-secondary">Sessions</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-2 border-primary font-bold text-primary hover:bg-primary/5"
                    onClick={() =>
                      setSheet({
                        kind: "create",
                        programId: program.program_id,
                        programName: program.name,
                        orderedPosition: program.sessions.length,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add session
                  </Button>
                </div>
                <ProgramSessionsReorderList
                  programId={program.program_id}
                  programName={program.name}
                  sessions={program.sessions}
                  onSessionsChange={handleSessionsChange}
                  onEdit={handleEditSession}
                  onDeleteRequest={(programId, session) =>
                    setPendingDelete({ programId, session })
                  }
                  reorderingDisabled={loading}
                  deletingSessionId={deletingSessionId}
                />
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <div className="flex items-center justify-between rounded-3xl border border-border/50 bg-muted/40 p-8 shadow-inner">
        <div className="flex gap-12">
          <div className="space-y-1">
            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Total Sessions
            </span>
            <span className="text-2xl font-bold text-primary">
              {totalSessions.toString().padStart(2, "0")}
            </span>
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Duration
            </span>
            <span className="text-2xl font-bold text-primary">
              {totalDurationLabel}
            </span>
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
              Programs
            </span>
            <span className="text-2xl font-bold text-primary">
              {programs.length.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      <SessionSheet
        state={sheet}
        onStateChange={setSheet}
        onCompleted={loadSessions}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `“${pendingDelete.session.title}” will be removed. Remaining sessions will be renumbered automatically.`
                : "This session will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingSessionId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!!deletingSessionId}
              onClick={() => void handleConfirmDelete()}
            >
              {deletingSessionId ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
