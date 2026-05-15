"use client";

import { useEffect, useRef, useState } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  formatSessionsRequestError,
  sessionsApi,
  type ApiSessionRow,
} from "@/services/sessions";
import { uploadsApi } from "@/services/uploads";
import {
  SessionEditFormValues,
  SessionFormValues,
  sessionEditFormSchema,
  sessionFormSchema,
} from "@/types/types";
import { cn } from "@/lib/utils";

const defaultCreateValues: SessionFormValues = {
  title: "",
  type: "video",
  duration: 60,
  instructor_name: "",
  client_key: "",
  tags: "",
  media_file_path: "",
};

export type SessionSheetState =
  | { kind: "closed" }
  | {
      kind: "create";
      programId: string;
      programName: string;
      orderedPosition: number;
    }
  | {
      kind: "edit";
      programId: string;
      programName: string;
      session: ApiSessionRow;
    };

export type SessionSheetProps = {
  state: SessionSheetState;
  onStateChange: (next: SessionSheetState) => void;
  onCompleted?: () => void | Promise<void>;
};

function parseTagsInput(raw?: string): string[] | undefined {
  if (!raw?.trim()) return undefined;
  const tags = raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

function defaultClientKey(file: File): string {
  return file.name.replace(/\.[^/.]+$/, "") || file.name;
}

const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "ogv", "mkv"]);
const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
  "flac",
  "webm",
]);

function fileMatchesMediaType(
  file: File,
  mediaType: "audio" | "video",
): boolean {
  if (mediaType === "video") {
    if (file.type.startsWith("video/")) return true;
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ext ? VIDEO_EXTENSIONS.has(ext) : false;
  }
  if (file.type.startsWith("audio/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext ? AUDIO_EXTENSIONS.has(ext) : false;
}

function acceptForMediaType(mediaType: "audio" | "video"): string {
  return mediaType === "video" ? "video/*" : "audio/*";
}

/** Read duration from file metadata in the browser (seconds, min 1). */
function getMediaDurationInSeconds(
  file: File,
  mediaType: "audio" | "video",
): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element =
      mediaType === "video"
        ? document.createElement("video")
        : document.createElement("audio");

    const cleanup = () => {
      URL.revokeObjectURL(url);
      element.removeAttribute("src");
      element.load();
    };

    element.preload = "metadata";
    element.onloadedmetadata = () => {
      const raw = element.duration;
      cleanup();
      if (!Number.isFinite(raw) || raw <= 0) {
        reject(new Error("Could not read media duration"));
        return;
      }
      resolve(Math.max(1, Math.ceil(raw)));
    };
    element.onerror = () => {
      cleanup();
      reject(new Error("Could not read media duration"));
    };
    element.src = url;
  });
}

function sessionToEditValues(session: ApiSessionRow): SessionEditFormValues {
  return {
    title: session.title,
    type: session.type,
    duration: session.duration,
    instructor_name: session.instructor_name,
    client_key: session.client_key,
    tags: session.tags?.join(", ") ?? "",
  };
}

export function SessionSheet({
  state,
  onStateChange,
  onCompleted,
}: SessionSheetProps) {
  const isCreate = state.kind === "create";
  const isEdit = state.kind === "edit";
  const open = isCreate || isEdit;

  const programId =
    state.kind === "create" || state.kind === "edit" ? state.programId : "";
  const programName =
    state.kind === "create" || state.kind === "edit" ? state.programName : "";
  const orderedPosition = state.kind === "create" ? state.orderedPosition : 0;
  const editSession = state.kind === "edit" ? state.session : null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);

  const createForm = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: defaultCreateValues,
  });

  const editForm = useForm<SessionEditFormValues>({
    resolver: zodResolver(sessionEditFormSchema),
    defaultValues: sessionToEditValues(
      editSession ?? {
        session_id: "",
        program_id: "",
        client_key: "",
        type: "video",
        title: "",
        duration: 60,
        ordered_position: 0,
        instructor_name: "",
      },
    ),
  });

  const selectedMediaType = isCreate
    ? createForm.watch("type")
    : (editSession?.type ?? "video");
  const mediaFilePath = isCreate
    ? createForm.watch("media_file_path")
    : undefined;
  const createErrors = createForm.formState.errors;
  const editErrors = editForm.formState.errors;
  const isSubmitting = isEdit
    ? editForm.formState.isSubmitting
    : createForm.formState.isSubmitting;

  useEffect(() => {
    if (!open) return;

    if (isCreate) {
      queueMicrotask(() => {
        createForm.reset(defaultCreateValues);
        setMediaFileName(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      });
      return;
    }

    if (isEdit && editSession) {
      queueMicrotask(() => {
        editForm.reset(sessionToEditValues(editSession));
      });
    }
  }, [open, programId, isCreate, isEdit, editSession, createForm, editForm]);

  useEffect(() => {
    if (!isCreate || !open) return;
    queueMicrotask(() => {
      setMediaFileName(null);
      createForm.setValue("media_file_path", "", { shouldValidate: false });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  }, [selectedMediaType, isCreate, open, createForm]);

  const clearCreateMediaSelection = () => {
    setMediaFileName(null);
    createForm.setValue("media_file_path", "", { shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleMediaFile = async (file: File | null) => {
    if (!file || state.kind !== "create") return;

    const mediaType = createForm.getValues("type");
    if (!fileMatchesMediaType(file, mediaType)) {
      clearCreateMediaSelection();
      toast.error(
        mediaType === "video"
          ? "Please upload a video file for a video session."
          : "Please upload an audio file for an audio session.",
      );
      return;
    }

    setMediaUploading(true);
    setMediaFileName(file.name);
    createForm.setValue("media_file_path", "", { shouldValidate: true });

    let durationSeconds: number | undefined;
    try {
      durationSeconds = await getMediaDurationInSeconds(file, mediaType);
    } catch {
      toast.warning(
        "Could not detect duration from this file. Enter duration manually.",
      );
    }

    try {
      const clientKey =
        createForm.getValues("client_key")?.trim() || defaultClientKey(file);
      const presignRes = await uploadsApi.presign({
        program_id: state.programId,
        filename: file.name,
        client_key: clientKey,
        contentType: file.type || undefined,
      });
      const { presignedUploadUrl, key } = presignRes.data.data;

      const uploadRes = await fetch(presignedUploadUrl, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : {},
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload media file");
      }

      createForm.setValue("media_file_path", key, { shouldValidate: true });
      createForm.setValue("client_key", file.name, { shouldValidate: true });
      if (durationSeconds !== undefined) {
        createForm.setValue("duration", durationSeconds, {
          shouldValidate: true,
        });
      }
      toast.success(
        durationSeconds !== undefined
          ? `Media uploaded (${durationSeconds}s detected)`
          : "Media uploaded",
      );
    } catch (error) {
      setMediaFileName(null);
      createForm.setValue("media_file_path", "", { shouldValidate: true });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.error(formatSessionsRequestError(error));
    } finally {
      setMediaUploading(false);
    }
  };

  const onSubmitCreate = async (values: SessionFormValues) => {
    if (state.kind !== "create") return;

    try {
      const tags = parseTagsInput(values.tags);
      const clientKey = values.client_key?.trim() || crypto.randomUUID();

      await sessionsApi.create({
        program_id: state.programId,
        client_key: clientKey,
        type: values.type,
        title: values.title,
        duration: values.duration,
        ordered_position: state.orderedPosition,
        instructor_name: values.instructor_name,
        media_file_path: values.media_file_path,
        ...(tags ? { tags } : {}),
      });

      toast.success("Session created successfully");
      onStateChange({ kind: "closed" });
      await onCompleted?.();
    } catch (error) {
      toast.error(formatSessionsRequestError(error));
    }
  };

  const onSubmitEdit = async (values: SessionEditFormValues) => {
    if (state.kind !== "edit") return;

    try {
      const tags = parseTagsInput(values.tags);
      const clientKey = values.client_key?.trim();

      await sessionsApi.update(state.session.session_id, {
        title: values.title,
        duration: values.duration,
        instructor_name: values.instructor_name,
        ...(clientKey ? { client_key: clientKey } : {}),
        ...(tags ? { tags } : {}),
      });

      toast.success("Session updated successfully");
      onStateChange({ kind: "closed" });
      await onCompleted?.();
    } catch (error) {
      toast.error(formatSessionsRequestError(error));
    }
  };

  const formDisabled = isSubmitting || mediaUploading;

  const register = (
    isEdit ? editForm.register : createForm.register
  ) as UseFormRegister<SessionEditFormValues>;
  const errors = (
    isEdit ? editErrors : createErrors
  ) as FieldErrors<SessionEditFormValues>;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onStateChange({ kind: "closed" });
      }}
    >
      <SheetContent className="w-[min(92vw,56rem)] max-w-[95vw] sm:w-[min(94vw,72rem)] sm:max-w-[min(94vw,72rem)]! overflow-y-auto px-8 sm:px-12">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-2xl font-bold text-primary">
            {isEdit ? "Edit session" : "Add session"}
          </SheetTitle>
          <SheetDescription className="text-sm font-medium">
            {isEdit
              ? programName
                ? `Update details for “${editSession?.title}” in “${programName}”. Media cannot be changed here.`
                : "Update session details. Media cannot be changed here."
              : programName
                ? `Create a new session for “${programName}”. It will be added at position ${orderedPosition + 1}.`
                : "Create a new session for this program."}
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-col"
          onSubmit={
            isEdit
              ? editForm.handleSubmit(onSubmitEdit)
              : createForm.handleSubmit(onSubmitCreate)
          }
        >
          <div className="space-y-8 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="session-title"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Session title
              </Label>
              <Input
                id="session-title"
                placeholder="e.g., Breathwork fundamentals"
                className={cn(
                  "h-12 border-border bg-muted/10",
                  errors.title && "border-destructive",
                )}
                disabled={formDisabled}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="session-type"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Media type
                </Label>
                <select
                  id="session-type"
                  disabled={formDisabled || isEdit}
                  className={cn(
                    "flex h-12 w-full rounded-lg border border-input bg-muted/10 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
                    errors.type && "border-destructive",
                  )}
                  {...register("type")}
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                </select>
                {errors.type && (
                  <p className="text-xs text-destructive">
                    {errors.type.message}
                  </p>
                )}
                {isEdit && (
                  <p className="text-xs text-muted-foreground">
                    Media type cannot be changed after the session is created.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="session-duration"
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Duration (seconds)
                </Label>
                <Input
                  id="session-duration"
                  type="number"
                  min={1}
                  step={1}
                  className={cn(
                    "h-12 border-border bg-muted/10",
                    errors.duration && "border-destructive",
                  )}
                  disabled={formDisabled}
                  {...register("duration", { valueAsNumber: true })}
                />
                {errors.duration && (
                  <p className="text-xs text-destructive">
                    {errors.duration.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="session-instructor"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Instructor name
              </Label>
              <Input
                id="session-instructor"
                placeholder="e.g., Dr. Sarah Chen"
                className={cn(
                  "h-12 border-border bg-muted/10",
                  errors.instructor_name && "border-destructive",
                )}
                disabled={formDisabled}
                {...register("instructor_name")}
              />
              {errors.instructor_name && (
                <p className="text-xs text-destructive">
                  {errors.instructor_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="session-client-key"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Client key {isEdit ? "" : "(optional)"}
              </Label>
              <Input
                id="session-client-key"
                placeholder={
                  isEdit ? "Client key" : "Leave blank to auto-generate"
                }
                className="h-12 border-border bg-muted/10"
                disabled={formDisabled}
                {...register("client_key")}
              />
              {isCreate && (
                <p className="text-xs text-muted-foreground">
                  Unique identifier for integrations. A UUID is generated if
                  empty.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="session-tags"
                className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                Tags (optional)
              </Label>
              <Input
                id="session-tags"
                placeholder="mindfulness, breathing, beginner"
                className="h-12 border-border bg-muted/10"
                disabled={formDisabled}
                {...register("tags")}
              />
            </div>

            {isCreate && (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Session media
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptForMediaType(selectedMediaType)}
                  className="sr-only"
                  disabled={formDisabled}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void handleMediaFile(file);
                  }}
                />
                <button
                  type="button"
                  disabled={formDisabled}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/5 p-10 transition-all hover:border-primary/50 hover:bg-primary/5",
                    createErrors.media_file_path && "border-destructive",
                    mediaFilePath && "border-primary/40 bg-primary/5",
                  )}
                >
                  <UploadCloud
                    className={cn(
                      "h-10 w-10 text-muted-foreground",
                      mediaFilePath && "text-primary",
                    )}
                  />
                  <div className="text-center">
                    <p className="text-sm font-bold">
                      {mediaUploading
                        ? "Uploading…"
                        : (mediaFileName ??
                          (selectedMediaType === "video"
                            ? "Click to upload a video file"
                            : "Click to upload an audio file"))}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {selectedMediaType === "video"
                        ? "Video only · required before saving"
                        : "Audio only · required before saving"}
                    </p>
                  </div>
                </button>
                {createErrors.media_file_path && (
                  <p className="text-xs text-destructive">
                    {createErrors.media_file_path.message}
                  </p>
                )}
              </div>
            )}

            {isEdit && editSession?.media_file_path && (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Current media
                </p>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {editSession.media_file_path.split("/").pop()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload a new file by deleting this session and creating a new
                  one.
                </p>
              </div>
            )}
          </div>

          <SheetFooter className=" flex justify-end flex-row gap-4 pb-2">
            <Button
              type="button"
              variant="outline"
              disabled={formDisabled}
              onClick={() => onStateChange({ kind: "closed" })}
              className="h-12 px-4"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formDisabled}
              className="h-12 px-8 font-bold shadow-lg shadow-primary/20"
            >
              {isEdit ? "Save changes" : "Create session"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
