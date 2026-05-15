"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound, Leaf, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from "@/services/auth";
import {
  type ForgotPasswordEmailValues,
  type ForgotPasswordNewPasswordValues,
  type ForgotPasswordOtpValues,
  forgotPasswordEmailSchema,
  forgotPasswordNewPasswordSchema,
  forgotPasswordOtpSchema,
} from "@/types/types";
import { toast } from "sonner";

type ResetStep = "email" | "otp" | "password";

export function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  const emailForm = useForm<ForgotPasswordEmailValues>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<ForgotPasswordOtpValues>({
    resolver: zodResolver(forgotPasswordOtpSchema),
    defaultValues: { code: "" },
  });

  const passwordForm = useForm<ForgotPasswordNewPasswordValues>({
    resolver: zodResolver(forgotPasswordNewPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onEmailSubmit = async (data: ForgotPasswordEmailValues) => {
    setPending(true);
    try {
      const res = await requestPasswordReset(data.email);
      setEmail(data.email);
      setStep("otp");
      toast.success(
        res.data?.message ??
          "If an account exists for this email, a verification code has been sent.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  };

  const onOtpSubmit = async (data: ForgotPasswordOtpValues) => {
    setPending(true);
    try {
      await verifyPasswordResetOtp(email, data.code);
      setCode(data.code);
      setStep("password");
      toast.success("Code verified. Choose a new password.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  };

  const onPasswordSubmit = async (data: ForgotPasswordNewPasswordValues) => {
    setPending(true);
    try {
      await confirmPasswordReset(email, code, data.password);
      toast.success("Password updated. You can sign in with your new password.");
      router.replace("/");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  };

  const resendCode = async () => {
    if (!email) return;
    setPending(true);
    try {
      const res = await requestPasswordReset(email);
      toast.success(
        res.data?.message ??
          "If an account exists for this email, a verification code has been sent.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  };

  const stepTitle =
    step === "email"
      ? "Reset your password"
      : step === "otp"
        ? "Enter verification code"
        : "Choose a new password";

  const stepDescription =
    step === "email"
      ? "Enter your account email and we will send a 6-digit code if an account exists."
      : step === "otp"
        ? `We sent a code to ${email}. It expires in 15 minutes.`
        : "Your code was verified. Set a strong new password for your account.";

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-surface p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Leaf className="h-8 w-8" fill="currentColor" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-primary">Wellspring</h1>
          <p className="mt-1 text-sm font-medium italic text-muted-foreground">
            Creator Admin Portal
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-xl shadow-primary/5">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to sign in
          </Link>

          <h2 className="font-heading text-xl font-bold text-primary">{stepTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{stepDescription}</p>

          {step === "email" && (
            <form
              onSubmit={emailForm.handleSubmit(onEmailSubmit)}
              className="mt-8 space-y-6"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="reset-email"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Email address
                </Label>
                <div className="group relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    {...emailForm.register("email")}
                    className="h-12 border-border bg-muted/20 pl-10 transition-all focus:bg-background"
                    placeholder="practitioner@wellspring.com"
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="text-[10px] font-bold text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={pending} className="h-12 w-full font-bold">
                {pending ? "Sending…" : "Send verification code"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form
              onSubmit={otpForm.handleSubmit(onOtpSubmit)}
              className="mt-8 space-y-6"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="reset-code"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  6-digit code
                </Label>
                <div className="group relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="reset-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    {...otpForm.register("code")}
                    className="h-12 border-border bg-muted/20 pl-10 tracking-[0.35em] transition-all focus:bg-background"
                    placeholder="000000"
                  />
                </div>
                {otpForm.formState.errors.code && (
                  <p className="text-[10px] font-bold text-destructive">
                    {otpForm.formState.errors.code.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={pending} className="h-12 w-full font-bold">
                {pending ? "Verifying…" : "Verify code"}
              </Button>

              <button
                type="button"
                disabled={pending}
                className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-primary hover:underline disabled:opacity-50"
                onClick={() => void resendCode()}
              >
                Resend code
              </button>
            </form>
          )}

          {step === "password" && (
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="mt-8 space-y-6"
            >
              <div className="space-y-2">
                <Label
                  htmlFor="new-password"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  New password
                </Label>
                <div className="group relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register("password")}
                    className="h-12 border-border bg-muted/20 pl-10 transition-all focus:bg-background"
                    placeholder="••••••••"
                  />
                </div>
                {passwordForm.formState.errors.password && (
                  <p className="text-[10px] font-bold text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirm-password"
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Confirm password
                </Label>
                <div className="group relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register("confirmPassword")}
                    className="h-12 border-border bg-muted/20 pl-10 transition-all focus:bg-background"
                    placeholder="••••••••"
                  />
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-[10px] font-bold text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={pending} className="h-12 w-full font-bold">
                {pending ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
