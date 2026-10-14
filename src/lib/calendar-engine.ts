import {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
  CandidateInterviewRecord,
  CandidateAssessmentRecord,
} from "@/types";
import {
  getStudentInterviews,
  getStudentAssessments,
  getInterviews,
  getRecruitmentDrives,
  getRecruitmentDriveById,
  saveInterviewRecord,
  getApplicationById,
} from "@/lib/recruitment-store";
import { ServerStore } from "@/lib/server-store";

export interface CalendarFilterOptions {
  type?: "ALL" | "INTERVIEWS" | "ASSESSMENTS" | "MEETINGS";
  timeRange?: "UPCOMING" | "TODAY" | "THIS_WEEK" | "ALL";
  date?: string; // YYYY-MM-DD
  search?: string;
}

export { generateGoogleCalendarUrl } from "@/lib/calendar-utils";

export class CalendarEngine {
  /**
   * Translates CandidateInterviewRecord into unified CalendarEvent.
   * STRICT DOMAIN RULE:
   * Event Type = INTERVIEW
   * Final Round = interview stage/round (roundType: 'FINAL', roundName: 'Final Round')
   */
  static mapInterviewToCalendarEvent(
    record: CandidateInterviewRecord,
    options?: { userRole?: "student" | "recruiter" }
  ): CalendarEvent {
    const drive = getRecruitmentDriveById(record.driveId);
    const company = record.company || drive?.company || "Enterprise Partner";
    const companyLogo = record.companyLogo || drive?.companyLogo;

    const roundType = record.roundType || "TECHNICAL";
    const isFinalRound = roundType === "FINAL" || (record.roundName || "").toLowerCase().includes("final");
    const roundName = record.roundName || (isFinalRound ? "Final Round" : `${roundType.charAt(0) + roundType.slice(1).toLowerCase()} Round`);

    const title = options?.userRole === "recruiter"
      ? `${record.candidateName} — ${roundName}`
      : `${company} — ${roundName}`;

    const subtitle = options?.userRole === "recruiter"
      ? `${record.driveTitle} (${record.candidateUniversity || "Candidate"})`
      : `${record.driveTitle} • ${record.interviewerName || "Interviewer"}`;

    return {
      id: record.id,
      type: "INTERVIEW",
      title,
      subtitle,
      description: record.instructions || record.notes || `Scheduled ${roundName} for ${record.driveTitle}`,
      company,
      companyLogo,
      date: record.date,
      startTime: record.time,
      duration: record.duration || "45 mins",
      status: (record.status as CalendarEventStatus) || "SCHEDULED",
      meetingUrl: record.meetingLink,
      location: record.location,
      sourceId: record.id,
      sourceType: "DRIVE_INTERVIEW",
      actionUrl: options?.userRole === "recruiter"
        ? `/dashboard/recruiter/interviews`
        : `/dashboard/interviews`,
      metadata: {
        roundType,
        roundName,
        roundNumber: record.roundNumber || (isFinalRound ? 3 : 1),
        isFinalRound,
        interviewerName: record.interviewerName,
        interviewerRole: record.interviewerRole || "Technical Interviewer",
        candidateId: record.studentId,
        candidateName: record.candidateName,
        candidateAvatar: record.candidateAvatar,
        candidateUniversity: record.candidateUniversity,
        applicationId: record.applicationId,
        driveId: record.driveId,
        position: record.driveTitle,
        instructions: record.instructions,
      },
    };
  }

  /**
   * Translates CandidateAssessmentRecord into unified CalendarEvent.
   */
  static mapAssessmentToCalendarEvent(record: CandidateAssessmentRecord): CalendarEvent {
    const drive = getRecruitmentDriveById(record.driveId);
    const company = drive?.company || "Enterprise Partner";
    const companyLogo = drive?.companyLogo;

    const title = record.assessmentName.includes("—") || record.assessmentName.includes(" - ")
      ? record.assessmentName
      : `${company} — ${record.assessmentName}`;

    return {
      id: record.id,
      type: "ASSESSMENT",
      title,
      subtitle: `${drive?.title || "Technical Screening"} • Duration: ${record.duration || "60 mins"}`,
      description: record.instructions || `Proctored assessment covering drive eligibility requirements.`,
      company,
      companyLogo,
      date: record.date,
      startTime: record.time || "10:00 AM",
      duration: record.duration || "60 mins",
      status: record.passed !== undefined ? "COMPLETED" : "SCHEDULED",
      sourceId: record.id,
      sourceType: "ASSESSMENT",
      actionUrl: `/dashboard/assessments`,
      metadata: {
        driveId: record.driveId,
        applicationId: record.applicationId,
        position: drive?.title,
        instructions: record.instructions,
        passingScore: record.passingScore,
        maxScore: record.maxScore,
      },
    };
  }

  /**
   * Fetches unified calendar events for a student.
   */
  static getStudentEvents(studentId: string, filters?: CalendarFilterOptions): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    // 1. Interviews
    const interviews = getStudentInterviews(studentId);
    interviews.forEach((int) => {
      events.push(this.mapInterviewToCalendarEvent(int, { userRole: "student" }));
    });

    // 2. Assessments
    const assessments = getStudentAssessments(studentId);
    assessments.forEach((ass) => {
      events.push(this.mapAssessmentToCalendarEvent(ass));
    });

    // 3. Mentorship / Career Meetings (Authorized student meetings)
    events.push({
      id: `meet_career_guidance_${studentId}`,
      type: "MEETING",
      title: "Career Guidance & Resume Review",
      subtitle: "1-on-1 Placement Cell Mentorship Session",
      description: "Review Career DNA benchmark gaps and mock interview readiness before campus visits.",
      company: "CommandSkill Career Advisory",
      companyLogo: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=80&auto=format&fit=crop&q=80",
      date: "2026-09-27",
      startTime: "04:00 PM",
      duration: "30 mins",
      status: "SCHEDULED",
      meetingUrl: "https://meet.google.com/commandskill-career-session",
      sourceId: `meet_guidance_${studentId}`,
      sourceType: "CAREER_MEETING",
      actionUrl: "/dashboard/career-dna",
      metadata: {
        interviewerName: "Dr. Alistair Vance",
        interviewerRole: "Senior Career Mentor",
        instructions: "Have your latest projects and GitHub repository list accessible for live feedback.",
      },
    });

    return this.applyFilters(events, filters);
  }

  /**
   * Fetches unified calendar events for a recruiter.
   */
  static getRecruiterEvents(recruiterId: string, filters?: CalendarFilterOptions): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    // 1. All recruiter interviews across active drives
    const interviews = getInterviews("all");
    interviews.forEach((int) => {
      events.push(this.mapInterviewToCalendarEvent(int, { userRole: "recruiter" }));
    });

    // 2. Recruiter consultation / team alignment meetings
    events.push({
      id: `meet_recruiter_sync_${recruiterId}`,
      type: "MEETING",
      title: "Campus Hiring Committee Sync",
      subtitle: "Stripe Talent Acquisition Panel",
      description: "Review candidates shortlisted for Final Round and calibrate offer release quotas.",
      company: "Stripe",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      date: "2026-09-26",
      startTime: "02:00 PM",
      duration: "45 mins",
      status: "SCHEDULED",
      meetingUrl: "https://meet.google.com/stripe-hiring-sync",
      sourceId: `meet_sync_${recruiterId}`,
      sourceType: "CAREER_MEETING",
      actionUrl: "/dashboard/recruiter/selection",
      metadata: {
        interviewerName: "Barun (Director of Engineering)",
        interviewerRole: "Hiring Lead",
        instructions: "Review candidate assessment score distributions before the call.",
      },
    });

    return this.applyFilters(events, filters);
  }

  /**
   * Applies type, timeframe, date, and search filters to unified calendar events.
   */
  private static applyFilters(events: CalendarEvent[], filters?: CalendarFilterOptions): CalendarEvent[] {
    let result = [...events];

    // Filter by type
    if (filters?.type && filters.type !== "ALL") {
      if (filters.type === "INTERVIEWS") {
        result = result.filter((e) => e.type === "INTERVIEW");
      } else if (filters.type === "ASSESSMENTS") {
        result = result.filter((e) => e.type === "ASSESSMENT");
      } else if (filters.type === "MEETINGS") {
        result = result.filter((e) => e.type === "MEETING");
      }
    }

    // Filter by timeframe
    // Default today string in current context: 2026-09-17
    const todayStr = "2026-09-17";

    if (filters?.timeRange === "TODAY") {
      result = result.filter((e) => e.date === todayStr);
    } else if (filters?.timeRange === "UPCOMING") {
      // Exclude cancelled and completed from upcoming view, only include events today or later
      result = result.filter(
        (e) => e.status !== "CANCELLED" && e.status !== "COMPLETED" && e.date >= todayStr
      );
    } else if (filters?.timeRange === "THIS_WEEK") {
      const todayDate = new Date("2026-09-17T00:00:00.000Z");
      const nextWeekDate = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      result = result.filter((e) => {
        const d = new Date(`${e.date}T00:00:00.000Z`);
        return d >= todayDate && d <= nextWeekDate && e.status !== "CANCELLED";
      });
    }

    // Exact date filter
    if (filters?.date) {
      result = result.filter((e) => e.date === filters.date);
    }

    // Search term filter
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q) ||
          e.company.toLowerCase().includes(q) ||
          (e.metadata?.roundName && e.metadata.roundName.toLowerCase().includes(q))
      );
    }

    // Chronological sorting: earliest upcoming first
    return result.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  }

  /**
   * Reschedules an interview record in the underlying store.
   * Updates status to RESCHEDULED and automatically triggers notifications.
   */
  static rescheduleInterview(
    interviewId: string,
    newDate: string,
    newTime: string,
    reason?: string
  ): CandidateInterviewRecord | null {
    const allInterviews = getInterviews("all");
    const target = allInterviews.find((i) => i.id === interviewId);
    if (!target) return null;

    const prevDate = target.date;
    const prevTime = target.time;
    target.date = newDate;
    target.time = newTime;
    target.status = "RESCHEDULED";
    if (reason) {
      target.notes = `${target.notes ? target.notes + " | " : ""}Rescheduled: ${reason}`;
    }

    saveInterviewRecord(target);

    // Dispatch in-app notification to candidate
    if (target.studentId) {
      ServerStore.addStudentNotification(target.studentId, {
        type: "system",
        title: `Interview Rescheduled: ${target.company || "Recruitment Drive"}`,
        description: `Your ${target.roundName || "interview"} was rescheduled from ${prevDate} (${prevTime}) to ${newDate} at ${newTime}.${reason ? ` Reason: ${reason}` : ""}`,
        actionUrl: "/dashboard/calendar",
      });
    }

    // Dispatch operational audit notification to Admin
    ServerStore.addAdminNotification({
      type: "system",
      title: "Recruitment Interview Rescheduled",
      description: `Interview for candidate ${target.candidateName} (${target.company || "Partner"}) moved to ${newDate} ${newTime}.`,
    });

    return target;
  }

  /**
   * Cancels an interview record in the underlying store.
   * Updates status to CANCELLED and automatically dispatches notifications.
   */
  static cancelInterview(interviewId: string, reason?: string): CandidateInterviewRecord | null {
    const allInterviews = getInterviews("all");
    const target = allInterviews.find((i) => i.id === interviewId);
    if (!target) return null;

    target.status = "CANCELLED";
    if (reason) {
      target.notes = `${target.notes ? target.notes + " | " : ""}Cancelled: ${reason}`;
    }

    saveInterviewRecord(target);

    // Dispatch cancellation notification to student
    if (target.studentId) {
      ServerStore.addStudentNotification(target.studentId, {
        type: "system",
        title: `Interview Cancelled: ${target.company || "Recruitment Drive"}`,
        description: `Your scheduled ${target.roundName || "interview"} on ${target.date} was cancelled.${reason ? ` Reason: ${reason}` : ""}`,
        actionUrl: "/dashboard/calendar",
      });
    }

    // Dispatch operational audit notification to Admin
    ServerStore.addAdminNotification({
      type: "system",
      title: "Recruitment Interview Cancelled",
      description: `Interview for ${target.candidateName} (${target.company || "Partner"}) on ${target.date} was cancelled. Reason: ${reason || "Unspecified"}.`,
    });

    return target;
  }
}

