"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { parseCsv, validateBulkCsvHeaders } from "@/lib/csv";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { programsApi, type ApiProgramRow } from "@/services/programs";
import {
  bulkUploadJobsApi,
  type BulkUploadJobData,
  type BulkUploadRowFailure,
} from "@/services/bulkUploadJobs";
import { uploadsApi } from "@/services/uploads";

type MediaUploadRow = {
  id: string;
  file: File;
  clientKey: string;
  status: "pending" | "uploading" | "done" | "skipped" | "error";
  error?: string;
};

type Step = 1 | 2 | 3;

const POLL_MS = 2000;

function defaultClientKey(file: File): string {
  return file.name.replace(/\.[^/.]+$/, "") || file.name;
}

export type BulkUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

export function BulkUploadDialog({
  open,
  onOpenChange,
  onCompleted,
}: BulkUploadDialogProps) {
  const [step, setStep] = useState<Step>(1);
  const [programs, setPrograms] = useState<ApiProgramRow[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programId, setProgramId] = useState("");
  const [mediaRows, setMediaRows] = useState<MediaUploadRow[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewCount, setCsvPreviewCount] = useState(0);
  const [job, setJob] = useState<BulkUploadJobData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setStep(1);
    setProgramId("");
    setMediaRows([]);
    setMediaUploading(false);
    setCsvFile(null);
    setCsvPreviewCount(0);
    setJob(null);
    setSubmitting(false);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
    if (csvInputRef.current) csvInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    let cancelled = false;
    setProgramsLoading(true);
    programsApi
      .list({ page: 1, limit: 100 })
      .then((res) => {
        if (!cancelled) setPrograms(res.data.data.items);
      })
      .catch((err) => {
        if (!cancelled) toast.error(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setProgramsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const uploadedCount = mediaRows.filter((r) => r.status === "done").length;
  const skippedMediaCount = mediaRows.filter(
    (r) => r.status === "skipped",
  ).length;
  const canAdvanceFromStep1 =
    programId.length > 0 &&
    mediaRows.length > 0 &&
    mediaRows.every(
      (r) =>
        r.status === "done" || r.status === "skipped" || r.status === "error",
    ) &&
    mediaRows.some((r) => r.status === "done" || r.status === "skipped") &&
    !mediaUploading;

  const clearCsvSelection = useCallback(() => {
    setCsvFile(null);
    setCsvPreviewCount(0);
    if (csvInputRef.current) csvInputRef.current.value = "";
  }, []);

  const uploadMediaRows = useCallback(
    async (targetProgramId: string, rows: MediaUploadRow[]) => {
      if (!targetProgramId || rows.length === 0) return;

      setMediaUploading(true);

      let existingKeys = new Set<string>();
      try {
        const checkRes = await bulkUploadJobsApi.checkExistingClientKeys(
          targetProgramId,
          rows.map((r) => r.clientKey.trim()),
        );
        existingKeys = new Set(checkRes.data.data.existing);
      } catch (error) {
        setMediaUploading(false);
        toast.error(getApiErrorMessage(error));
        return;
      }

      for (const row of rows) {
        const clientKey = row.clientKey.trim();
        if (existingKeys.has(clientKey)) {
          setMediaRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? { ...r, status: "skipped", error: undefined }
                : r,
            ),
          );
          continue;
        }

        setMediaRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, status: "uploading" } : r,
          ),
        );

        try {
          const presignRes = await uploadsApi.presign({
            program_id: targetProgramId,
            filename: row.file.name,
            client_key: clientKey,
            contentType: row.file.type || undefined,
          });
          const { presignedUploadUrl, key } = presignRes.data.data;

          const uploadRes = await fetch(presignedUploadUrl, {
            method: "PUT",
            body: row.file,
            headers: row.file.type ? { "Content-Type": row.file.type } : {},
          });

          if (!uploadRes.ok) {
            throw new Error("Failed to upload file to storage");
          }

          setMediaRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? { ...r, status: "done", error: undefined }
                : r,
            ),
          );
        } catch (error) {
          setMediaRows((prev) =>
            prev.map((r) =>
              r.id === row.id
                ? {
                    ...r,
                    status: "error",
                    error: getApiErrorMessage(error, "Upload failed"),
                  }
                : r,
            ),
          );
        }
      }

      setMediaUploading(false);

      const skipped = rows.filter((r) =>
        existingKeys.has(r.clientKey.trim()),
      ).length;
      if (skipped > 0) {
        toast.info(
          `${skipped} file${skipped === 1 ? "" : "s"} skipped — session already exists for this program`,
        );
      }
    },
    [],
  );

  const handleProgramChange = (nextProgramId: string) => {
    if (nextProgramId === programId) return;

    if (!nextProgramId) {
      setProgramId("");
      if (mediaRows.length > 0) {
        setMediaRows([]);
        if (mediaInputRef.current) mediaInputRef.current.value = "";
        clearCsvSelection();
        if (step > 1) setStep(1);
        toast.info("Media cleared. Select a program to continue.");
      }
      return;
    }

    const hadMedia = mediaRows.length > 0;
    setProgramId(nextProgramId);

    if (!hadMedia) return;

    if (step > 1) {
      setStep(1);
      clearCsvSelection();
    }

    const rowsToReupload: MediaUploadRow[] = mediaRows.map((r) => ({
      ...r,
      status: "pending",
      error: undefined,
    }));
    setMediaRows(rowsToReupload);
    toast.info("Program changed. Re-uploading media for the new program.");
    void uploadMediaRows(nextProgramId, rowsToReupload);
  };

  const handleMediaFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!programId) {
      toast.error("Select a program before uploading media.");
      return;
    }

    const newRows: MediaUploadRow[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      clientKey: defaultClientKey(file),
      status: "pending",
    }));

    setMediaRows((prev) => [...prev, ...newRows]);
    await uploadMediaRows(programId, newRows);
  };

  const handleCsvChange = async (file: File | null) => {
    setCsvFile(file);
    setCsvPreviewCount(0);
    if (!file) return;

    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      const headerError = validateBulkCsvHeaders(headers);
      if (headerError) {
        toast.error(headerError);
        setCsvFile(null);
        if (csvInputRef.current) csvInputRef.current.value = "";
        return;
      }
      setCsvPreviewCount(rows.length);
    } catch {
      toast.error("Could not read CSV file.");
      setCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
    }
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollJob = useCallback(
    (jobId: string) => {
      stopPolling();
      const tick = async () => {
        try {
          const res = await bulkUploadJobsApi.getStatus(jobId);
          const data = res.data.data;
          setJob(data);
          if (data.status === "completed" || data.status === "failed") {
            stopPolling();
            setSubmitting(false);
            if (data.status === "completed") {
              onCompleted?.();
            }
          }
        } catch (error) {
          stopPolling();
          setSubmitting(false);
          toast.error(getApiErrorMessage(error));
        }
      };
      void tick();
      pollRef.current = setInterval(() => void tick(), POLL_MS);
    },
    [onCompleted],
  );

  const startJob = async () => {
    if (!programId || !csvFile) return;

    setSubmitting(true);
    setStep(3);

    try {
      const startRes = await bulkUploadJobsApi.start(programId, csvFile);
      const { job_id } = startRes.data.data;

      setJob({
        job_id,
        program_id: programId,
        status: "pending",
        total_rows: 0,
        processed_count: 0,
        failed_count: 0,
        skipped_count: 0,
        failures: [],
        error_message: null,
      });

      pollJob(job_id);
    } catch (error) {
      setSubmitting(false);
      setStep(2);
      toast.error(getApiErrorMessage(error));
    }
  };

  const rowsHandled = job
    ? job.processed_count + job.failed_count + (job.skipped_count ?? 0)
    : 0;
  const progressPercent =
    job && job.total_rows > 0
      ? Math.round((rowsHandled / job.total_rows) * 100)
      : job?.status === "completed"
        ? 100
        : 0;

  const jobFinished = job?.status === "completed" || job?.status === "failed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[60%] max-w-[min(72rem,calc(100%-2rem))] sm:max-w-[min(72rem,calc(100%-2rem))] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk upload sessions</DialogTitle>
          <DialogDescription>
            Step {step} of 3 — upload media, attach CSV metadata, then import in
            the background.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bulk-program">Program</Label>
                <select
                  id="bulk-program"
                  value={programId}
                  disabled={programsLoading || mediaUploading}
                  onChange={(e) => handleProgramChange(e.target.value)}
                  className={cn(
                    "flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
                  )}
                >
                  <option value="">Select a program…</option>
                  {programs.map((p) => (
                    <option key={p.program_id} value={p.program_id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center transition-colors",
                  programId
                    ? "border-border hover:border-primary/40"
                    : "border-border/50 opacity-60",
                )}
              >
                <UploadCloud className="w-10 h-10 text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Upload all audio/video files. Each file&apos;s{" "}
                  <code className="text-xs bg-muted px-1 rounded">
                    client_key
                  </code>{" "}
                  defaults to the filename (without extension) and must match
                  your CSV.
                </p>
                <input
                  ref={mediaInputRef}
                  type="file"
                  multiple
                  accept="audio/*,video/*"
                  className="hidden"
                  disabled={!programId || mediaUploading}
                  onChange={(e) => {
                    void handleMediaFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  disabled={!programId || mediaUploading}
                  onClick={() => mediaInputRef.current?.click()}
                  className="gap-2"
                >
                  {mediaUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileUp className="w-4 h-4" />
                  )}
                  {mediaUploading ? "Uploading…" : "Add media files"}
                </Button>
              </div>

              {mediaRows.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>client_key</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mediaRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="max-w-[140px] truncate text-sm">
                          {row.file.name}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.clientKey}
                            disabled={
                              row.status === "uploading" ||
                              row.status === "skipped" ||
                              mediaUploading
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              setMediaRows((prev) =>
                                prev.map((r) =>
                                  r.id === row.id
                                    ? { ...r, clientKey: value }
                                    : r,
                                ),
                              );
                            }}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          {row.status === "done" && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Done
                            </Badge>
                          )}
                          {row.status === "uploading" && (
                            <Badge variant="outline" className="gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Uploading
                            </Badge>
                          )}
                          {row.status === "error" && (
                            <span className="text-xs text-destructive">
                              {row.error ?? "Failed"}
                            </span>
                          )}
                          {row.status === "skipped" && (
                            <Badge variant="outline" className="gap-1">
                              Skipped
                            </Badge>
                          )}
                          {row.status === "pending" && (
                            <Badge variant="outline">Queued</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                CSV columns:{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  client_key
                </code>
                , <code className="text-xs bg-muted px-1 rounded">type</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">title</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">duration</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  instructor_name
                </code>
                . Optional:{" "}
                <code className="text-xs bg-muted px-1 rounded">tags</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">
                  ordered_position
                </code>
                .{" "}
                Media must be uploaded in step 1 with matching{" "}
                <code className="text-xs bg-muted px-1 rounded">client_key</code>
                .
              </p>
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <FileSpreadsheet className="w-10 h-10 text-primary mx-auto mb-4" />
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) =>
                    void handleCsvChange(e.target.files?.[0] ?? null)
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => csvInputRef.current?.click()}
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {csvFile ? "Change CSV" : "Select CSV"}
                </Button>
                {csvFile && (
                  <p className="mt-4 text-sm font-medium">
                    {csvFile.name} — {csvPreviewCount} row
                    {csvPreviewCount === 1 ? "" : "s"}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {uploadedCount} media file{uploadedCount === 1 ? "" : "s"}{" "}
                  ready to link
                  {skippedMediaCount > 0
                    ? ` · ${skippedMediaCount} skipped (already in program)`
                    : ""}
                </p>
              </div>
            </div>
          )}

          {step === 3 && job && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {job.status === "completed" && (
                  <CheckCircle2 className="w-8 h-8 text-secondary shrink-0" />
                )}
                {job.status === "failed" && (
                  <AlertCircle className="w-8 h-8 text-destructive shrink-0" />
                )}
                {(job.status === "pending" || job.status === "processing") && (
                  <Loader2 className="w-8 h-8 animate-spin text-primary shrink-0" />
                )}
                <div>
                  <p className="font-bold text-lg capitalize">{job.status}</p>
                  {job.error_message && (
                    <p className="text-sm text-destructive">
                      {job.error_message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span className="tabular-nums font-medium">
                    {rowsHandled} / {job.total_rows || "—"}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="rounded-xl bg-muted/40 p-4">
                  <p className="text-2xl font-bold">{job.total_rows}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Total
                  </p>
                </div>
                <div className="rounded-xl bg-secondary/10 p-4">
                  <p className="text-2xl font-bold text-secondary">
                    {job.processed_count}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Imported
                  </p>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-4">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {job.skipped_count ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Skipped
                  </p>
                </div>
                <div className="rounded-xl bg-destructive/10 p-4">
                  <p className="text-2xl font-bold text-destructive">
                    {job.failed_count}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Failed
                  </p>
                </div>
              </div>

              {job.failures.length > 0 && (
                <FailuresTable failures={job.failures} />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && step < 3 && (
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setStep((s) => (s - 1) as Step)}
            >
              Back
            </Button>
          )}
          {step === 1 && (
            <Button
              type="button"
              disabled={!canAdvanceFromStep1}
              onClick={() => setStep(2)}
            >
              Next: CSV metadata
            </Button>
          )}
          {step === 2 && (
            <Button
              type="button"
              disabled={!csvFile || submitting}
              onClick={() => void startJob()}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Starting…
                </>
              ) : (
                "Start import"
              )}
            </Button>
          )}
          {step === 3 && jobFinished && (
            <Button
              type="button"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FailuresTable({ failures }: { failures: BulkUploadRowFailure[] }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="bg-destructive/5 px-4 py-3 border-b flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-destructive" />
        <span className="font-semibold text-sm">Row failures</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Row</TableHead>
            <TableHead>client_key</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {failures.map((f, i) => (
            <TableRow key={`${f.rowNumber}-${i}`}>
              <TableCell>{f.rowNumber}</TableCell>
              <TableCell className="font-mono text-xs">
                {f.client_key ?? "—"}
              </TableCell>
              <TableCell className="text-sm text-destructive">
                {f.reason}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
