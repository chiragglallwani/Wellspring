"use client";

import { useState } from "react";
import { FileUp, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BulkUploadDialog } from "@/components/bulk-uploads/BulkUploadDialog";

export function BulkUploadsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-primary tracking-tight">
            Bulk uploads
          </h2>
          <p className="text-muted-foreground font-medium max-w-2xl">
            Upload many session media files, attach metadata via CSV, and import
            sessions in the background while you keep working.
          </p>
        </div>
      </div>

      <div className="bg-card border-2 border-dashed border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
          <FileUp className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Import sessions at scale
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mb-8 font-medium leading-relaxed">
          Step 1: upload audio/video and map each file to a{" "}
          <code className="text-xs bg-muted px-1 rounded">client_key</code>.
          Step 2: upload a CSV with session metadata. Step 3: we link storage
          keys and create sessions asynchronously.
        </p>
        <Button className="gap-2 font-bold" onClick={() => setDialogOpen(true)}>
          <FileUp className="w-4 h-4" />
          Start bulk upload
        </Button>
      </div>

      <BulkUploadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
