import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import {
  getApplications,
  getPaginatedApplications,
  getDriveStageCounts,
  saveApplication,
  getRecruitmentDriveById,
  getStagesForDrive,
  logRecruiterAction,
} from "@/lib/recruitment-store";
import { authorizeResourceAccess } from "@/lib/authorization";
import { evaluateCandidateEligibility } from "@/lib/eligibility-engine";
import { RecruitmentApplication } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const driveId = searchParams.get("driveId") || "all";
    const status = searchParams.get("status") || "all";
    const eligibilityStatus = searchParams.get("eligibilityStatus") || "all";
    const stageId = searchParams.get("stageId") || "all";
    const search = searchParams.get("search") || "";
    const page = searchParams.has("page") ? parseInt(searchParams.get("page")!, 10) : undefined;
    const pageSize = searchParams.has("pageSize")
      ? parseInt(searchParams.get("pageSize")!, 10)
      : searchParams.has("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;
    const sortBy = searchParams.get("sortBy") as any;
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    // Multi-tenant check if a specific drive is requested
    if (driveId && driveId !== "all") {
      const drive = getRecruitmentDriveById(driveId);
      if (!drive) {
        return NextResponse.json({ error: "Recruitment drive not found." }, { status: 404 });
      }
      const driveCompanyId =
        drive.companyId || (drive.company.toLowerCase() === "stripe" ? "comp_stripe" : "comp_openai");
      const isAuthorized = authorizeResourceAccess(auth.recruiter, { companyId: driveCompanyId });
      if (!isAuthorized) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to view applications for this recruitment drive." },
          { status: 403 }
        );
      }
    }

    // If client requested pagination or stageId filtering
    if (page !== undefined || pageSize !== undefined || stageId !== "all") {
      const paginated = getPaginatedApplications({
        driveId,
        status,
        eligibilityStatus,
        stageId,
        search,
        page: page || 1,
        pageSize: pageSize || 20,
        sortBy,
        sortOrder,
      });

      return NextResponse.json({
        success: true,
        applications: paginated.applications,
        totalCount: paginated.totalCount,
        page: paginated.page,
        pageSize: paginated.pageSize,
        totalPages: paginated.totalPages,
        stageCounts: paginated.stageCounts,
      });
    }

    // Default legacy response with stageCounts aggregate
    const applications = getApplications({
      driveId,
      status,
      eligibilityStatus,
      stageId,
      search,
    });

    const stageCounts = driveId !== "all" ? getDriveStageCounts(driveId) : undefined;

    return NextResponse.json({
      success: true,
      applications,
      totalCount: applications.length,
      stageCounts,
    });
  } catch (err) {
    console.error("[GET /api/recruiter/applications] Error:", err);
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
      studentId,
      studentName,
      studentEmail,
      studentAvatar,
      university,
      degree,
      branch,
      graduationYear,
      cgpa,
      backlogs,
      skills,
      resumeUrl,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
    } = body;

    if (!driveId || !studentName) {
      return NextResponse.json(
        { error: "driveId and studentName are required." },
        { status: 400 }
      );
    }

    const drive = getRecruitmentDriveById(driveId);
    if (!drive) {
      return NextResponse.json({ error: "Recruitment drive not found." }, { status: 404 });
    }

    // Multi-tenant company verification
    const driveCompanyId =
      drive.companyId || (drive.company.toLowerCase() === "stripe" ? "comp_stripe" : "comp_openai");
    const isAuthorized = authorizeResourceAccess(auth.recruiter, { companyId: driveCompanyId });
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to create applications for this recruitment drive." },
        { status: 403 }
      );
    }

    // Duplicate application check to maintain integrity
    const existingApps = getApplications({ driveId });
    const isDuplicate = existingApps.some(
      (a) => (studentId && a.studentId === studentId) || (studentEmail && a.studentEmail.toLowerCase() === studentEmail.toLowerCase())
    );
    if (isDuplicate) {
      return NextResponse.json(
        { error: `Candidate ${studentName} already has an active application for this recruitment drive.` },
        { status: 409 }
      );
    }

    const stages = getStagesForDrive(driveId);
    const firstStage = stages[0] || {
      id: `stage_${driveId}_1`,
      name: "Screening",
      type: "SCREENING",
    };

    // Deterministic eligibility evaluation
    const studentData = {
      id: studentId || `student_${Date.now()}`,
      name: studentName,
      email: studentEmail || "",
      university: university || "University",
      degree: degree || "B.Tech",
      branch: branch || "Computer Science",
      graduationYear: Number(graduationYear) || 2026,
      cgpa: String(cgpa || "3.8"),
      backlogs: Number(backlogs) || 0,
      skills: Array.isArray(skills) ? skills : ["TypeScript", "React"],
    };

    const eligibilityResult = evaluateCandidateEligibility(studentData as any, drive.eligibilityCriteria);

    const newApp: RecruitmentApplication = {
      id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      driveId,
      driveTitle: drive.title,
      company: drive.company,
      studentId: studentData.id,
      studentName: studentData.name,
      studentEmail: studentData.email,
      studentAvatar:
        studentAvatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      university: studentData.university,
      degree: studentData.degree,
      branch: studentData.branch,
      graduationYear: studentData.graduationYear,
      cgpa: studentData.cgpa,
      backlogs: studentData.backlogs,
      skills: studentData.skills,
      resumeUrl: resumeUrl || "#",
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      status: eligibilityResult.status === "ELIGIBLE" ? "ELIGIBLE" : "ELIGIBILITY_FAILED",
      eligibility: eligibilityResult,
      currentStageId: firstStage.id,
      currentStageName: firstStage.name,
      currentStageType: firstStage.type,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          stageId: firstStage.id,
          stageName: firstStage.name,
          status: "SUBMITTED",
          timestamp: new Date().toISOString(),
          actor: studentData.name,
          note: "Application submitted.",
        },
        {
          stageId: firstStage.id,
          stageName: firstStage.name,
          status: eligibilityResult.status,
          timestamp: new Date().toISOString(),
          actor: "Eligibility Engine",
          note: `Automated evaluation: ${eligibilityResult.passedCount}/${eligibilityResult.totalCount} criteria passed.`,
        },
      ],
    };

    saveApplication(newApp);

    logRecruiterAction({
      driveId,
      driveTitle: drive.title,
      actorId: studentData.id,
      actorName: studentData.name,
      actorRole: "STUDENT",
      action: "APPLICATION_SUBMITTED",
      targetType: "APPLICATION",
      targetId: newApp.id,
      targetName: studentData.name,
      newState: newApp.status,
      details: `Application submitted. Eligibility result: ${newApp.eligibility.status} (${newApp.eligibility.passedCount}/${newApp.eligibility.totalCount} criteria passed).`,
    });

    return NextResponse.json({ success: true, application: newApp });
  } catch (err) {
    console.error("[POST /api/recruiter/applications] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
