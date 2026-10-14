import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import {
  getInterviews,
  saveInterviewRecord,
  getApplicationById,
  updateApplicationStatus,
} from "@/lib/recruitment-store";
import { CandidateInterviewRecord } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const driveId = searchParams.get("driveId") || "all";
    const status = searchParams.get("status") || "all";

    const interviews = getInterviews(driveId, status);
    return NextResponse.json({ success: true, interviews });
  } catch (err) {
    console.error("[GET /api/recruiter/interviews] Error:", err);
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
    const {
      driveId,
      applicationId,
      studentId,
      candidateName,
      candidateAvatar,
      candidateUniversity,
      driveTitle,
      stageId,
      type,
      date,
      time,
      duration,
      meetingLink,
      location,
      interviewerName,
      notes,
    } = body;

    if (!applicationId || !candidateName) {
      return NextResponse.json(
        { error: "applicationId and candidateName are required." },
        { status: 400 }
      );
    }

    const app = getApplicationById(applicationId);

    const record: CandidateInterviewRecord = {
      id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      driveId: driveId || app?.driveId || "drive_swe_2026",
      applicationId,
      studentId: studentId || app?.studentId || "student",
      candidateName,
      candidateAvatar: candidateAvatar || app?.studentAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      candidateUniversity: candidateUniversity || app?.university || "University",
      driveTitle: driveTitle || app?.driveTitle || "Recruitment Drive",
      stageId: stageId || app?.currentStageId || "stage_interview",
      type: type || "VIDEO",
      date: date || new Date().toISOString().slice(0, 10),
      time: time || "11:00 AM PST",
      duration: duration || "45 mins",
      meetingLink: meetingLink || "https://meet.google.com/stripe-sde-round3",
      location: location || "",
      interviewerName: interviewerName || auth.recruiter.name || "David K. (Staff Engineer)",
      status: "SCHEDULED",
      notes: notes || "",
      createdAt: new Date().toISOString(),
    };

    saveInterviewRecord(record);

    // Transition application to INTERVIEW stage if applicable
    if (app && app.status !== "SELECTED") {
      updateApplicationStatus(
        app.id,
        "IN_SELECTION",
        auth.recruiter.name || "Barun",
        `Interview scheduled for ${record.date} at ${record.time}`
      );
    }

    return NextResponse.json({ success: true, interview: record });
  } catch (err) {
    console.error("[POST /api/recruiter/interviews] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
