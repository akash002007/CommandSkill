import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import {
  getAssessments,
  saveAssessmentRecord,
} from "@/lib/recruitment-store";
import {
  getAssessmentConfigs,
  saveAssessmentConfig,
} from "@/lib/assessment-engine";
import { CandidateAssessmentRecord } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const driveId = searchParams.get("driveId") || "all";
    const mode = searchParams.get("mode"); // "configs" vs default/legacy
    const status = searchParams.get("status") || "ALL";
    const search = searchParams.get("search") || "";

    // If requesting assessment configurations (for Recruiter Assessment Dashboard)
    if (mode === "configs" || searchParams.has("configs") || !searchParams.has("driveId") || driveId === "all") {
      const configs = getAssessmentConfigs(
        {
          driveId: driveId !== "all" ? driveId : undefined,
          status,
          search,
        },
        auth.recruiter
      );

      // Also provide legacy assessments for backward compatibility
      const assessments = getAssessments(driveId);

      return NextResponse.json({
        success: true,
        configs,
        assessments,
        totalConfigs: configs.length,
      });
    }

    // Default legacy behavior for Selection Process page
    const assessments = getAssessments(driveId);
    return NextResponse.json({ success: true, assessments });
  } catch (err) {
    console.error("[GET /api/recruiter/assessments] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await request.json();

    // Check if this is an Assessment Configuration (title + driveId)
    if (body.title && body.driveId) {
      const result = saveAssessmentConfig(body, auth.recruiter);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, assessment: result.assessment });
    }

    // Legacy CandidateAssessmentRecord creation
    const {
      id,
      driveId,
      applicationId,
      studentId,
      studentName,
      stageId,
      assessmentName,
      instructions,
      date,
      time,
      duration,
      maxScore,
      passingScore,
      candidateScore,
    } = body;

    if (!driveId || !applicationId || !studentName) {
      return NextResponse.json(
        { error: "driveId, applicationId, and studentName are required." },
        { status: 400 }
      );
    }

    const max = Number(maxScore) || 100;
    const passing = Number(passingScore) || 75;
    const score = candidateScore !== undefined && candidateScore !== null ? Number(candidateScore) : undefined;
    const isPassed = score !== undefined ? score >= passing : undefined;

    const record: CandidateAssessmentRecord = {
      id: id || `assess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      driveId,
      applicationId,
      studentId: studentId || "student",
      studentName,
      stageId: stageId || "stage_assessment",
      assessmentName: assessmentName || "Technical Assessment Test",
      instructions: instructions || "Complete the scheduled exam within the allotted duration.",
      date: date || new Date().toISOString().slice(0, 10),
      time: time || "14:00 PST",
      duration: duration || "90 mins",
      maxScore: max,
      passingScore: passing,
      candidateScore: score,
      passed: isPassed,
      evaluatedBy: auth.recruiter.name || "Barun",
      evaluatedAt: score !== undefined ? new Date().toISOString() : undefined,
    };

    saveAssessmentRecord(record);
    return NextResponse.json({ success: true, assessment: record });
  } catch (err) {
    console.error("[POST /api/recruiter/assessments] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

