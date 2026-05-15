"use client";
import {
  FileUp,
  CheckCircle2,
  AlertCircle,
  Download,
  HelpCircle,
  ArrowRight,
  FileSpreadsheet,
  AlertTriangle,
  Edit2,
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

export function CSVPage() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-primary tracking-tight">
          Bulk CSV Upload & Validation
        </h2>
        <p className="text-muted-foreground font-medium max-w-3xl">
          Integrate large datasets into the Wellspring ecosystem. Our validation
          engine ensures your content meets clinical precision standards before
          finalization.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Upload Zone */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <div className="bg-card border-2 border-dashed border-border rounded-3xl p-10 flex flex-col items-center justify-center text-center h-full hover:border-primary/40 transition-all group">
            <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <FileUp className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">
              Upload Data Sheet
            </h3>
            <p className="text-sm text-muted-foreground mb-10 px-4 leading-relaxed font-medium">
              Drag and drop your CSV file here, or click the button below to
              browse your local storage.
            </p>
            <Button className="h-12 w-full max-w-[240px] font-bold gap-3 shadow-lg shadow-primary/20">
              <FileSpreadsheet className="w-5 h-5" />
              Select CSV File
            </Button>
            <p className="mt-8 text-[10px] text-muted-foreground/60 uppercase font-extrabold tracking-[0.2em]">
              Max File Size: 25MB
            </p>
          </div>
        </div>

        {/* Validation Feedback */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Success Summary */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-secondary fill-secondary/20" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-primary">
                  45 Rows Successful
                </h4>
                <p className="text-sm text-muted-foreground font-medium">
                  Data verified and ready for import.
                </p>
              </div>
            </div>
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-card bg-primary-container/20 flex items-center justify-center text-[10px] font-extrabold text-primary shadow-sm"
                >
                  {i === 3 ? "+43" : `P${i}`}
                </div>
              ))}
            </div>
          </div>

          {/* Failed Rows Table */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="bg-destructive/[0.03] px-8 py-5 flex items-center justify-between border-b border-destructive/10">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <span className="text-lg font-bold text-destructive">
                  3 Rows Failed
                </span>
              </div>
              <Badge
                variant="destructive"
                className="font-extrabold text-[10px] tracking-widest px-4 py-1.5 rounded-full"
              >
                ACTION REQUIRED
              </Badge>
            </div>

            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-b border-border/50">
                  <TableHead className="px-8 py-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Row #
                  </TableHead>
                  <TableHead className="px-8 py-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Field
                  </TableHead>
                  <TableHead className="px-8 py-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Error Message
                  </TableHead>
                  <TableHead className="text-right px-8 py-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    row: "12",
                    field: "session_date",
                    msg: "Invalid Date Format (Expected YYYY-MM-DD)",
                  },
                  {
                    row: "24",
                    field: "participant_email",
                    msg: "Missing Required Field",
                  },
                  {
                    row: "39",
                    field: "media_url",
                    msg: "Unreachable Resource (404 Error)",
                  },
                ].map((err, i) => (
                  <TableRow
                    key={i}
                    className="hover:bg-muted/20 transition-colors border-b border-border/40 last:border-0 group"
                  >
                    <TableCell className="px-8 py-5 font-bold text-foreground">
                      {err.row}
                    </TableCell>
                    <TableCell className="px-8 py-5">
                      <code className="text-xs bg-muted/50 px-2 py-1 rounded text-primary font-semibold border border-border/50">
                        {err.field}
                      </code>
                    </TableCell>
                    <TableCell className="px-8 py-5">
                      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {err.msg}
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="p-6 bg-muted/10 border-t border-border flex justify-end gap-3">
              <Button
                variant="ghost"
                className="text-primary font-bold text-sm h-11 px-6"
              >
                Download Error Log
              </Button>
              <Button className="font-bold h-11 px-8 shadow-md">
                Retry Upload
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bento */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-8 bg-primary rounded-3xl p-10 relative overflow-hidden text-primary-foreground shadow-xl shadow-primary/20">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-4">CSV Formatting Guide</h3>
              <p className="text-primary-foreground/80 font-medium max-w-2xl leading-relaxed">
                Ensure your columns exactly match the Creator Template. Required
                headers:{" "}
                <code className="text-primary-foreground font-bold bg-white/10 px-1.5 py-0.5 rounded">
                  session_id
                </code>
                ,{" "}
                <code className="text-primary-foreground font-bold bg-white/10 px-1.5 py-0.5 rounded">
                  title
                </code>
                ,{" "}
                <code className="text-primary-foreground font-bold bg-white/10 px-1.5 py-0.5 rounded">
                  date
                </code>
                , and{" "}
                <code className="text-primary-foreground font-bold bg-white/10 px-1.5 py-0.5 rounded">
                  resource_type
                </code>
                . All media links must be accessible.
              </p>
            </div>
            <Button
              variant="secondary"
              className="mt-10 h-12 gap-3 w-fit font-bold border-none bg-white text-primary hover:bg-white/90 px-8 rounded-xl"
            >
              <Download className="w-5 h-5" />
              Download Sample Template
            </Button>
          </div>
          <div className="absolute -right-20 -bottom-20 opacity-5 rotate-12">
            <FileSpreadsheet className="w-96 h-96" />
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 bg-muted/40 border border-border/50 rounded-3xl p-10 flex flex-col justify-between items-start">
          <div className="space-y-6">
            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center">
              <HelpCircle className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">
                Need assistance?
              </h3>
              <p className="text-sm text-muted-foreground font-medium mt-2 leading-relaxed">
                Our technical support team is available 24/7 to help with data
                mapping and integration errors.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="p-0 text-primary font-extrabold hover:bg-transparent group h-auto mt-8"
          >
            Visit Help Center
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
}
