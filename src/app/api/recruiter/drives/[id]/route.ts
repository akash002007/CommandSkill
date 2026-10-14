import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import {
  getRecruitmentDriveById,
  saveRecruitmentDrive,
  deleteRecruitmentDrive,
  logRecruiterAction,
} from "@/lib/recruitment-store";

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
    const drive = getRecruitmentDriveById(id);
    if (!drive) {
      return NextResponse.json({ error: "Recruitment drive not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, drive });
  } catch (err) {
    console.error("[GET /api/recruiter/drives/[id]] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
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
      return NextResponse.json({ error: "Recruitment drive not found." }, { status: 404 });
    }

    const body = await request.json();
    const previousStatus = drive.status;

    // Apply updates
    Object.assign(drive, body);
    drive.updatedAt = new Date().toISOString();

    saveRecruitmentDrive(drive);

    logRecruiterAction({
      driveId: drive.id,
      driveTitle: drive.title,
      actorId: auth.recruiter.id,
      actorName: auth.recruiter.name || "Barun",
      actorRole: "RECRUITER",
      action: body.status && body.status !== previousStatus ? `DRIVE_STATUS_${body.status}` : "DRIVE_UPDATED",
      targetType: "DRIVE",
      targetId: drive.id,
      targetName: drive.title,
      previousState: previousStatus,
      newState: drive.status,
      details: `Updated recruitment drive "${drive.title}". Current status: ${drive.status}.`,
    });

    return NextResponse.json({ success: true, drive });
  } catch (err) {
    console.error("[PATCH /api/recruiter/drives/[id]] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json({ error: "Recruitment drive not found." }, { status: 404 });
    }

    deleteRecruitmentDrive(id);

    logRecruiterAction({
      driveId: id,
      driveTitle: drive.title,
      actorId: auth.recruiter.id,
      actorName: auth.recruiter.name || "Barun",
      actorRole: "RECRUITER",
      action: "DRIVE_DELETED",
      targetType: "DRIVE",
      targetId: id,
      targetName: drive.title,
      previousState: drive.status,
      newState: "DELETED",
      details: `Deleted recruitment drive "${drive.title}".`,
    });

    return NextResponse.json({ success: true, message: "Drive deleted successfully." });
  } catch (err) {
    console.error("[DELETE /api/recruiter/drives/[id]] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
