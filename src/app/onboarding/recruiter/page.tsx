"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  Building,
  Briefcase,
  Mail,
  ArrowRight,
  PlusCircle,
  Search,
  Globe,
  Sliders,
  Check,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { RecruiterProfile, RecruiterVerificationStatus } from "@/types";

export default function RecruiterOnboardingPage() {
  const router = useRouter();
  const { user, role, updateRecruiterProfile } = useAuth();
  const { success, info } = useToast();

  const recruiter = user as RecruiterProfile;
  const [currentStatus, setCurrentStatus] = useState<RecruiterVerificationStatus>(
    recruiter?.verificationStatus || "Recruiter Verified"
  );
  const [showSimulator, setShowSimulator] = useState(false);

  const handleSimulateStatus = (status: RecruiterVerificationStatus) => {
    setCurrentStatus(status);
    updateRecruiterProfile({ verificationStatus: status });
    if (status === "Recruiter Verified") {
      success("Status updated: Recruiter Verified with official badge.");
    } else {
      info(`Status switched to: ${status}`);
    }
  };

  const getStatusBadge = (status: RecruiterVerificationStatus) => {
    switch (status) {
      case "Recruiter Verified":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-blue-500/30">
            <ShieldCheck className="w-4 h-4" /> Recruiter Verified
          </span>
        );
      case "Company Verified":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <CheckCircle2 className="w-4 h-4" /> Company Verified
          </span>
        );
      case "Email Verified":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <Mail className="w-4 h-4" /> Email Verified
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-blue-500/30">
            <Clock className="w-4 h-4" /> Verification Pending
          </span>
        );
      case "Verification Failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-4 h-4" /> Verification Failed
          </span>
        );
      case "Suspended":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
            Suspended
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-blue-800 via-blue-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <span className="font-black text-xs tracking-tight text-white select-none">CS</span>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">
                CommandSkill
              </span>
              <span className="text-[10px] text-muted-foreground font-medium block">
                Employer & University Talent Suite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Account Setup & Verification</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Welcome to CommandSkill, {recruiter?.name || "Partner"}!
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Your recruiter workspace is configured for{" "}
                <span className="font-semibold text-foreground">
                  {recruiter?.company || "your organization"}
                </span>
                .
              </p>
            </div>

            <div>{getStatusBadge(currentStatus)}</div>
          </div>

          {/* Verification Pipeline Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/40 border border-border/80">
            <div className="flex items-start gap-3 p-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">1. Work Email</div>
                <div className="text-[11px] text-muted-foreground">
                  {recruiter?.email || "Work address verified"}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">2. Company Domain</div>
                <div className="text-[11px] text-muted-foreground">
                  {recruiter?.companyWebsite ? (
                    <span className="truncate">{recruiter.companyWebsite}</span>
                  ) : (
                    "Validated company domain"
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">3. Recruiter Verified</div>
                <div className="text-[11px] text-muted-foreground">
                  Verified talent acquisition badge active
                </div>
              </div>
            </div>
          </div>

          {/* Recruiter Details Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-2.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-500" />
                <span>Organization Details</span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Company:</span>
                  <span className="font-medium text-foreground">{recruiter?.company || "Stripe"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Industry:</span>
                  <span className="font-medium text-foreground">
                    {recruiter?.companyType || "Technology & Software"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Company Size:</span>
                  <span className="font-medium text-foreground">
                    {recruiter?.companySize || "5,000 - 10,000 employees"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="font-medium text-foreground">
                    {recruiter?.companyLocation || "San Francisco, CA"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-2.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                <span>Recruiter Credentials</span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Contact:</span>
                  <span className="font-medium text-foreground">{recruiter?.name || "Barun"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Job Title:</span>
                  <span className="font-medium text-foreground">
                    {recruiter?.title || "University Talent Lead"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Department:</span>
                  <span className="font-medium text-foreground">
                    {recruiter?.department || "University Talent & Early Career"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Work Email:</span>
                  <span className="font-medium text-foreground">{recruiter?.email || "barun@stripe.com"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="gradient"
              className="w-full sm:w-auto px-6 h-11 text-xs font-bold justify-center shadow-md shadow-blue-600/20 cursor-pointer"
              onClick={() => router.push("/dashboard/recruiter")}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Enter Recruiter Dashboard
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto px-6 h-11 text-xs font-semibold justify-center border-border cursor-pointer"
              onClick={() => router.push("/dashboard/recruiter/post-internship")}
              leftIcon={<PlusCircle className="w-4 h-4 text-blue-500" />}
            >
              Post Your First Internship
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto px-4 h-11 text-xs text-muted-foreground hover:text-foreground justify-center cursor-pointer"
              onClick={() => router.push("/dashboard/recruiter/students")}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Explore Student Talent
            </Button>
          </div>
        </div>

        {/* Verification Status Simulator (Collapsible for Testing) */}
        <div className="border border-border/70 rounded-2xl bg-card/60 p-4">
          <button
            type="button"
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              <span>Admin Verification State Simulator (Testing Tool)</span>
            </span>
            <span className="text-[11px] font-mono text-blue-500">
              {showSimulator ? "Hide" : "Show"}
            </span>
          </button>

          {showSimulator && (
            <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Test how the dashboard and profiles look under different mock verification stages:
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "Pending",
                    "Email Verified",
                    "Company Verified",
                    "Recruiter Verified",
                    "Verification Failed",
                    "Suspended",
                  ] as RecruiterVerificationStatus[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleSimulateStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      currentStatus === st
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-muted text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 p-4 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} CommandSkill Platform &bull; Recruiter Suite
      </footer>
    </div>
  );
}
