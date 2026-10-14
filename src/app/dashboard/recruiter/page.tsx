"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Users2,
  GitPullRequest,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Clock,
  ArrowRight,
  PlusCircle,
  BarChart3,
  Building2,
  UserCheck,
  Award,
  Video,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { getTimeAwareGreeting, cn } from "@/lib/utils";
import { StructuredCandidateModal } from "@/components/recruiter/StructuredCandidateModal";
import { RecruitmentDrive, RecruitmentApplication, CandidateInterviewRecord } from "@/types";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { useAuth } from "@/context/AuthContext";

export default function RecruiterDashboardHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("Good morning");

  // Live Server Data States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState({
    activeDrivesCount: 0,
    totalApplicationsCount: 0,
    eligibleCandidatesCount: 0,
    shortlistedCandidatesCount: 0,
    interviewsCount: 0,
    selectedCandidatesCount: 0,
  });
  const [activeDrives, setActiveDrives] = useState<RecruitmentDrive[]>([]);
  const [recentApplications, setRecentApplications] = useState<RecruitmentApplication[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<CandidateInterviewRecord[]>([]);

  // Candidate Profile Modal
  const [selectedCandidate, setSelectedCandidate] = useState<RecruitmentApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setGreeting(getTimeAwareGreeting(new Date()));
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recruiter/overview");
      if (res.ok) {
        const data = await res.json();
        if (data.kpis) setKpis(data.kpis);
        if (data.activeDrives) setActiveDrives(data.activeDrives);
        if (data.recentApplications) setRecentApplications(data.recentApplications);
        if (data.upcomingInterviews) setUpcomingInterviews(data.upcomingInterviews);
      } else {
        setError("Unable to load latest recruiter metrics and active drives.");
      }
    } catch (err) {
      console.warn("Failed to fetch recruiter overview:", err);
      setError("Network error connecting to recruiter overview service.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCandidate = (app: RecruitmentApplication) => {
    setSelectedCandidate(app);
    setIsModalOpen(true);
  };

  const handleCandidateStatusUpdate = async (newStatus: string, notes?: string) => {
    if (!selectedCandidate) return;
    try {
      const res = await fetch(`/api/recruiter/applications/${selectedCandidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes }),
      });
      if (res.ok) {
        fetchOverviewData();
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualOverride = async (newStatus: string, reason: string) => {
    if (!selectedCandidate) return;
    try {
      const res = await fetch(`/api/recruiter/applications/${selectedCandidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, isOverride: true, overrideReason: reason }),
      });
      if (res.ok) {
        fetchOverviewData();
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <RoleGuard allowedRole="recruiter">
      <div className="space-y-8">
        {/* Workspace Hero Header */}
        <WelcomeCard
          portalBadge="Structured Recruitment Workspace"
          userName={user?.name || "Barun"}
          description="Manage structured recruitment drives, evaluate academic eligibility, coordinate multi-stage assessments, and publish auditable merit lists."
          primaryAction={{
            label: "Create Recruitment Drive",
            href: "/dashboard/recruiter/drives/new",
            icon: <PlusCircle className="w-3.5 h-3.5" />
          }}
          secondaryAction={{
            label: "Screening Workbench",
            href: "/dashboard/recruiter/screening",
            icon: <UserCheck className="w-3.5 h-3.5" />
          }}
          rightWidget={
            <div className="shrink-0 w-full lg:w-72 p-4 rounded-2xl bg-muted/40 border border-border/80 backdrop-blur-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Pipeline Health</span>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">RPSC Active</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Total Applicants</span>
                <span className="font-bold text-foreground">{kpis.totalApplicationsCount}</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Eligible Candidates</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{kpis.eligibleCandidatesCount}</span>
              </div>
            </div>
          }
        />

        {error && (
          <Card className="p-4 border-destructive/40 bg-destructive/5 text-destructive flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchOverviewData}
              className="gap-1.5 border-destructive/30 hover:bg-destructive/10 text-destructive"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
          </Card>
        )}

        {/* 1. Top: Recruitment Overview (Compact KPI Row) */}
        <Card className="p-4 sm:p-5 border-border/80 bg-card rounded-2xl shadow-xs space-y-3.5">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Recruitment Overview
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live recruitment activity across all active drives
            </p>
          </div>

          <div className="overflow-x-auto pb-1 no-scrollbar">
            <div className="grid grid-cols-6 min-w-[680px] lg:min-w-0 gap-2.5 sm:gap-3">
              {[
                {
                  label: "Active Drives",
                  value: kpis.activeDrivesCount,
                  icon: <Briefcase className="w-3.5 h-3.5" />,
                  iconVariant: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                  href: "/dashboard/recruiter/drives",
                },
                {
                  label: "Applications",
                  value: kpis.totalApplicationsCount,
                  icon: <GitPullRequest className="w-3.5 h-3.5" />,
                  iconVariant: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
                  href: "/dashboard/recruiter/applications",
                },
                {
                  label: "Eligible",
                  value: kpis.eligibleCandidatesCount,
                  icon: <ShieldCheck className="w-3.5 h-3.5" />,
                  iconVariant: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                  href: "/dashboard/recruiter/screening",
                },
                {
                  label: "Shortlisted",
                  value: kpis.shortlistedCandidatesCount,
                  icon: <UserCheck className="w-3.5 h-3.5" />,
                  iconVariant: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                  href: "/dashboard/recruiter/selection",
                },
                {
                  label: "Interviews",
                  value: kpis.interviewsCount,
                  icon: <Calendar className="w-3.5 h-3.5" />,
                  iconVariant: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  href: "/dashboard/recruiter/interviews",
                },
                {
                  label: "Selected",
                  value: kpis.selectedCandidatesCount,
                  icon: <Award className="w-3.5 h-3.5" />,
                  iconVariant: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                  href: "/dashboard/recruiter/results",
                },
              ].map((metric) => (
                <Link
                  key={metric.label}
                  href={metric.href}
                  className="group p-2.5 sm:p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-border/70 hover:border-blue-500/30 transition-all flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                >
                  <div
                    className={cn(
                      "w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                      metric.iconVariant
                    )}
                  >
                    {metric.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-black text-foreground tracking-tight leading-none">
                      {isLoading ? (
                        <span className="inline-block w-5 h-4 bg-muted animate-pulse rounded" />
                      ) : (
                        metric.value
                      )}
                    </div>
                    <div className="text-[11px] font-medium text-muted-foreground truncate mt-1">
                      {metric.label}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Card>

        {/* 2. Main Dashboard Grid — Row 1: Active Drives (62%) + Upcoming Interviews (38%) */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.63fr)_minmax(0,1fr)] gap-6 items-start">
          {/* LEFT (approx 62%): Active Recruitment Drives */}
          <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                <h2 className="text-base font-bold text-foreground">
                  Active Recruitment Drives
                </h2>
              </div>
              <Link
                href="/dashboard/recruiter/drives"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <span>View All ({activeDrives.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-border/60 space-y-3 animate-pulse bg-muted/20">
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-3 w-40 bg-muted rounded" />
                    <div className="h-12 w-full bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : activeDrives.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No active recruitment drives found.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {activeDrives.map((drive) => (
                  <div
                    key={drive.id}
                    className="p-4 rounded-xl border border-border/80 hover:border-blue-500/40 transition-all bg-card flex flex-col justify-between space-y-3 shadow-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant="purple" size="sm" className="font-bold text-[10px] uppercase tracking-wider py-0 px-1.5">
                          {drive.status.replace("_", " ")}
                        </Badge>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {drive.salaryStipend}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-1">
                        {drive.title}
                      </h3>

                      <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                        <span className="font-medium text-foreground">{drive.department}</span>
                        <span>•</span>
                        <span>{drive.location}</span>
                        <span>•</span>
                        <span>{drive.openingsCount} Openings</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-border/60">
                      <div className="grid grid-cols-3 gap-1.5 text-center py-1.5 px-2 rounded-lg bg-muted/30 border border-border/40">
                        <div>
                          <div className="font-extrabold text-xs text-foreground">{drive.applicantsCount}</div>
                          <div className="text-[10px] text-muted-foreground">Applied</div>
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">{drive.eligibleCount}</div>
                          <div className="text-[10px] text-muted-foreground">Eligible</div>
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-blue-600 dark:text-blue-400">{drive.shortlistedCount}</div>
                          <div className="text-[10px] text-muted-foreground">Shortlisted</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <Link
                          href={`/dashboard/recruiter/screening?driveId=${drive.id}`}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>Screen Candidates</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <Link href={`/dashboard/recruiter/results?driveId=${drive.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                            Merit & Results
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* RIGHT (approx 38%): Upcoming Interviews */}
          <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <h2 className="text-base font-bold text-foreground">
                  Upcoming Interviews
                </h2>
              </div>
              <Link
                href="/dashboard/recruiter/calendar"
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
              >
                <span>View Calendar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto no-scrollbar pr-0.5">
              {upcomingInterviews.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No interviews scheduled for today.
                </div>
              ) : (
                upcomingInterviews.slice(0, 3).map((int) => {
                  const isFinal = int.roundType === "FINAL" || (int.roundName || "").toLowerCase().includes("final");
                  const roundLabel = int.roundName || (isFinal ? "Final Round" : `${int.roundType || "Technical"} Round`);

                  return (
                    <div
                      key={int.id}
                      className={cn(
                        "p-3 rounded-xl bg-card border border-border/80 transition-all hover:border-purple-500/40 space-y-2 shadow-xs",
                        isFinal && "border-rose-500/30 bg-rose-500/[0.02]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar src={int.candidateAvatar} alt={int.candidateName} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{int.candidateName}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{int.driveTitle || "Candidate"}</div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 block">
                            {int.time}
                          </span>
                          <Badge
                            variant={isFinal ? "rose" : "purple"}
                            className="text-[9px] px-1.5 py-0 font-medium mt-0.5"
                          >
                            {roundLabel}
                          </Badge>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                          {int.interviewerName || "Interviewer Assigned"}
                        </span>
                        {int.meetingLink ? (
                          <a
                            href={int.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline shrink-0"
                          >
                            <Video className="w-3.5 h-3.5" /> Join Meet
                          </a>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Slot Scheduled</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Link href="/dashboard/recruiter/calendar" className="block pt-1">
              <Button variant="outline" size="sm" className="w-full text-xs h-8 font-semibold">
                View Calendar
              </Button>
            </Link>
          </Card>
        </div>

        {/* 3. Recent Candidate Applications */}
        <Card className="p-5 border-border/80 bg-card rounded-2xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-blue-500" />
                <h2 className="text-base font-bold text-foreground">
                  Recent Candidate Applications
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live candidate submissions and eligibility verification
              </p>
            </div>
            <Link
              href="/dashboard/recruiter/applications"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 shrink-0"
            >
              <span>View Full Pipeline ({kpis.totalApplicationsCount})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/80 text-muted-foreground">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">Candidate</th>
                  <th className="px-3 py-2.5 font-semibold">Drive / Position</th>
                  <th className="px-3 py-2.5 font-semibold">Eligibility</th>
                  <th className="px-3 py-2.5 font-semibold">Stage</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-card">
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-muted" />
                          <div className="space-y-1">
                            <div className="w-20 h-3 bg-muted rounded" />
                            <div className="w-28 h-2.5 bg-muted rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3"><div className="w-24 h-3 bg-muted rounded" /></td>
                      <td className="px-3 py-3"><div className="w-16 h-4 bg-muted rounded" /></td>
                      <td className="px-3 py-3"><div className="w-16 h-3 bg-muted rounded" /></td>
                      <td className="px-3 py-3"><div className="w-16 h-4 bg-muted rounded" /></td>
                      <td className="px-3.5 py-3 text-right"><div className="w-16 h-6 bg-muted rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : recentApplications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No candidate applications received yet.
                    </td>
                  </tr>
                ) : (
                  recentApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={app.studentAvatar} alt={app.studentName} size="sm" />
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate">{app.studentName}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {app.degree} • {app.university}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-foreground font-medium truncate max-w-[200px]">
                        {app.driveTitle}
                      </td>
                      <td className="px-3 py-3">
                        {app.eligibility ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                              app.eligibility.status === "ELIGIBLE"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : app.eligibility.status === "REQUIRES_MANUAL_REVIEW"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            )}
                          >
                            {app.eligibility.status === "ELIGIBLE" ? (
                              <CheckCircle2 className="w-2.5 h-2.5" />
                            ) : (
                              <AlertTriangle className="w-2.5 h-2.5" />
                            )}
                            {app.eligibility.status === "ELIGIBLE"
                              ? "100% Eligible"
                              : app.eligibility.status === "REQUIRES_MANUAL_REVIEW"
                              ? "Review Needed"
                              : "Failed"}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-foreground text-[11px] truncate block max-w-[150px]">
                          {app.currentStageName}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="purple" size="sm" className="text-[10px] py-0 px-1.5 font-medium">
                          {app.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] px-2 font-medium"
                          onClick={() => handleOpenCandidate(app)}
                        >
                          Inspect Profile
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Candidate Profile / Eligibility Modal */}
        <StructuredCandidateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          application={selectedCandidate}
          onStatusChange={handleCandidateStatusUpdate}
          onManualOverride={handleManualOverride}
          onMessage={() => {
            setIsModalOpen(false);
            router.push("/dashboard/recruiter/messages");
          }}
        />
      </div>
    </RoleGuard>
  );
}
