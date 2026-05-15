"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { programsApi } from "@/services/programs";
import { ProgramFormValues, programFormSchema } from "@/types/types";
import { cn } from "@/lib/utils";

const defaultFormValues: ProgramFormValues = {
  name: "",
  description: "",
  length: 1,
  isActive: true,
};

export type ProgramsSheetState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; programId: string };

export type ProgramsDialogProps = {
  state: ProgramsSheetState;
  onStateChange: (next: ProgramsSheetState) => void;
  onCompleted?: (page: number) => void | Promise<void>;
};

export function ProgramsDialog({
  state,
  onStateChange,
  onCompleted,
}: ProgramsDialogProps) {
  const open = state.kind !== "closed";
  const mode = state.kind === "edit" ? "edit" : "create";
  const programId = state.kind === "edit" ? state.programId : undefined;

  const [loadingProgram, setLoadingProgram] = useState(false);

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: defaultFormValues,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (!open || state.kind !== "create") return;
    queueMicrotask(() => {
      reset(defaultFormValues);
    });
  }, [open, state.kind, reset]);

  useEffect(() => {
    if (!open || state.kind !== "edit" || !programId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadingProgram(true);
      void (async () => {
        try {
          const res = await programsApi.get(programId);
          toast.success(res.data.message);
          const row = res.data.data;
          if (cancelled || !row) return;
          reset({
            name: row.name,
            description: row.description,
            length: row.length,
            isActive: row.isActive,
          });
        } catch {
          toast.error("Failed to load program");
          onStateChange({ kind: "closed" });
        } finally {
          if (!cancelled) setLoadingProgram(false);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [open, state.kind, programId, reset, onStateChange]);

  const onSubmit = async (values: ProgramFormValues) => {
    try {
      if (mode === "create") {
        await programsApi.create({
          name: values.name,
          description: values.description,
          length: values.length,
          isActive: values.isActive,
        });
        toast.success("Program created successfully");
      } else if (programId) {
        await programsApi.update(programId, {
          name: values.name,
          description: values.description,
          length: values.length,
          isActive: values.isActive,
        });
        toast.success("Program updated successfully");
      }
      onStateChange({ kind: "closed" });
      await onCompleted?.(1);
    } catch {
      toast.error("Failed to create/update program");
    }
  };

  const formDisabled = isSubmitting || loadingProgram;

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        size="sm"
        className="h-10 gap-2 font-bold shadow-lg shadow-primary/20"
        onClick={() => onStateChange({ kind: "create" })}
      >
        <Plus className="w-4 h-4" />
        Create New
      </Button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) onStateChange({ kind: "closed" });
        }}
      >
        <SheetContent className="w-[min(92vw,56rem)] max-w-[95vw] sm:w-[min(94vw,72rem)] sm:max-w-[min(94vw,72rem)]! overflow-y-auto px-8 sm:px-12">
          <SheetHeader className="mb-8">
            <SheetTitle className="text-2xl font-bold text-primary">
              {mode === "create" ? "Create New Program" : "Edit Program"}
            </SheetTitle>
            <SheetDescription className="text-sm font-medium">
              {mode === "create"
                ? "Fill in the details to launch a new wellness journey."
                : "Update program details. Changes apply immediately after save."}
            </SheetDescription>
          </SheetHeader>

          {loadingProgram ? (
            <p className="text-sm text-muted-foreground py-8">
              Loading program…
            </p>
          ) : (
            <form
              className="flex flex-col gap-0 min-h-0"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="space-y-8 py-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="program-name"
                    className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground"
                  >
                    Program name
                  </Label>
                  <Input
                    id="program-name"
                    placeholder="e.g., Sleep Hygiene Protocol"
                    className={cn(
                      "h-12 bg-muted/10 border-border",
                      errors.name && "border-destructive",
                    )}
                    disabled={formDisabled}
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="program-length"
                    className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground"
                  >
                    Program length (sessions)
                  </Label>
                  <Input
                    id="program-length"
                    type="number"
                    min={1}
                    step={1}
                    className={cn(
                      "h-12 bg-muted/10 border-border max-w-48",
                      errors.length && "border-destructive",
                    )}
                    disabled={formDisabled}
                    {...register("length", { valueAsNumber: true })}
                  />
                  {errors.length && (
                    <p className="text-xs text-destructive">
                      {errors.length.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="program-description"
                    className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground"
                  >
                    Program description
                  </Label>
                  <Textarea
                    id="program-description"
                    placeholder="Describe the program overview and goals…"
                    className={cn(
                      "min-h-[200px] bg-muted/10 border-border resize-y",
                      errors.description && "border-destructive",
                    )}
                    disabled={formDisabled}
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/5 px-4 py-3">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="program-active"
                      className="text-sm font-semibold text-foreground"
                    >
                      Published (live)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Turn off to keep the program as a draft.
                    </p>
                  </div>
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="program-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={formDisabled}
                      />
                    )}
                  />
                </div>
              </div>

              <SheetFooter className="mt-12 sticky bottom-0 bg-background pt-4 pb-2 border-t flex flex-row gap-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={formDisabled}
                  onClick={() => onStateChange({ kind: "closed" })}
                  className="min-w-0 flex-1 h-12"
                >
                  {mode === "create" ? "Discard draft" : "Cancel"}
                </Button>
                <Button
                  type="submit"
                  disabled={formDisabled}
                  className="min-w-0 flex-2 h-12 font-bold shadow-lg shadow-primary/20"
                >
                  {mode === "create" ? "Create program" : "Save changes"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
