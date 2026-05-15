"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Leaf, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  LoginFormValues,
  RegisterFormValues,
  loginSchema,
  registerSchema,
} from "@/types/types";
import { login as loginRequest, signup } from "@/services/auth";
import { toast } from "sonner";

export function LoginPage() {
  const router = useRouter();
  // todo: use sonner to show the message, make these states removed.
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const [registerPending, setRegisterPending] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tenant_name: "", email: "", password: "" },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setLoginError(null);
    setLoginPending(true);
    try {
      const res = await loginRequest(data);
      toast.success(res.data.message);
      router.replace("/programs");
    } catch (error) {
      toast.error((error as Error).message);
      setLoginError((error as Error).message);
    } finally {
      setLoginPending(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setRegisterError(null);
    setRegisterPending(true);
    try {
      const res = await signup(data);
      toast.success(res.data.message);
    } catch (error) {
      setRegisterError((error as Error).message);
    } finally {
      setRegisterPending(false);
    }
  };

  return (
    <main className="flex h-screen w-full bg-background">
      <section
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBtIOuKaXgu4_uH3ZwFN76jnGHMW4Rq0cEyPZRgbC458DIBasKoY4ZrqSH77g_OFjxw3V39lUhgpJbfD1SNTuwUWDUzOhwOxDfpZROpLgvaepy42uEatReAls_4yqGUfCX8tlxbVvkbYh3ps8LOEoh_si7-aJpsYt-6JteJ0yraX4eQnwx8yiXVZBcV6SyFcNv-KQerXAlBYeVOA6SQLW0vtUACNFio_gMn5gcp_3g3Wcq9rKcQFCSVMIsJMgDP6Dn2C1vMcfZbWA')",
        }}
      >
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        <div className="relative z-10 flex flex-col justify-end p-16 text-white h-full bg-linear-to-t from-black/60 to-transparent">
          <h1 className="font-heading text-6xl font-extrabold mb-6 leading-tight">
            Cultivating Harmony.
          </h1>
          <p className="text-xl max-w-md opacity-90 leading-relaxed font-light">
            Join a global network of wellness practitioners dedicated to
            holistic excellence and clinical precision.
          </p>
        </div>
      </section>

      <section className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16 lg:p-24 bg-surface">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-12">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mb-4 shadow-lg">
              <Leaf className="w-8 h-8" fill="currentColor" />
            </div>
            <h2 className="font-heading text-3xl font-bold text-primary">
              Wellspring
            </h2>
            <p className="text-sm text-muted-foreground mt-1 font-medium italic">
              Creator Admin Portal
            </p>
          </div>

          <div className="bg-card rounded-2xl shadow-xl shadow-primary/5 border border-border overflow-hidden">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-14 p-0 bg-muted/30 rounded-none border-b border-border">
                <TabsTrigger
                  value="login"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest"
                >
                  Creator Login
                </TabsTrigger>
                <TabsTrigger
                  value="join"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest"
                >
                  Join Wellspring
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="p-8 mt-0">
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="login-email"
                      className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground"
                    >
                      Email Address
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="login-email"
                        {...loginForm.register("email")}
                        className="pl-10 h-12 bg-muted/20 border-border focus:bg-background transition-all"
                        placeholder="practitioner@wellspring.com"
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-[10px] text-destructive font-bold">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label
                        htmlFor="login-password"
                        className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground"
                      >
                        Password
                      </Label>
                      <button
                        type="button"
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="login-password"
                        type="password"
                        {...loginForm.register("password")}
                        className="pl-10 h-12 bg-muted/20 border-border focus:bg-background transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-[10px] text-destructive font-bold">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {loginError && (
                    <p className="text-sm text-destructive font-medium">
                      {loginError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={loginPending}
                    className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
                  >
                    {loginPending ? "Signing in…" : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent
                value="join"
                className="p-8 flex flex-col items-center justify-center text-center space-y-4"
              >
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-accent-foreground">
                  <Leaf className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">
                    Join our Creator Network
                  </h3>
                </div>

                <form
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                  className="space-y-6 w-full text-left"
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="tenant_name"
                      className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground"
                    >
                      Tenant / organization name
                    </Label>
                    <div className="relative group">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="tenant_name"
                        {...registerForm.register("tenant_name")}
                        className="pl-10 h-12 bg-muted/20 border-border focus:bg-background transition-all"
                        placeholder="Acme Wellness"
                      />
                    </div>
                    {registerForm.formState.errors.tenant_name && (
                      <p className="text-[10px] text-destructive font-bold">
                        {registerForm.formState.errors.tenant_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="register-email"
                      className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground"
                    >
                      Email Address
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="register-email"
                        {...registerForm.register("email")}
                        className="pl-10 h-12 bg-muted/20 border-border focus:bg-background transition-all"
                        placeholder="practitioner@wellspring.com"
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="text-[10px] text-destructive font-bold">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="register-password"
                      className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground"
                    >
                      Password
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="register-password"
                        type="password"
                        {...registerForm.register("password")}
                        className="pl-10 h-12 bg-muted/20 border-border focus:bg-background transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="text-[10px] text-destructive font-bold">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {registerError && (
                    <p className="text-sm text-destructive font-medium text-center">
                      {registerError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={registerPending}
                    className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
                  >
                    {registerPending ? "Creating…" : "Register"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <footer className="mt-12 flex justify-center gap-8 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/40">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Support
            </a>
          </footer>
        </div>
      </section>
    </main>
  );
}
