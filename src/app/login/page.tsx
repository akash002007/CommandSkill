"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Lock, Mail, UserCheck, Briefcase, GraduationCap, Building2, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShinyCTA } from "@/components/ui/ShinyCTA";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { UserRole } from "@/types";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials, loginWithDemo, resetPassword } = useAuth();
  const { success, error: toastError } = useToast();

  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoadingRole, setDemoLoadingRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleQuickFill = (fillRole: UserRole) => {
    setErrorMsg("");
    setRole(fillRole);
    if (fillRole === "student" || fillRole === "STUDENT") {
      setEmail("alex.rivera@stanford.edu");
      setPassword("commandskill123");
      success("Autofilled Student demo credentials");
    } else if (fillRole === "recruiter" || fillRole === "RECRUITER") {
      setEmail("barun@stripe-careers.com");
      setPassword("recruiter123");
      success("Autofilled Recruiter demo credentials");
    } else if (fillRole === "COLLEGE_ADMIN" || (fillRole as string) === "college") {
      setEmail("placement@stanford.edu");
      setPassword("college123");
      success("Autofilled College Dean demo credentials");
    } else {
      setEmail("priya.menon@commandskill.io");
      setPassword("admin123");
      success("Autofilled Admin demo credentials");
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter your email address to request password reset.");
      toastError("Please enter your email address first.");
      return;
    }
    try {
      const res = await resetPassword(email);
      if (res.success) {
        success(res.message || `Password reset instructions sent to ${email}`);
      } else {
        toastError(res.error || "Password reset failed");
      }
    } catch {
      toastError("Unable to process password reset. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !email.includes("@") || !email.includes(".")) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    if (!password || password.trim().length === 0) {
      setErrorMsg("Password cannot be empty");
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginWithCredentials(email, password, role);

      if (result.success && result.redirectUrl) {
        success(`Welcome back, ${result.user?.name || "User"}!`);
        window.location.href = result.redirectUrl;
      } else {
        const errorText = result.error || "Invalid email or password. Please verify your credentials.";
        setErrorMsg(errorText);
        toastError(errorText);
        setIsLoading(false);
      }
    } catch (err: any) {
      const errorText = err?.message || "Failed to sign in. Please verify your credentials.";
      setErrorMsg(errorText);
      toastError(errorText);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background">
      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Auth Form Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Brand header */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-blue-800 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <span className="font-black text-base tracking-tight text-white select-none">CS</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-foreground">
                CommandSkill
              </span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Sign In to Your Workspace
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Enter your credentials or continue with Google for instant access.
            </p>
          </div>

          {/* Role Selection Tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-muted border border-border">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                role === "student"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("recruiter")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                role === "recruiter"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
              <span>Recruiter</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("COLLEGE_ADMIN")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                role === "COLLEGE_ADMIN"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-purple-500" />
              <span>College</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                role === "admin"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Admin</span>
            </button>
          </div>

          {/* Login Card */}
          <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-5">
            {/* Google Authentication Button */}
            <div className="space-y-3">
              <GoogleSignInButton
                role={role}
                mode="login"
              />
              <div className="relative flex items-center justify-center">
                <div className="border-t border-border w-full" />
                <span className="bg-card px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                  Or continue with email
                </span>
                <div className="border-t border-border w-full" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                name="email"
                autoComplete="email"
                label="Email Address"
                type="email"
                placeholder={role === "student" ? "you@university.edu" : "name@company.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-none p-0"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-primary/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}

              <ShinyCTA
                type="submit"
                className="w-full h-11 text-sm font-semibold justify-center shadow-md shadow-blue-600/20"
                isLoading={isLoading}
                disabled={isLoading}
              >
                Sign In as {role === "student" ? "Student" : role === "recruiter" ? "Recruiter" : role === "COLLEGE_ADMIN" ? "College Placement Dean" : "Admin"}
                {!isLoading && <ArrowRight className="w-4 h-4 ml-1" />}
              </ShinyCTA>
            </form>

            {/* Demo Accounts */}
            <div className="pt-5 border-t border-border/60">
              <div className="mb-3 space-y-0.5">
                <h3 className="text-xs font-semibold tracking-tight text-foreground">
                  Demo Accounts
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Explore CommandSkill with a demo account
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  id="demo-student-button"
                  data-testid="demo-student-button"
                  disabled={isLoading}
                  onClick={() => handleQuickFill("student")}
                  className={cn(
                    "h-9 px-2 sm:px-2.5 rounded-lg text-xs font-medium whitespace-nowrap",
                    "border border-border/80 bg-muted/40 hover:bg-muted/70 dark:bg-muted/20 dark:hover:bg-muted/50",
                    "text-foreground/90 hover:text-foreground",
                    "hover:border-blue-500/50 dark:hover:border-blue-500/40 hover:bg-blue-50/40 dark:hover:bg-blue-500/10",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50",
                    "active:scale-[0.98] transition-all duration-150 select-none cursor-pointer",
                    "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
                    "flex items-center justify-center gap-1.5"
                  )}
                >
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  id="demo-recruiter-button"
                  data-testid="demo-recruiter-button"
                  disabled={isLoading}
                  onClick={() => handleQuickFill("recruiter")}
                  className={cn(
                    "h-9 px-2 sm:px-2.5 rounded-lg text-xs font-medium whitespace-nowrap",
                    "border border-border/80 bg-muted/40 hover:bg-muted/70 dark:bg-muted/20 dark:hover:bg-muted/50",
                    "text-foreground/90 hover:text-foreground",
                    "hover:border-blue-500/50 dark:hover:border-blue-500/40 hover:bg-blue-50/40 dark:hover:bg-blue-500/10",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50",
                    "active:scale-[0.98] transition-all duration-150 select-none cursor-pointer",
                    "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
                    "flex items-center justify-center gap-1.5"
                  )}
                >
                  <span>Recruiter</span>
                </button>

                <button
                  type="button"
                  id="demo-college-button"
                  data-testid="demo-college-button"
                  disabled={isLoading}
                  onClick={() => handleQuickFill("COLLEGE_ADMIN")}
                  className={cn(
                    "h-9 px-2 sm:px-2.5 rounded-lg text-xs font-medium whitespace-nowrap",
                    "border border-border/80 bg-muted/40 hover:bg-muted/70 dark:bg-muted/20 dark:hover:bg-muted/50",
                    "text-foreground/90 hover:text-foreground",
                    "hover:border-blue-500/50 dark:hover:border-blue-500/40 hover:bg-blue-50/40 dark:hover:bg-blue-500/10",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50",
                    "active:scale-[0.98] transition-all duration-150 select-none cursor-pointer",
                    "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
                    "flex items-center justify-center gap-1.5"
                  )}
                >
                  <span>College Dean</span>
                </button>

                <button
                  type="button"
                  id="demo-admin-button"
                  data-testid="demo-admin-button"
                  disabled={isLoading}
                  onClick={() => handleQuickFill("admin")}
                  className={cn(
                    "h-9 px-2 sm:px-2.5 rounded-lg text-xs font-medium whitespace-nowrap",
                    "border border-border/80 bg-muted/40 hover:bg-muted/70 dark:bg-muted/20 dark:hover:bg-muted/50",
                    "text-foreground/90 hover:text-foreground",
                    "hover:border-blue-500/50 dark:hover:border-blue-500/40 hover:bg-blue-50/40 dark:hover:bg-blue-500/10",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50",
                    "active:scale-[0.98] transition-all duration-150 select-none cursor-pointer",
                    "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
                    "flex items-center justify-center gap-1.5"
                  )}
                >
                  <span>Admin</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Switch to Sign up */}
          <p className="text-center text-xs sm:text-sm text-muted-foreground">
            Don&apos;t have an account yet?{" "}
            <Link href="/signup" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="p-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} CommandSkill Platform
      </footer>
    </div>
  );
}
