import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import { recordInterviewEvaluation } from "@/lib/recruitment-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      technicalScore,
      communicationScore,
      overallScore,
      feedback,
      recommendation,
    } = body;

    if (
      technicalScore === undefined ||
      communicationScore === undefined ||
      overallScore === undefined
    ) {
      return NextResponse.json(
        { error: "technicalScore, communicationScore, and overallScore are required." },
        { status: 400 }
      );
    }

    const updatedInterview = recordInterviewEvaluation(id, {
      technicalScore: Number(technicalScore),
      communicationScore: Number(communicationScore),
      overallScore: Number(overallScore),
      feedback: feedback?.trim() || "Candidate performed well across all evaluation metrics.",
      recommendation: recommendation || "RECOMMEND",
      evaluatedAt: new Date().toISOString(),
      evaluatorName: auth.recruiter.name || "Barun",
    });

    if (!updatedInterview) {
      return NextResponse.json({ error: "Interview record not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, interview: updatedInterview });
  } catch (err) {
    console.error("[POST /api/recruiter/interviews/[id]/evaluate] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
