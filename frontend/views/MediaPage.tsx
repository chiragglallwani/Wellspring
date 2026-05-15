"use client";
import React, { useState } from "react";
import {
  Upload,
  CheckCircle2,
  RotateCcw,
  Play,
  FileText,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function MediaPage() {
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success"
  >("success");
  const [progress, setProgress] = useState(45);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs & Header */}
      <div className="flex justify-between items-end">
        <div>
          <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            <span className="hover:text-primary cursor-pointer transition-colors">
              Sessions
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">Session Detail</span>
          </nav>
          <h2 className="text-3xl font-bold text-primary tracking-tight">
            Edit Wellness Session
          </h2>
        </div>
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="h-10 border-primary text-primary font-bold hover:bg-primary/5 px-8"
          >
            Discard
          </Button>
          <Button className="h-10 font-bold px-8 shadow-lg shadow-primary/20">
            Save Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Form Details */}
        <div className="col-span-12 lg:col-span-7 space-y-8">
          <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
            <h3 className="text-lg font-bold text-primary mb-8 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Session Information
            </h3>

            <div className="space-y-8">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground">
                  Session Title
                </Label>
                <Input
                  className="h-12 bg-muted/20 border-border focus:bg-background transition-all font-medium"
                  defaultValue="Guided Mindfulness: Deep Breath Control"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-extrabold tracking-widest text-muted-foreground">
                  Transcript
                </Label>
                <Textarea
                  className="bg-muted/20 border-border focus:bg-background transition-all font-medium leading-relaxed"
                  rows={12}
                  defaultValue={`00:01 Welcome to today's deep breathing session.
00:15 Find a comfortable seated position, perhaps on a cushion or a chair.
00:30 Begin by closing your eyes and bringing your awareness to the tip of your nose.
00:45 Feel the cool air entering your nostrils and the warm air leaving.
01:05 As we move into the first phase of the meditation, we will count the breaths together...`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Media Flow */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-card p-8 rounded-2xl border border-border shadow-sm flex flex-col h-full">
            <h3 className="text-lg font-bold text-primary mb-8 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Media Management
            </h3>

            {/* States Container */}
            <div className="space-y-8">
              {/* Idle State */}
              <div
                className={cn(
                  "space-y-4",
                  uploadStatus !== "idle" &&
                    "opacity-40 grayscale pointer-events-none scale-95 transition-all",
                )}
              >
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  Idle State
                </div>
                <div className="border-2 border-dashed border-border bg-muted/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center group cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all">
                  <div className="w-14 h-14 bg-muted border border-border rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-bold text-primary">
                    Drag & Drop video here
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    MP4 or MOV files, up to 2GB
                  </p>
                </div>
              </div>

              {/* Uploading State */}
              <div
                className={cn(
                  "space-y-4",
                  uploadStatus !== "uploading" &&
                    "opacity-40 grayscale pointer-events-none scale-95 transition-all",
                )}
              >
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  Uploading State
                </div>
                <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin text-primary">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-primary">
                        Preparing secure link...
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-primary">
                      {progress}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2 bg-primary/20" />
                  <p className="text-[10px] text-muted-foreground mt-3 text-right font-bold tabular-nums">
                    session_v2_edit.mp4 • 482MB of 1.1GB
                  </p>
                </div>
              </div>

              {/* Success State */}
              <div
                className={cn(
                  "space-y-4",
                  uploadStatus !== "success" &&
                    "opacity-40 grayscale pointer-events-none scale-95 transition-all",
                )}
              >
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  Success State
                </div>
                <div className="relative rounded-2xl overflow-hidden group shadow-lg border border-border">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzQX9biN2bC2HvC3pjk4Qlc2gKqJYt5Lgy2bjhu3gNBzVsChvD_PFdG3IOFky-n3VbUKI2HT9uMwZXuM6Ibv5NDfj1J7KpKmoFKi5I_g0FIBlrSgk-l973bv9lBRRD1kDPzf-2XX-Ns8a6pydbVaTzpRBeh6kGUGA_4TXHEI-rFLXQ6BjFxn_7YZZoUSIgnj6WppdeirF8UPUa0y4meBOz2UR05LGF25vyp1PGk-KppN75Xnd6h2-4TdUeamyssvnL-Wskg1dVcg"
                    alt="Video thumbnail"
                    className="w-full h-52 object-cover brightness-75 group-hover:brightness-90 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/40 hover:scale-110 transition-all"
                    >
                      <Play className="w-6 h-6 fill-current" />
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center">
                    <span className="text-xs text-white font-bold opacity-80">
                      session_v2_final.mp4
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 text-[10px] font-bold border border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Replace
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary p-6 rounded-2xl text-primary-foreground flex gap-4 items-start shadow-xl shadow-primary/20">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg leading-tight">
                Encrypted S3 Pipeline
              </h4>
              <p className="text-sm opacity-80 mt-1 leading-relaxed">
                All media is processed through our HIPAA-compliant AWS S3
                bucket. Access is restricted via IAM roles and pre-signed URLs.
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              variant="ghost"
              className="text-xs font-bold text-muted-foreground uppercase tracking-widest"
              onClick={() => setUploadStatus("idle")}
            >
              Test Idle
            </Button>
            <Button
              variant="ghost"
              className="text-xs font-bold text-muted-foreground uppercase tracking-widest"
              onClick={() => setUploadStatus("uploading")}
            >
              Test Uploading
            </Button>
            <Button
              variant="ghost"
              className="text-xs font-bold text-muted-foreground uppercase tracking-widest"
              onClick={() => setUploadStatus("success")}
            >
              Test Success
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
