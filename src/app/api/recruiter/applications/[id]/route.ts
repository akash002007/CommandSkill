import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import {
  getApplicationById,
  getRecruitmentDriveById,
  updateApplicationStatusAtomic,
  recordManualEligibilityOverride,
} from "@/lib/recruitment-store";
import { authorizeResourceAccess } from "@/lib/authorization";

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
    const application = getApplicationById(id);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    // Multi-tenant company verification
    const targetDrive = getRecruitmentDriveById(application.driveId);
    const driveCompanyId =
      targetDrive?.companyId || (targetDrive?.company.toLowerCase() === "stripe" ? "comp_stripe" : "comp_openai");
    const isAuthorized = authorizeResourceAccess(auth.recruiter, { companyId: driveCompanyId });
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to view this candidate application." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, application });
  } catch (err) {
    console.error("[GET /api/recruiter/applications/[id]] Error:", err);
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
    const application = getApplicationById(id);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    // Multi-tenant company verification
    const targetDrive = getRecruitmentDriveById(application.driveId);
    const driveCompanyId =
      targetDrive?.companyId || (targetDrive?.company.toLowerCase() === "stripe" ? "comp_stripe" : "comp_openai");
    const isAuthorized = authorizeResourceAccess(auth.recruiter, { companyId: driveCompanyId });
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to modify this candidate application." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, notes, nextStageId, isOverride, overrideReason, expectedVersion } = body;
    const idempotencyKey = request.headers.get("x-idempotency-key") || body.idempotencyKey;

    if (isOverride && overrideReason) {
      const updated = recordManualEligibilityOverride(
        id,
        status || "ELIGIBLE",
        overrideReason,
        auth.recruiter.name || "Barun"
      );
      if (!updated) {
        return NextResponse.json({ error: "Failed to apply manual override." }, { status: 400 });
      }
      return NextResponse.json({ success: true, application: updated });
    }

    // Atomic stage transition execution with rule validation & OCC
    const transitionResult = updateApplicationStatusAtomic(id, status || application.status, {
      actorId: auth.recruiter.id,
      actorName: auth.recruiter.name || "Barun",
      notes,
      nextStageId,
      expectedVersion: expectedVersion !== undefined ? Number(expectedVersion) : undefined,
      idempotencyKey,
      isOverride: Boolean(isOverride),
      overrideReason,
    });

    if (!transitionResult.success) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        CONFLICT: 409,
        INVALID_TRANSITION: 400,
        PREREQUISITE_FAILED: 422,
        UNAUTHORIZED: 403,
      };
      const httpStatus = statusMap[transitionResult.errorCode || ""] || 400;
      return NextResponse.json(
        {
          error: transitionResult.error,
          errorCode: transitionResult.errorCode,
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json({ success: true, application: transitionResult.application });
  } catch (err) {
    console.error("[PATCH /api/recruiter/applications/[id]] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
