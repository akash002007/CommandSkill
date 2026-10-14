import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import {
  getRecruitmentResults,
  publishRecruitmentResults,
} from "@/lib/recruitment-store";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const driveId = searchParams.get("driveId");

    if (!driveId) {
      return NextResponse.json({ error: "driveId query parameter is required." }, { status: 400 });
    }

    const results = getRecruitmentResults(driveId);
    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("[GET /api/recruiter/results] Error:", err);
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
    const { driveId, finalRoster } = body;

    if (!driveId || !finalRoster || !Array.isArray(finalRoster)) {
      return NextResponse.json(
        { error: "driveId and finalRoster array are required." },
        { status: 400 }
      );
    }

    const publisherName = auth.recruiter.name || "Barun";
    const publishedResult = publishRecruitmentResults(driveId, publisherName, finalRoster);

    if (!publishedResult) {
      return NextResponse.json({ error: "Failed to publish recruitment results." }, { status: 500 });
    }

    return NextResponse.json({ success: true, results: publishedResult });
  } catch (err) {
    console.error("[POST /api/recruiter/results] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
