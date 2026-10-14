import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedStudent } from "@/lib/supabase/server";
import {
  getStudentAssessments,
  getRecruitmentDriveById,
} from "@/lib/recruitment-store";
import {
  getAssessmentConfigs,
  getAssessmentAttempt,
} from "@/lib/assessment-engine";
import { AssessmentRecord } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedStudent(request);
    if (!auth.student) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }
    const student = auth.student;
    const studentId = student.id;

    const legacyAssessments = getStudentAssessments(studentId);

    // Also find any AssessmentRecord assigned to this candidate
    const allConfigs = getAssessmentConfigs();
    const assignedConfigs = allConfigs.filter((cfg: AssessmentRecord) =>
      cfg.assignedCandidateIds.includes(studentId) ||
      cfg.assignedCandidateIds.includes("student") ||
      cfg.assignedCandidateIds.includes("student_123")
    );

    // Merge & enrich
    const enrichedList: any[] = [];

    assignedConfigs.forEach((cfg: AssessmentRecord) => {
      const drive = getRecruitmentDriveById(cfg.driveId);
      const attempt = getAssessmentAttempt(cfg.id, studentId);
      const legacyAss = legacyAssessments.find(
        (l) => l.id === cfg.id || (l.driveId === cfg.driveId && l.assessmentName === cfg.title)
      );

      const candidateScore = attempt?.totalScore !== undefined
        ? attempt.totalScore
        : legacyAss?.candidateScore;

      const baseMaxScore = legacyAss?.maxScore && legacyAss.maxScore > 0
        ? legacyAss.maxScore
        : cfg.totalMarks && cfg.totalMarks > 0
        ? cfg.totalMarks
        : 100;

      const passingScore = legacyAss?.passingScore !== undefined
        ? legacyAss.passingScore
        : cfg.passingMarks && cfg.passingMarks <= baseMaxScore
        ? cfg.passingMarks
        : Math.round(baseMaxScore * 0.75);

      const maxScore = Math.max(baseMaxScore, candidateScore || 0, passingScore || 0);
      const passingPercentage = Math.round((passingScore / maxScore) * 100);

      const percentage = candidateScore !== undefined && maxScore > 0
        ? Math.min(100, Math.max(0, Math.round((candidateScore / maxScore) * 100)))
        : undefined;

      const passed = attempt?.passed !== undefined
        ? attempt.passed
        : legacyAss?.passed !== undefined
        ? legacyAss.passed
        : candidateScore !== undefined
        ? candidateScore >= passingScore
        : false;

      enrichedList.push({
        id: cfg.id,
        assessmentConfigId: cfg.id,
        driveId: cfg.driveId,
        driveTitle: cfg.driveTitle || drive?.title || "Recruitment Drive",
        company: cfg.companyName || drive?.company || "Company",
        companyLogo: drive?.companyLogo,
        assessmentName: cfg.title,
        description: cfg.description,
        instructions: cfg.instructions,
        duration: `${cfg.durationMinutes} mins`,
        durationMinutes: cfg.durationMinutes,
        maxScore,
        passingScore,
        passingPercentage,
        questionCount: cfg.questionSnapshots?.length || 0,
        mode: cfg.mode,
        category: cfg.category,
        candidateScore,
        percentage,
        passed,
        attemptStatus: attempt?.status || (candidateScore !== undefined ? "SUBMITTED" : "NOT_STARTED"),
        attemptId: attempt?.id,
        date: cfg.startDateTime ? cfg.startDateTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
        time: "Online Proctored",
        startDateTime: cfg.startDateTime,
        endDateTime: cfg.endDateTime,
        hasFullProctoring: cfg.mode === "PROCTORED",
        proctoringConfig: cfg.proctoringConfig,
        candidateRules: cfg.candidateRules,
      });
    });

    // Also include any legacy assessment records not already matched
    legacyAssessments.forEach((ass) => {
      if (!enrichedList.some((e) => e.driveId === ass.driveId && e.assessmentName === ass.assessmentName)) {
        const drive = getRecruitmentDriveById(ass.driveId);
        const candidateScore = ass.candidateScore;
        const maxScore = Math.max(
          ass.maxScore || 100,
          candidateScore || 0,
          ass.passingScore || 0
        );
        const passingScore = ass.passingScore && ass.passingScore <= maxScore
          ? ass.passingScore
          : Math.round(maxScore * 0.75);
        const passingPercentage = Math.round((passingScore / maxScore) * 100);

        const percentage = candidateScore !== undefined && maxScore > 0
          ? Math.min(100, Math.max(0, Math.round((candidateScore / maxScore) * 100)))
          : undefined;

        const passed = ass.passed !== undefined
          ? ass.passed
          : candidateScore !== undefined
          ? candidateScore >= passingScore
          : false;

        enrichedList.push({
          ...ass,
          driveTitle: drive?.title || "Recruitment Drive",
          company: drive?.company || "Company",
          companyLogo: drive?.companyLogo,
          maxScore,
          passingScore,
          passingPercentage,
          candidateScore,
          percentage,
          passed,
          questionCount: 5,
          attemptStatus: ass.candidateScore !== undefined ? "SUBMITTED" : "NOT_STARTED",
        });
      }
    });

    return NextResponse.json({
      success: true,
      assessments: enrichedList,
      totalCount: enrichedList.length,
    });
  } catch (err) {
    console.error("[GET /api/student/assessments] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

