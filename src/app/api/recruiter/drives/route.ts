import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRecruiter } from "@/lib/supabase/server";
import {
  getRecruitmentDrives,
  saveRecruitmentDrive,
  logRecruiterAction,
  getStagesForDrive,
} from "@/lib/recruitment-store";
import { RecruitmentDrive } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedRecruiter(request);
    if (!auth.recruiter) {
      return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    let drives = getRecruitmentDrives();

    if (status !== "all") {
      drives = drives.filter((d) => d.status.toLowerCase() === status.toLowerCase());
    }

    if (search) {
      drives = drives.filter(
        (d) =>
          d.title.toLowerCase().includes(search) ||
          d.position.toLowerCase().includes(search) ||
          d.department.toLowerCase().includes(search) ||
          d.location.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ success: true, drives });
  } catch (err) {
    console.error("[GET /api/recruiter/drives] Error:", err);
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
      title,
      position,
      description,
      department,
      employmentType,
      workMode,
      location,
      openingsCount,
      salaryStipend,
      startDate,
      endDate,
      status,
      eligibilityCriteria,
      stages,
      stageWeights,
    } = body;

    if (!title || !position) {
      return NextResponse.json(
        { error: "Drive title and position are required." },
        { status: 400 }
      );
    }

    const driveId = `drive_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initialStages = stages && stages.length > 0 ? stages : getStagesForDrive(driveId);

    const newDrive: RecruitmentDrive = {
      id: driveId,
      title: title.trim(),
      position: position.trim(),
      description: description?.trim() || "",
      company: "Stripe",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      department: department?.trim() || "Engineering",
      employmentType: employmentType || "FULL_TIME",
      workMode: workMode || "HYBRID",
      location: location?.trim() || "San Francisco, CA",
      openingsCount: Number(openingsCount) || 1,
      salaryStipend: salaryStipend?.trim() || "Competitive",
      startDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: endDate || new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      status: status || "DRAFT",
      eligibilityCriteria: eligibilityCriteria || {
        degrees: ["B.Tech", "B.E.", "B.S. in Computer Science"],
        branches: ["Computer Science & Engineering", "Information Technology"],
        minCgpa: 3.5,
        maxBacklogs: 1,
        gradYears: [2025, 2026, 2027],
        freshersAllowed: true,
        requiredSkills: ["TypeScript", "React"],
        eligibleLocations: ["Remote"],
        remoteAllowed: true,
      },
      stages: initialStages,
      stageWeights: stageWeights || { assessmentWeight: 60, interviewWeight: 40 },
      applicantsCount: 0,
      eligibleCount: 0,
      shortlistedCount: 0,
      interviewsCount: 0,
      selectedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: auth.recruiter.id,
    };

    saveRecruitmentDrive(newDrive);

    logRecruiterAction({
      driveId: newDrive.id,
      driveTitle: newDrive.title,
      actorId: auth.recruiter.id,
      actorName: auth.recruiter.name || "Barun",
      actorRole: "RECRUITER",
      action: "DRIVE_CREATED",
      targetType: "DRIVE",
      targetId: newDrive.id,
      targetName: newDrive.title,
      newState: newDrive.status,
      details: `Created recruitment drive "${newDrive.title}" with status ${newDrive.status}.`,
    });

    return NextResponse.json({ success: true, drive: newDrive });
  } catch (err) {
    console.error("[POST /api/recruiter/drives] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
