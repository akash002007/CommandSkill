import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import {
  getStagesForDrive,
  saveStagesForDrive,
  logRecruiterAction,
  getRecruitmentDriveById,
} from "@/lib/recruitment-store";
import { RecruitmentStage } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const stages = getStagesForDrive(id);
    return NextResponse.json({ success: true, stages });
  } catch (err) {
    console.error("[GET /api/recruiter/drives/[id]/stages] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const drive = getRecruitmentDriveById(id);
    if (!drive) {
      return NextResponse.json({ error: "Drive not found." }, { status: 404 });
    }

    const body = await request.json();
    const { stages } = body as { stages: RecruitmentStage[] };

    if (!stages || !Array.isArray(stages)) {
      return NextResponse.json({ error: "Valid stages array is required." }, { status: 400 });
    }

    const updated = saveStagesForDrive(id, stages);

    logRecruiterAction({
      driveId: id,
      driveTitle: drive.title,
      actorId: auth.recruiter.id,
      actorName: auth.recruiter.name || "Barun",
      actorRole: "RECRUITER",
      action: "STAGES_UPDATED",
      targetType: "STAGE",
      targetId: id,
      targetName: drive.title,
      details: `Updated selection stages sequence (${stages.length} stages configured).`,
    });

    return NextResponse.json({ success: true, stages: updated });
  } catch (err) {
    console.error("[PUT /api/recruiter/drives/[id]/stages] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
