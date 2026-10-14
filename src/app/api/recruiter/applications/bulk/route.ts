import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import { authorizeResourceAccess } from "@/lib/authorization";
import {
  getApplicationById,
  getRecruitmentDriveById,
  updateApplicationStatusAtomic,
  logRecruiterAction,
} from "@/lib/recruitment-store";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { applicationIds, action, targetStageId, reason } = body as {
      applicationIds: string[];
      action: "SHORTLIST" | "REJECT" | "MOVE_STAGE";
      targetStageId?: string;
      reason?: string;
    };

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: "applicationIds array is required." }, { status: 400 });
    }

    const updatedApps = [];
    const failedApps: { id: string; error: string }[] = [];
    const actorName = auth.recruiter.name || "Recruiter";

    for (const id of applicationIds) {
      const existing = getApplicationById(id);
      if (!existing) {
        failedApps.push({ id, error: "Application not found" });
        continue;
      }

      const drive = getRecruitmentDriveById(existing.driveId);
      const driveCompanyId =
        drive?.companyId || (drive?.company.toLowerCase() === "stripe" ? "comp_stripe" : "comp_openai");
      if (!authorizeResourceAccess(auth.recruiter, { companyId: driveCompanyId })) {
        failedApps.push({ id, error: "Forbidden: Unauthorized recruitment drive access" });
        continue;
      }

      let result;
      if (action === "SHORTLIST") {
        result = updateApplicationStatusAtomic(id, "SHORTLISTED", {
          actorId: auth.recruiter.id,
          actorName,
          notes: reason || "Bulk shortlisted",
        });
      } else if (action === "REJECT") {
        result = updateApplicationStatusAtomic(id, "REJECTED", {
          actorId: auth.recruiter.id,
          actorName,
          notes: reason || "Bulk rejected",
        });
      } else if (action === "MOVE_STAGE") {
        result = updateApplicationStatusAtomic(id, "IN_SELECTION", {
          actorId: auth.recruiter.id,
          actorName,
          notes: reason || "Bulk stage transition",
          nextStageId: targetStageId,
        });
      }

      if (result && result.success && result.application) {
        updatedApps.push(result.application);
      } else {
        failedApps.push({ id, error: result?.error || "Failed to update" });
      }
    }

    logRecruiterAction({
      actorId: auth.recruiter.id,
      actorName,
      actorRole: "RECRUITER",
      action: `BULK_${action}`,
      targetType: "APPLICATION",
      targetId: "BULK_SELECTION",
      details: `Bulk ${action} executed for ${updatedApps.length} candidate(s). Failed: ${failedApps.length}. Reason: ${reason || "N/A"}`,
    });

    return NextResponse.json({
      success: true,
      processedCount: updatedApps.length,
      failedCount: failedApps.length,
      applications: updatedApps,
      failures: failedApps,
    });
  } catch (err) {
    console.error("[POST /api/recruiter/applications/bulk] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
