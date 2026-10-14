"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  Calendar,
  Award,
  UserCheck,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  Video,
  FileText,
  Sliders,
  RefreshCw,
  Edit,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { RoleGuard } from "@/components/dashboard/RoleGuard";
import { useToast } from "@/context/ToastContext";
import {
  RecruitmentDrive,
  RecruitmentApplication,
  RecruitmentStage,
  CandidateAssessmentRecord,
  CandidateInterviewRecord,
} from "@/types";

export default function SelectionProcessPage() {
  const { success, error: toastError, info } = useToast();

  const [drives, setDrives] = useState<RecruitmentDrive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState<string>("");
  const [stages, setStages] = useState<RecruitmentStage[]>([]);
  const [applications, setApplications] = useState<RecruitmentApplication[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [assessments, setAssessments] = useState<CandidateAssessmentRecord[]>([]);
  const [interviews, setInterviews] = useState<CandidateInterviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAdvancing, setIsAdvancing] = useState<Record<string, boolean>>({});

  // Active view tab: "pipeline" | "assessments" | "evaluations"
  const [activeTab, setActiveTab] = useState<"pipeline" | "assessments" | "evaluations">("pipeline");

  // Assessment Score Modal
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [selectedAssessmentCandidate, setSelectedAssessmentCandidate] = useState<RecruitmentApplication | null>(null);
  const [assessmentScoreInput, setAssessmentScoreInput] = useState<string>("85");
  const [isSavingScore, setIsSavingScore] = useState(false);

  // Interview Evaluation Modal
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedEvalInterview, setSelectedEvalInterview] = useState<CandidateInterviewRecord | null>(null);
  const [techScore, setTechScore] = useState<number>(85);
  const [commScore, setCommScore] = useState<number>(85);
  const [overallScore, setOverallScore] = useState<number>(85);
  const [evalFeedback, setEvalFeedback] = useState<string>("Strong technical competence.");
  const [evalRecommendation, setEvalRecommendation] = useState<"RECOMMEND" | "HOLD" | "NOT_RECOMMEND">("RECOMMEND");
  const [isSavingEval, setIsSavingEval] = useState(false);

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    fetchInitialDrives();
  }, []);

  useEffect(() => {
    if (selectedDriveId) {
      fetchDriveStagesAndData(selectedDriveId, debouncedSearch);
    }
  }, [selectedDriveId, debouncedSearch]);

  const fetchInitialDrives = async () => {
    try {
      const res = await fetch("/api/recruiter/drives");
      if (res.ok) {
        const data = await res.json();
        const driveList: RecruitmentDrive[] = data.drives || [];
        setDrives(driveList);
        if (driveList.length > 0) {
          setSelectedDriveId(driveList[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDriveStagesAndData = async (driveId: string, search = "") => {
    setIsLoading(true);
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const [stagesRes, appsRes, assessRes, intRes] = await Promise.all([
        fetch(`/api/recruiter/drives/${driveId}/stages`),
        fetch(`/api/recruiter/applications?driveId=${driveId}&pageSize=50${searchParam}`),
        fetch(`/api/recruiter/assessments?driveId=${driveId}`),
        fetch(`/api/recruiter/interviews?driveId=${driveId}`),
      ]);

      if (stagesRes.ok) {
        const sData = await stagesRes.json();
        setStages(sData.stages || []);
      }
      if (appsRes.ok) {
        const aData = await appsRes.json();
        setApplications(aData.applications || []);
        if (aData.stageCounts) {
          setStageCounts(aData.stageCounts);
        }
      }
      if (assessRes.ok) {
        const assData = await assessRes.json();
        setAssessments(assData.assessments || []);
      }
      if (intRes.ok) {
        const iData = await intRes.json();
        setInterviews(iData.interviews || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordScore = async () => {
    if (!selectedAssessmentCandidate || isSavingScore) return;
    setIsSavingScore(true);
    try {
      const res = await fetch("/api/recruiter/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveId: selectedDriveId,
          applicationId: selectedAssessmentCandidate.id,
          studentId: selectedAssessmentCandidate.studentId,
          studentName: selectedAssessmentCandidate.studentName,
          stageId: stages[1]?.id || "stage_assessment",
          maxScore: 100,
          passingScore: stages[1]?.passingScore || 75,
          candidateScore: parseFloat(assessmentScoreInput),
        }),
      });

      if (res.ok) {
        success(`Assessment score (${assessmentScoreInput}/100) saved for ${selectedAssessmentCandidate.studentName}`);
        setIsScoreModalOpen(false);
        fetchDriveStagesAndData(selectedDriveId, debouncedSearch);
      } else {
        const data = await res.json();
        toastError(data.error || "Failed saving assessment score.");
      }
    } catch (err) {
      toastError("Failed saving assessment score.");
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleRecordEvaluation = async () => {
    if (!selectedEvalInterview || isSavingEval) return;
    setIsSavingEval(true);
    try {
      const res = await fetch(`/api/recruiter/interviews/${selectedEvalInterview.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicalScore: techScore,
          communicationScore: commScore,
          overallScore,
          feedback: evalFeedback,
          recommendation: evalRecommendation,
        }),
      });

      if (res.ok) {
        success(`Evaluation recorded for ${selectedEvalInterview.candidateName}`);
        setIsEvalModalOpen(false);
        fetchDriveStagesAndData(selectedDriveId, debouncedSearch);
      } else {
        const data = await res.json();
        toastError(data.error || "Failed recording evaluation.");
      }
    } catch (err) {
      toastError("Failed recording evaluation.");
    } finally {
      setIsSavingEval(false);
    }
  };

  const handleAdvanceStage = async (app: RecruitmentApplication, nextStage: RecruitmentStage) => {
    if (isAdvancing[app.id]) return;

    setIsAdvancing((prev) => ({ ...prev, [app.id]: true }));
    try {
      const idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `adv_${Date.now()}_${app.id}`;
      const res = await fetch(`/api/recruiter/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "IN_SELECTION",
          nextStageId: nextStage.id,
          expectedVersion: app.version,
          idempotencyKey,
          notes: `Advanced to ${nextStage.name}`,
        }),
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        success(`Candidate ${app.studentName} successfully advanced to ${nextStage.name}`);
        fetchDriveStagesAndData(selectedDriveId, debouncedSearch);
      } else if (res.status === 409) {
        info(resData.error || "Concurrent update conflict. Refreshing latest candidate state...");
        fetchDriveStagesAndData(selectedDriveId, debouncedSearch);
      } else if (res.status === 422) {
        toastError(resData.error || "Candidate does not satisfy stage qualification criteria.");
      } else {
        toastError(resData.error || "Failed advancing candidate.");
      }
    } catch (err) {
      toastError("Network error while advancing candidate.");
    } finally {
      setIsAdvancing((prev) => ({ ...prev, [app.id]: false }));
    }
  };

  const activeDrive = drives.find((d) => d.id === selectedDriveId);

  return (
    <RoleGuard allowedRole="recruiter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Stage Selection Pipeline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Selection Stages & Evaluations
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Coordinate multi-round assessments, log interviewer scores, and track candidate stage advancements.
            </p>
          </div>

          {/* Drive Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedDriveId}
              onChange={(e) => setSelectedDriveId(e.target.value)}
              className="h-9 px-3 text-xs font-bold rounded-xl bg-card border border-border focus:outline-none focus:border-blue-500"
            >
              {drives.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>

            <Link href={`/dashboard/recruiter/results?driveId=${selectedDriveId}`}>
              <Button variant="gradient" size="sm" leftIcon={<Award className="w-4 h-4" />}>
                View Merit & Results
              </Button>
            </Link>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-muted/60 border border-border w-fit text-xs font-bold">
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === "pipeline"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Visual Stage Pipeline
          </button>
          <button
            onClick={() => setActiveTab("assessments")}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === "assessments"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Assessment Test Scores
          </button>
          <button
            onClick={() => setActiveTab("evaluations")}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === "evaluations"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Interview Evaluations
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name or university..."
              className="w-full h-9 pl-9 pr-4 text-xs rounded-xl bg-muted/40 border border-border focus:outline-none focus:border-blue-500 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-auto">
            {isLoading && (
              <span className="flex items-center gap-1.5 text-blue-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Updating pipeline...</span>
              </span>
            )}
            <span className="font-mono text-[11px] bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
              {applications.length} candidates loaded
            </span>
          </div>
        </div>

        {/* TAB 1: Visual Stage Pipeline Kanban */}
        {activeTab === "pipeline" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stages.map((stage, idx) => {
              const stageApps = applications.filter(
                (a) => a.currentStageId === stage.id || (!a.currentStageId && idx === 0)
              );
              const stageTotalCount = stageCounts[stage.id] !== undefined ? stageCounts[stage.id] : stageApps.length;
              const nextStage = stages[idx + 1];

              return (
                <Card
                  key={stage.id}
                  className="p-4 bg-card border-border/80 flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                          {stage.order}
                        </div>
                        <h2 className="font-extrabold text-xs text-foreground truncate">{stage.name}</h2>
                      </div>
                      <Badge variant="purple" size="sm" title={`${stageTotalCount} total candidates in this stage`}>
                        {stageTotalCount}
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {stage.description}
                    </p>

                    {/* Candidate list in this stage */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      {stageApps.length === 0 ? (
                        <div className="p-4 text-center text-[11px] text-muted-foreground rounded-xl bg-muted/30">
                          {debouncedSearch ? "No matching candidates." : "No candidates in this round."}
                        </div>
                      ) : (
                        stageApps.map((app) => (
                          <div
                            key={app.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar src={app.studentAvatar} alt={app.studentName} size="sm" />
                                <div>
                                  <div className="font-bold text-foreground">{app.studentName}</div>
                                  <div className="text-[10px] text-muted-foreground">{app.university}</div>
                                </div>
                              </div>
                            </div>

                            {/* Score pill if available */}
                            {(app.assessmentScore !== undefined || app.interviewScore !== undefined) && (
                              <div className="flex gap-2 text-[10px] font-mono">
                                {app.assessmentScore !== undefined && (
                                  <span className="text-blue-600 dark:text-blue-400">
                                    Test: {app.assessmentScore}/100
                                  </span>
                                )}
                                {app.interviewScore !== undefined && (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    Interview: {app.interviewScore}/100
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Advance stage button */}
                            {nextStage && (
                              <button
                                disabled={isAdvancing[app.id]}
                                onClick={() => handleAdvanceStage(app, nextStage)}
                                className={`w-full h-7 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                                  isAdvancing[app.id]
                                    ? "bg-blue-600/60 text-white/80 cursor-wait"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                                }`}
                              >
                                {isAdvancing[app.id] ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Advancing...</span>
                                  </>
                                ) : (
                                  <>
                                    Advance to Stage {nextStage.order} <ArrowRight className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* TAB 2: Assessment Test Scores */}
        {activeTab === "assessments" && (
          <Card className="p-5 border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Candidate Assessment Scores</h2>
                <p className="text-xs text-muted-foreground">
                  Record test marks, verify algorithmic benchmarks, and determine qualification.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Candidate</th>
                    <th className="px-4 py-3 font-semibold">Assessment Title</th>
                    <th className="px-4 py-3 font-semibold">Max Score</th>
                    <th className="px-4 py-3 font-semibold">Passing Threshold</th>
                    <th className="px-4 py-3 font-semibold">Recorded Score</th>
                    <th className="px-4 py-3 font-semibold">Pass / Fail</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {applications.map((app) => {
                    const record = assessments.find((a) => a.applicationId === app.id);
                    const score = app.assessmentScore ?? record?.candidateScore;
                    const passing = stages[1]?.passingScore || 75;
                    const isPassed = score !== undefined ? score >= passing : undefined;

                    return (
                      <tr key={app.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar src={app.studentAvatar} alt={app.studentName} size="sm" />
                            <div>
                              <div className="font-bold text-foreground">{app.studentName}</div>
                              <div className="text-[11px] text-muted-foreground">{app.university}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {record?.assessmentName || "Technical Assessment Test"}
                        </td>
                        <td className="px-4 py-3.5 text-foreground font-mono">100</td>
                        <td className="px-4 py-3.5 text-foreground font-mono">{passing}%</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                          {score !== undefined ? `${score} / 100` : "Not Entered"}
                        </td>
                        <td className="px-4 py-3.5">
                          {score !== undefined ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isPassed
                                  ? "bg-emerald-500/10 text-emerald-600 border border-blue-500/30"
                                  : "bg-primary/10 text-rose-600 border border-rose-500/30"
                              }`}
                            >
                              {isPassed ? "PASS" : "FAIL"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSelectedAssessmentCandidate(app);
                              setAssessmentScoreInput(score ? String(score) : "85");
                              setIsScoreModalOpen(true);
                            }}
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            {score !== undefined ? "Edit Score" : "Log Score"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: Interview Evaluations */}
        {activeTab === "evaluations" && (
          <Card className="p-5 border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Interview Evaluations Matrix</h2>
                <p className="text-xs text-muted-foreground">
                  Review technical competency, communication rating, overall score, and hiring recommendations.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Candidate</th>
                    <th className="px-4 py-3 font-semibold">Interview Schedule</th>
                    <th className="px-4 py-3 font-semibold">Technical Score</th>
                    <th className="px-4 py-3 font-semibold">Communication</th>
                    <th className="px-4 py-3 font-semibold">Overall Rating</th>
                    <th className="px-4 py-3 font-semibold">Recommendation</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {interviews.map((int) => (
                    <tr key={int.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar src={int.candidateAvatar} alt={int.candidateName} size="sm" />
                          <div>
                            <div className="font-bold text-foreground">{int.candidateName}</div>
                            <div className="text-[11px] text-muted-foreground">{int.candidateUniversity}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-foreground font-medium">
                        <div>{int.date} at {int.time}</div>
                        <div className="text-[11px] text-muted-foreground">By: {int.interviewerName}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                        {int.evaluation ? `${int.evaluation.technicalScore}/100` : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                        {int.evaluation ? `${int.evaluation.communicationScore}/100` : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {int.evaluation ? `${int.evaluation.overallScore}/100` : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        {int.evaluation ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              int.evaluation.recommendation === "RECOMMEND"
                                ? "bg-emerald-500/10 text-emerald-600 border border-blue-500/30"
                                : int.evaluation.recommendation === "HOLD"
                                ? "bg-amber-500/10 text-amber-600 border border-blue-500/30"
                                : "bg-primary/10 text-rose-600 border border-rose-500/30"
                            }`}
                          >
                            {int.evaluation.recommendation}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Pending Evaluation</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedEvalInterview(int);
                            if (int.evaluation) {
                              setTechScore(int.evaluation.technicalScore);
                              setCommScore(int.evaluation.communicationScore);
                              setOverallScore(int.evaluation.overallScore);
                              setEvalFeedback(int.evaluation.feedback);
                              setEvalRecommendation(int.evaluation.recommendation);
                            }
                            setIsEvalModalOpen(true);
                          }}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          {int.evaluation ? "Edit Eval" : "Evaluate"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Assessment Score Entry Modal */}
        <Modal
          isOpen={isScoreModalOpen}
          onClose={() => setIsScoreModalOpen(false)}
          title={`Log Assessment Score: ${selectedAssessmentCandidate?.studentName}`}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Score Marks (0 - 100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={assessmentScoreInput}
                onChange={(e) => setAssessmentScoreInput(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl bg-card border border-border focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <span>Passing threshold: <strong>{stages[1]?.passingScore || 75}%</strong></span>
              <span>
                Status:{" "}
                <strong className={parseFloat(assessmentScoreInput) >= (stages[1]?.passingScore || 75) ? "text-emerald-600" : "text-rose-600"}>
                  {parseFloat(assessmentScoreInput) >= (stages[1]?.passingScore || 75) ? "PASSED" : "FAILED"}
                </strong>
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setIsScoreModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" isLoading={isSavingScore} onClick={handleRecordScore}>
                Save Score
              </Button>
            </div>
          </div>
        </Modal>

        {/* Interview Evaluation Modal */}
        <Modal
          isOpen={isEvalModalOpen}
          onClose={() => setIsEvalModalOpen(false)}
          title={`Interview Evaluation: ${selectedEvalInterview?.candidateName}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Technical (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={techScore}
                  onChange={(e) => setTechScore(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Communication (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commScore}
                  onChange={(e) => setCommScore(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Overall (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overallScore}
                  onChange={(e) => setOverallScore(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Hiring Recommendation</label>
              <select
                value={evalRecommendation}
                onChange={(e) => setEvalRecommendation(e.target.value as any)}
                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border"
              >
                <option value="RECOMMEND">RECOMMEND (Hire)</option>
                <option value="HOLD">HOLD (Waitlist review)</option>
                <option value="NOT_RECOMMEND">NOT RECOMMEND (Reject)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Interviewer Feedback</label>
              <textarea
                rows={3}
                value={evalFeedback}
                onChange={(e) => setEvalFeedback(e.target.value)}
                placeholder="Detailed notes on algorithmic depth, system thinking, and communication..."
                className="w-full p-2.5 text-xs rounded-xl bg-card border border-border"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setIsEvalModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="gradient" size="sm" isLoading={isSavingEval} onClick={handleRecordEvaluation}>
                Submit Evaluation
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </RoleGuard>
  );
}
