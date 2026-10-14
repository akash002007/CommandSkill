"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  ChevronRight,
  Award,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  Shield,
  Filter,
  Search,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { CandidateAssessmentRecord } from "@/types";

interface EnrichedAssessment extends CandidateAssessmentRecord {
  driveTitle?: string;
  company?: string;
  companyLogo?: string;
  attemptStatus?: string;
  assessmentConfigId?: string;
  category?: string;
  durationMinutes?: number;
  questionCount?: number;
  mode?: "STANDARD" | "PROCTORED" | string;
  startDateTime?: string;
  endDateTime?: string;
  hasFullProctoring?: boolean;
  proctoringConfig?: any;
  candidateRules?: any;
  percentage?: number;
}

type TabCategory = "ALL" | "READY" | "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED";

export default function StudentAssessmentsPage() {
  const [assessments, setAssessments] = useState<EnrichedAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/assessments");
      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Failed to load assigned assessments. Please try again.");
      }
    } catch (err) {
      console.error("Failed to load assessments:", err);
      setError("Unable to connect to the assessment service. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to categorize each assessment into defined lifecycle states
  const getCategoryForAssessment = (ass: EnrichedAssessment): TabCategory => {
    const isCompleted =
      ass.candidateScore !== undefined ||
      ass.attemptStatus === "SUBMITTED" ||
      ass.attemptStatus === "AUTO_SUBMITTED" ||
      ass.attemptStatus === "TERMINATED";
    if (isCompleted) return "COMPLETED";
    if (ass.attemptStatus === "ACTIVE" || ass.attemptStatus === "PAUSED") return "IN_PROGRESS";

    const now = Date.now();
    if (ass.endDateTime && now > new Date(ass.endDateTime).getTime()) {
      return "EXPIRED";
    }
    if (ass.startDateTime && now < new Date(ass.startDateTime).getTime()) {
      return "UPCOMING";
    }

    return "READY";
  };

  // Filter assessments
  const filteredAssessments = assessments.filter((ass) => {
    const cat = getCategoryForAssessment(ass);
    if (activeTab !== "ALL" && cat !== activeTab) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (ass.assessmentName || "").toLowerCase().includes(q);
      const matchCompany = (ass.company || "").toLowerCase().includes(q);
      const matchDrive = (ass.driveTitle || "").toLowerCase().includes(q);
      return matchTitle || matchCompany || matchDrive;
    }
    return true;
  });

  const counts: Record<TabCategory, number> = {
    ALL: assessments.length,
    READY: assessments.filter((a) => getCategoryForAssessment(a) === "READY").length,
    UPCOMING: assessments.filter((a) => getCategoryForAssessment(a) === "UPCOMING").length,
    IN_PROGRESS: assessments.filter((a) => getCategoryForAssessment(a) === "IN_PROGRESS").length,
    COMPLETED: assessments.filter((a) => getCategoryForAssessment(a) === "COMPLETED").length,
    EXPIRED: assessments.filter((a) => getCategoryForAssessment(a) === "EXPIRED").length,
  };

  return (
    <RoleGuard allowedRole="student">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Candidate Examination Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Assessments
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Complete assigned evaluations for your recruitment applications and view official results.
            </p>
          </div>

          <Link href="/dashboard/applications">
            <Button variant="outline" size="sm" leftIcon={<Layers className="w-4 h-4" />}>
              My Applications
            </Button>
          </Link>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Categorized Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/40 border border-border/80 overflow-x-auto">
            {(
              [
                { key: "ALL", label: "All" },
                { key: "READY", label: "Ready to Take" },
                { key: "UPCOMING", label: "Upcoming" },
                { key: "IN_PROGRESS", label: "In Progress" },
                { key: "COMPLETED", label: "Completed" },
                { key: "EXPIRED", label: "Expired" },
              ] as { key: TabCategory; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? "bg-card text-foreground shadow-2xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === tab.key
                      ? "bg-purple-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assessment or company..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-muted-foreground font-semibold">Loading assigned assessments...</p>
          </div>
        ) : error ? (
          <Card className="p-8 text-center border border-rose-500/20 bg-rose-500/5 rounded-3xl space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="font-bold text-sm text-foreground">Error Loading Assessments</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAssessments} className="mt-2">
              Retry
            </Button>
          </Card>
        ) : filteredAssessments.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-border/80 rounded-3xl">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-foreground">
              {searchQuery ? "No matching assessments found" : "No assessments in this category"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Try clearing your search query or switching tabs."
                : "Assessments assigned to your candidate profile for active recruitment drives will appear here."}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {filteredAssessments.map((ass) => {
              const hasOfficialResult = ass.candidateScore !== undefined && ass.candidateScore !== null;
              const isPendingEvaluation =
                !hasOfficialResult &&
                (ass.attemptStatus === "SUBMITTED" || ass.attemptStatus === "AUTO_SUBMITTED");
              const isTerminated = ass.attemptStatus === "TERMINATED";
              const isProctored = ass.hasFullProctoring || ass.mode === "PROCTORED";
              const targetId = ass.assessmentConfigId || ass.id;
              const isActive = ass.attemptStatus === "ACTIVE" || ass.attemptStatus === "PAUSED";
              const category = getCategoryForAssessment(ass);
              const isExpired = category === "EXPIRED";
              const isUpcoming = category === "UPCOMING";

              // Defensive score and percentage calculations to ensure data correctness
              const rawMaxScore =
                typeof ass.maxScore === "number" && ass.maxScore > 0 ? ass.maxScore : 100;
              const candidateScore = hasOfficialResult ? Number(ass.candidateScore) : undefined;
              const passingScore =
                typeof ass.passingScore === "number"
                  ? Number(ass.passingScore)
                  : Math.round(rawMaxScore * 0.75);

              // Safeguard denominator: ensure effectiveMaxScore matches the authoritative score scale
              const effectiveMaxScore = Math.max(rawMaxScore, candidateScore ?? 0, passingScore ?? 0);
              const effectivePassingScore = Math.min(passingScore, effectiveMaxScore);

              // Compute percentage consistently with guaranteed 0-100% boundary
              const effectivePercentage =
                candidateScore !== undefined && effectiveMaxScore > 0
                  ? Math.min(100, Math.max(0, Math.round((candidateScore / effectiveMaxScore) * 100)))
                  : undefined;

              // Authoritative pass/fail determination
              const hasPassed =
                candidateScore !== undefined
                  ? ass.passed !== undefined
                    ? Boolean(ass.passed)
                    : candidateScore >= effectivePassingScore
                  : false;

              return (
                <Card
                  key={ass.id}
                  hoverEffect
                  className="p-5 border-border bg-card space-y-4 flex flex-col justify-between rounded-3xl shadow-sm"
                >
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-muted border border-border p-1 overflow-hidden shrink-0 flex items-center justify-center">
                          {ass.companyLogo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ass.companyLogo}
                              alt={ass.company || "Company"}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2 break-words">
                            {ass.assessmentName}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">
                            {ass.company} • Part of {ass.driveTitle}
                          </p>
                        </div>
                      </div>

                      {hasOfficialResult ? (
                        hasPassed ? (
                          <Badge variant="emerald" size="sm" className="font-bold shrink-0">
                            Passed ✓
                          </Badge>
                        ) : (
                          <Badge variant="rose" size="sm" className="font-bold shrink-0">
                            Failed ✗
                          </Badge>
                        )
                      ) : isPendingEvaluation ? (
                        <Badge variant="lavender" size="sm" className="font-bold shrink-0 text-amber-500 border-amber-500/30">
                          Pending Review
                        </Badge>
                      ) : isTerminated ? (
                        <Badge variant="rose" size="sm" className="font-bold shrink-0">
                          Terminated
                        </Badge>
                      ) : isActive ? (
                        <Badge variant="blue" size="sm" className="font-bold shrink-0 animate-pulse">
                          In Progress
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="outline" size="sm" className="font-bold shrink-0 text-rose-500 border-rose-500/30">
                          Expired
                        </Badge>
                      ) : isUpcoming ? (
                        <Badge variant="lavender" size="sm" className="font-bold shrink-0">
                          Upcoming
                        </Badge>
                      ) : (
                        <Badge variant="purple" size="sm" className="font-bold shrink-0">
                          Ready to Start
                        </Badge>
                      )}
                    </div>

                    {/* Test Info Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {isProctored && (
                        <Badge variant="purple" size="sm" className="gap-1 font-bold">
                          <Shield className="w-3 h-3" /> Proctored
                        </Badge>
                      )}
                      <span className="px-2.5 py-1 rounded-xl bg-muted text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        {ass.duration || "45 mins"}
                      </span>
                      {ass.questionCount !== undefined && (
                        <span className="px-2.5 py-1 rounded-xl bg-muted text-muted-foreground font-semibold flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-purple-500" />
                          {ass.questionCount} Questions
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-xl bg-muted text-muted-foreground font-semibold">
                        Passing Mark: {effectivePassingScore} / {effectiveMaxScore}
                      </span>
                    </div>

                    {/* Description preview */}
                    {ass.instructions && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 bg-muted/30 p-2.5 rounded-xl border border-border/60">
                        {ass.instructions}
                      </p>
                    )}

                    {/* Score summary if official result is available */}
                    {hasOfficialResult && (
                      <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          Recorded Score:
                        </span>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-black text-purple-600 dark:text-purple-400">
                            {candidateScore} / {effectiveMaxScore}
                          </strong>
                          {effectivePercentage !== undefined && (
                            <span className="text-xs font-bold text-muted-foreground">
                              ({effectivePercentage}%)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pending review indicator */}
                    {isPendingEvaluation && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          Evaluation Status:
                        </span>
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          Submission Under Review
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer Action Links */}
                  <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground text-[11px]">
                      {hasOfficialResult
                        ? "Official Result Available"
                        : isPendingEvaluation
                        ? "Evaluation in Progress"
                        : isTerminated
                        ? "Attempt Terminated"
                        : isActive
                        ? "Exam Session Active"
                        : isExpired
                        ? "Testing Window Closed"
                        : isUpcoming
                        ? `Opens ${ass.startDateTime ? new Date(ass.startDateTime).toLocaleDateString() : "Soon"}`
                        : "Ready to Launch"}
                    </span>

                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/assessments/${targetId}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>

                      {hasOfficialResult ? (
                        <Link href={`/dashboard/assessments/${targetId}/result`}>
                          <Button variant="gradient" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                            View Result
                          </Button>
                        </Link>
                      ) : isTerminated ? (
                        <Link href={`/dashboard/assessments/${targetId}/result`}>
                          <Button variant="ghost" size="sm" className="text-xs text-rose-500">
                            View Log
                          </Button>
                        </Link>
                      ) : isExpired ? null : isUpcoming ? null : (
                        <Link href={`/dashboard/assessments/${targetId}/take`}>
                          <Button
                            variant="gradient"
                            size="sm"
                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          >
                            {isActive ? "Resume Exam" : "Start Assessment"}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
