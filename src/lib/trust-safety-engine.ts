import fs from "fs";
import path from "path";
import {
  TrustSafetyReport,
  TrustSafetyStatus,
  ReportPriority,
  TrustSafetyEntityType,
  EnforcementActionType,
  EnforcementDuration,
  ReportEvidence,
  ReportInternalNote,
  EntitySafetyHistory,
  CompanyRiskSignals,
  TrustSafetyMetrics,
  AuditLogEntry,
  DriveStatus,
  CompanyStatus,
  AdminUserStatus,
} from "@/types";
import { recruitmentStore } from "@/lib/recruitment-store";
import { ServerStore } from "@/lib/server-store";
import {
  CATEGORIES_BY_ENTITY_TYPE,
  determineInitialPriority,
} from "@/data/trust-safety-constants";

export { CATEGORIES_BY_ENTITY_TYPE, determineInitialPriority };

// ============================================================================
// State & Persistence
// ============================================================================

interface TrustSafetyStoreState {
  reports: Map<string, TrustSafetyReport>;
  caseCounter: number;
}

const TS_DB_FILE_PATH = path.join(process.cwd(), ".data", "trust-safety-db.json");

function initializeTrustSafetyStore(): TrustSafetyStoreState {
  const state: TrustSafetyStoreState = {
    reports: new Map<string, TrustSafetyReport>(),
    caseCounter: 1045,
  };

  // Pre-seed realistic Trust & Safety cases
  const seedReports: TrustSafetyReport[] = [
    {
      id: "rep_ts_1042",
      caseNumber: "TS-1042",
      reporterId: "student_01",
      reporterName: "Alex Rivera",
      reporterEmail: "alex.rivera@stanford.edu",
      reporterRole: "STUDENT",
      entityType: "RECRUITER",
      targetId: "recruiter_01",
      targetTitle: "Barun (TechCorp Solutions)",
      reportedUserId: "recruiter_01",
      reportedUserName: "Barun",
      reportedCompanyId: "comp_techcorp",
      reportedCompanyName: "TechCorp Global",
      category: "Asking for money / fees",
      description: "Recruiter initiated a DM asking for an upfront ₹5,000 security deposit for onboarding hardware before the technical assessment.",
      evidence: [
        {
          id: "ev_1",
          reportId: "rep_ts_1042",
          type: "SCREENSHOT",
          fileUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80",
          fileName: "chat_deposit_demand.png",
          fileSize: "412 KB",
          description: "Direct message screenshot requesting deposit via UPI link",
          uploadedBy: "Alex Rivera",
          createdAt: "2026-03-16T14:30:00.000Z",
        },
        {
          id: "ev_2",
          reportId: "rep_ts_1042",
          type: "MESSAGE_LOG",
          description: "Exported chat transcript timestamped 14:15 IST",
          uploadedBy: "Alex Rivera",
          createdAt: "2026-03-16T14:32:00.000Z",
        }
      ],
      additionalInfo: "Candidate claims two classmates were also contacted with the same UPI QR code.",
      priority: "CRITICAL",
      status: "INVESTIGATION",
      assignedModeratorId: "admin_01",
      assignedModeratorName: "Admin A17",
      internalNotes: [
        {
          id: "note_1",
          authorId: "admin_01",
          authorName: "Admin A17",
          authorRole: "SUPER_ADMIN",
          note: "Triaged case as CRITICAL. UPI identifier cross-referenced with previous fraud incidents. Reaching out to primary recruiter account holder.",
          createdAt: "2026-03-16T15:00:00.000Z",
        },
        {
          id: "note_2",
          authorId: "admin_01",
          authorName: "Admin A17",
          authorRole: "SUPER_ADMIN",
          note: "Notified company primary POC. The recruiter account may be compromised or rogue agent.",
          createdAt: "2026-03-16T15:45:00.000Z",
        }
      ],
      createdAt: "2026-03-16T14:20:00.000Z",
      updatedAt: "2026-03-16T15:45:00.000Z",
      riskScore: 92,
      anomalySignals: ["Direct fee solicitation", "External UPI payment link", "First-day recruiter activity surge"],
    },
    {
      id: "rep_ts_1041",
      caseNumber: "TS-1041",
      reporterId: "student_02",
      reporterName: "Marcus Vance",
      reporterEmail: "marcus.v@berkeley.edu",
      reporterRole: "STUDENT",
      entityType: "INTERNSHIP",
      targetId: "drive_002",
      targetTitle: "Full Stack Engineer Intern (6-Month Bond)",
      reportedCompanyId: "comp_acme",
      reportedCompanyName: "Acme Innovations",
      reportedOpportunityId: "drive_002",
      category: "Unpaid bond / Contract trapping",
      description: "Drive posting claims $4,500/mo stipend, but offer letter requires mandatory unpaid 3-month probation and $1,200 training deduction bond.",
      evidence: [
        {
          id: "ev_3",
          reportId: "rep_ts_1041",
          type: "DOCUMENT",
          fileName: "annexure_contract_clause.pdf",
          fileSize: "1.4 MB",
          description: "Offer letter contract clause 14.b requiring $1,200 training penalty",
          uploadedBy: "Marcus Vance",
          createdAt: "2026-03-16T11:10:00.000Z",
        }
      ],
      priority: "HIGH",
      status: "TRIAGED",
      assignedModeratorId: "admin_02",
      assignedModeratorName: "Admin Lead Taylor",
      internalNotes: [
        {
          id: "note_3",
          authorId: "admin_02",
          authorName: "Admin Lead Taylor",
          authorRole: "PLATFORM_ADMIN",
          note: "Contract bond clause violates CommandSkill recruitment guidelines section 4.2 (Zero Student Financial Liability). Sent warning to Acme HR.",
          createdAt: "2026-03-16T12:00:00.000Z",
        }
      ],
      createdAt: "2026-03-16T10:45:00.000Z",
      updatedAt: "2026-03-16T12:00:00.000Z",
      riskScore: 78,
      anomalySignals: ["Contract discrepancy vs listing", "Bond penalty clause"],
    },
    {
      id: "rep_ts_1040",
      caseNumber: "TS-1040",
      reporterId: "recruiter_01",
      reporterName: "Barun",
      reporterEmail: "barun@techcorp.io",
      reporterRole: "RECRUITER",
      entityType: "STUDENT",
      targetId: "student_spam_99",
      targetTitle: "Candidate #9901 (Duplicate Identity)",
      reportedUserId: "student_spam_99",
      reportedUserName: "Candidate #9901",
      category: "Fake certificate or credential",
      description: "Applicant submitted identical AWS Certified Solutions Architect credential with mismatched serial hash registered to another engineer.",
      evidence: [
        {
          id: "ev_4",
          reportId: "rep_ts_1040",
          type: "DOCUMENT",
          fileName: "aws_cert_forgery.pdf",
          fileSize: "880 KB",
          description: "Certificate scan with modified recipient name",
          uploadedBy: "Barun",
          createdAt: "2026-03-16T09:15:00.000Z",
        }
      ],
      priority: "HIGH",
      status: "SUBMITTED",
      internalNotes: [],
      createdAt: "2026-03-16T09:05:00.000Z",
      updatedAt: "2026-03-16T09:05:00.000Z",
      riskScore: 84,
      anomalySignals: ["Credential hash validation failed", "Font tampering in PDF metadata"],
    },
    {
      id: "rep_ts_1039",
      caseNumber: "TS-1039",
      reporterId: "student_03",
      reporterName: "Priya Sharma",
      reporterEmail: "priya.sharma@iitd.ac.in",
      reporterRole: "STUDENT",
      entityType: "COMPANY",
      targetId: "comp_acme",
      targetTitle: "Acme Innovations",
      reportedCompanyId: "comp_acme",
      reportedCompanyName: "Acme Innovations",
      category: "Fraudulent / Shell company",
      description: "Listed office address is a residential apartment complex with no commercial registration.",
      evidence: [],
      priority: "MEDIUM",
      status: "DECISION",
      assignedModeratorId: "admin_01",
      assignedModeratorName: "Admin A17",
      internalNotes: [
        {
          id: "note_4",
          authorId: "admin_01",
          authorName: "Admin A17",
          authorRole: "SUPER_ADMIN",
          note: "Reviewed state business registry. Entity is legitimate LLC registered under home office during 2021 pandemic. Requesting commercial lease verification.",
          createdAt: "2026-03-15T16:20:00.000Z",
        }
      ],
      createdAt: "2026-03-15T14:10:00.000Z",
      updatedAt: "2026-03-15T16:20:00.000Z",
      riskScore: 35,
    },
    {
      id: "rep_ts_1038",
      caseNumber: "TS-1038",
      reporterId: "student_01",
      reporterName: "Alex Rivera",
      reporterEmail: "alex.rivera@stanford.edu",
      reporterRole: "STUDENT",
      entityType: "MESSAGE",
      targetId: "msg_solicitation_01",
      targetTitle: "Direct message from unknown recruiter",
      reportedUserId: "recruiter_unverified_09",
      reportedUserName: "Spam Agency Hub",
      category: "Spam / Unsolicited messages",
      description: "Mass DM blast offering paid essay writing and interview proxy services.",
      evidence: [],
      priority: "MEDIUM",
      status: "RESOLVED",
      assignedModeratorId: "admin_01",
      assignedModeratorName: "Admin A17",
      enforcementAction: "WARNING",
      enforcementDuration: "7_DAYS",
      enforcementReason: "Account sent unauthorized bulk solicitations violating messaging policy.",
      enforcedAt: "2026-03-16T11:00:00.000Z",
      enforcedBy: "Admin A17",
      resolutionNotes: "Official warning issued, messaging rate-limited for 7 days. Further violations will result in permanent ban.",
      resolvedAt: "2026-03-16T11:05:00.000Z",
      resolvedBy: "Admin A17",
      internalNotes: [
        {
          id: "note_5",
          authorId: "admin_01",
          authorName: "Admin A17",
          authorRole: "SUPER_ADMIN",
          note: "Proxy interview service solicitation confirmed. Outbound messaging privileges suspended.",
          createdAt: "2026-03-16T10:55:00.000Z",
        }
      ],
      createdAt: "2026-03-16T08:30:00.000Z",
      updatedAt: "2026-03-16T11:05:00.000Z",
      riskScore: 65,
    },
    {
      id: "rep_ts_1037",
      caseNumber: "TS-1037",
      reporterId: "student_02",
      reporterName: "Marcus Vance",
      reporterEmail: "marcus.v@berkeley.edu",
      reporterRole: "STUDENT",
      entityType: "OPPORTUNITY",
      targetId: "drive_crypto_scam",
      targetTitle: "Web3 Forex Arbitrage Trainee",
      reportedCompanyId: "comp_crypto_fx",
      reportedCompanyName: "FX Quantum Global",
      reportedOpportunityId: "drive_crypto_scam",
      category: "Scam / Pyramid scheme",
      description: "Job description redirected candidates to an offshore crypto wallet deposit portal to 'trade simulated liquidity'.",
      evidence: [],
      priority: "CRITICAL",
      status: "RESOLVED",
      assignedModeratorId: "admin_01",
      assignedModeratorName: "Admin A17",
      enforcementAction: "OPPORTUNITY_RESTRICTED",
      enforcementDuration: "PERMANENT",
      enforcementReason: "Fraudulent cryptocurrency deposit scheme masquerading as engineering internship.",
      enforcedAt: "2026-03-16T08:00:00.000Z",
      enforcedBy: "Admin A17",
      resolutionNotes: "Opportunity permanently removed and blacklisted. Candidate warning banner posted. Law enforcement escalation logged.",
      resolvedAt: "2026-03-16T08:15:00.000Z",
      resolvedBy: "Admin A17",
      internalNotes: [
        {
          id: "note_6",
          authorId: "admin_01",
          authorName: "Admin A17",
          authorRole: "SUPER_ADMIN",
          note: "Immediate restriction enforced. All applicants notified.",
          createdAt: "2026-03-16T07:55:00.000Z",
        }
      ],
      createdAt: "2026-03-16T07:15:00.000Z",
      updatedAt: "2026-03-16T08:15:00.000Z",
      riskScore: 99,
    },
  ];

  seedReports.forEach((r) => state.reports.set(r.id, r));

  loadFromDisk(state);
  return state;
}

function loadFromDisk(state: TrustSafetyStoreState): void {
  try {
    if (!fs.existsSync(TS_DB_FILE_PATH)) return;
    const raw = fs.readFileSync(TS_DB_FILE_PATH, "utf-8");
    if (!raw.trim()) return;
    const data = JSON.parse(raw);
    if (data.reports && Array.isArray(data.reports)) {
      data.reports.forEach(([key, val]: [string, TrustSafetyReport]) => {
        state.reports.set(key, val);
      });
    }
    if (typeof data.caseCounter === "number") {
      state.caseCounter = data.caseCounter;
    }
  } catch (err) {
    console.warn("Failed to load Trust & Safety database from disk:", err);
  }
}

function persistToDisk(): void {
  try {
    const dir = path.dirname(TS_DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const serializable = {
      reports: Array.from(tsStore.reports.entries()),
      caseCounter: tsStore.caseCounter,
    };
    fs.writeFileSync(TS_DB_FILE_PATH, JSON.stringify(serializable, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist Trust & Safety store to disk:", err);
  }
}

// Global singleton declaration
declare global {
  var __COMMANDSKILL_TRUST_SAFETY_STORE__: TrustSafetyStoreState | undefined;
}

const tsStore: TrustSafetyStoreState =
  globalThis.__COMMANDSKILL_TRUST_SAFETY_STORE__ ||
  (globalThis.__COMMANDSKILL_TRUST_SAFETY_STORE__ = initializeTrustSafetyStore());

// ============================================================================
// Core Trust & Safety Engine
// ============================================================================

export class TrustSafetyEngine {
  /**
   * Generates sequential Case ID (e.g. TS-1043)
   */
  static generateCaseNumber(): string {
    tsStore.caseCounter += 1;
    const num = tsStore.caseCounter;
    persistToDisk();
    return `TS-${num}`;
  }

  /**
   * Retrieves all reports with optional filtration
   */
  static getAllReports(filters?: {
    search?: string;
    status?: string;
    priority?: string;
    entityType?: string;
    category?: string;
    assignedModeratorId?: string;
    reporterId?: string;
    targetId?: string;
  }): TrustSafetyReport[] {
    let list = Array.from(tsStore.reports.values());

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.caseNumber.toLowerCase().includes(q) ||
          r.targetTitle.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.reportedCompanyName && r.reportedCompanyName.toLowerCase().includes(q)) ||
          (r.reportedUserName && r.reportedUserName.toLowerCase().includes(q))
      );
    }

    if (filters?.status && filters.status !== "ALL") {
      const s = filters.status.toUpperCase();
      list = list.filter((r) => r.status.toUpperCase() === s);
    }

    if (filters?.priority && filters.priority !== "ALL") {
      const p = filters.priority.toUpperCase();
      list = list.filter((r) => r.priority.toUpperCase() === p);
    }

    if (filters?.entityType && filters.entityType !== "ALL") {
      const e = filters.entityType.toUpperCase();
      list = list.filter((r) => r.entityType.toUpperCase() === e);
    }

    if (filters?.category && filters.category !== "ALL") {
      list = list.filter((r) => r.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters?.assignedModeratorId) {
      list = list.filter((r) => r.assignedModeratorId === filters.assignedModeratorId);
    }

    if (filters?.reporterId) {
      list = list.filter((r) => r.reporterId === filters.reporterId);
    }

    if (filters?.targetId) {
      list = list.filter(
        (r) =>
          r.targetId === filters.targetId ||
          r.reportedUserId === filters.targetId ||
          r.reportedCompanyId === filters.targetId ||
          r.reportedOpportunityId === filters.targetId
      );
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  /**
   * Retrieves single report by ID or Case Number
   */
  static getReportById(idOrCase: string): TrustSafetyReport | null {
    if (!idOrCase) return null;
    const direct = tsStore.reports.get(idOrCase);
    if (direct) return direct;

    const query = idOrCase.toUpperCase();
    for (const r of tsStore.reports.values()) {
      if (r.id === idOrCase || r.caseNumber.toUpperCase() === query) {
        return r;
      }
    }
    return null;
  }

  /**
   * Creates a new user report
   */
  static createReport(params: {
    reporterId: string;
    reporterName: string;
    reporterEmail: string;
    reporterRole?: string;
    entityType: TrustSafetyEntityType;
    targetId: string;
    targetTitle: string;
    reportedUserId?: string;
    reportedUserName?: string;
    reportedCompanyId?: string;
    reportedCompanyName?: string;
    reportedOpportunityId?: string;
    reportedContentId?: string;
    category: string;
    description: string;
    evidence?: ReportEvidence[];
    additionalInfo?: string;
    priority?: ReportPriority;
  }): TrustSafetyReport {
    const caseNumber = this.generateCaseNumber();
    const id = `rep_${caseNumber.toLowerCase().replace("-", "_")}`;
    const initialPriority = params.priority || determineInitialPriority(params.category, params.entityType);

    const now = new Date().toISOString();
    const newReport: TrustSafetyReport = {
      id,
      caseNumber,
      reporterId: params.reporterId,
      reporterName: params.reporterName,
      reporterEmail: params.reporterEmail,
      reporterRole: params.reporterRole || "STUDENT",
      entityType: params.entityType,
      targetId: params.targetId,
      targetTitle: params.targetTitle,
      reportedUserId: params.reportedUserId,
      reportedUserName: params.reportedUserName,
      reportedCompanyId: params.reportedCompanyId,
      reportedCompanyName: params.reportedCompanyName,
      reportedOpportunityId: params.reportedOpportunityId,
      reportedContentId: params.reportedContentId,
      category: params.category,
      description: params.description,
      evidence: params.evidence || [],
      additionalInfo: params.additionalInfo,
      priority: initialPriority,
      status: "SUBMITTED",
      internalNotes: [],
      riskScore: initialPriority === "CRITICAL" ? 85 : initialPriority === "HIGH" ? 70 : 40,
      createdAt: now,
      updatedAt: now,
    };

    tsStore.reports.set(id, newReport);
    persistToDisk();

    // 1. Send Admin Notification
    ServerStore.addAdminNotification({
      title: `🛡️ Trust & Safety: [${newReport.caseNumber}] ${newReport.entityType} Reported`,
      description: `${newReport.category} flagged against ${newReport.targetTitle} by ${newReport.reporterName} (${newReport.priority})`,
      type: "risk_alert",
    });

    // 2. Dispatch Confirmation Notification to Reporter
    this.sendNotificationToUser(newReport.reporterId, {
      title: `Report Submitted (${newReport.caseNumber})`,
      message: `Your report regarding "${newReport.targetTitle}" has been received. Our Trust & Safety team will review it.`,
      type: "system",
    });

    // 3. Add to Audit Log
    this.logAuditEvent({
      admin: newReport.reporterName,
      action: "REPORT_CREATED",
      targetType: newReport.entityType,
      targetId: newReport.targetId,
      targetName: newReport.targetTitle,
      newStatus: "SUBMITTED",
      reason: `Report created for: ${newReport.category}`,
      details: `Case ${newReport.caseNumber} created by ${newReport.reporterName} (${newReport.reporterRole})`,
    });

    return newReport;
  }

  /**
   * Updates report status, priority, or moderator assignment
   */
  static updateReport(
    reportId: string,
    updates: {
      status?: TrustSafetyStatus;
      priority?: ReportPriority;
      assignedModeratorId?: string;
      assignedModeratorName?: string;
      resolutionNotes?: string;
    },
    actor: { id: string; name: string; role: string }
  ): { success: boolean; error?: string; report?: TrustSafetyReport } {
    const report = this.getReportById(reportId);
    if (!report) {
      return { success: false, error: `Report ${reportId} not found.` };
    }

    const prevStatus = report.status;
    const prevPriority = report.priority;
    const now = new Date().toISOString();

    if (updates.status) report.status = updates.status;
    if (updates.priority) report.priority = updates.priority;
    if (updates.assignedModeratorId !== undefined) {
      report.assignedModeratorId = updates.assignedModeratorId;
      report.assignedModeratorName = updates.assignedModeratorName;
    }
    if (updates.resolutionNotes) {
      report.resolutionNotes = updates.resolutionNotes;
    }

    if (updates.status === "RESOLVED" || updates.status === "DISMISSED") {
      report.resolvedAt = now;
      report.resolvedBy = actor.name;
    }

    report.updatedAt = now;
    tsStore.reports.set(report.id, report);
    persistToDisk();

    // Audit logs for status/priority/assignment changes
    if (updates.status && updates.status !== prevStatus) {
      this.logAuditEvent({
        admin: actor.name,
        action: updates.status === "RESOLVED" ? "REPORT_RESOLVED" : updates.status === "DISMISSED" ? "REPORT_DISMISSED" : "STATUS_CHANGED",
        targetType: report.entityType,
        targetId: report.targetId,
        targetName: report.targetTitle,
        previousStatus: prevStatus,
        newStatus: updates.status,
        reason: updates.resolutionNotes || `Status transitioned to ${updates.status}`,
        details: `Administrator ${actor.name} updated case ${report.caseNumber} status from ${prevStatus} to ${updates.status}`,
      });

      // If resolved, notify the reporter
      if (updates.status === "RESOLVED" || updates.status === "DISMISSED") {
        this.sendNotificationToUser(report.reporterId, {
          title: `Report Update: ${report.caseNumber}`,
          message: `Your report regarding "${report.targetTitle}" has been reviewed and concluded (${updates.status}). Thank you for helping keep CommandSkill safe.`,
          type: "system",
        });
      }
    }

    if (updates.priority && updates.priority !== prevPriority) {
      this.logAuditEvent({
        admin: actor.name,
        action: "PRIORITY_CHANGED",
        targetType: report.entityType,
        targetId: report.targetId,
        targetName: report.targetTitle,
        previousStatus: prevPriority,
        newStatus: updates.priority,
        reason: `Priority re-evaluated to ${updates.priority}`,
        details: `Administrator ${actor.name} changed case ${report.caseNumber} priority from ${prevPriority} to ${updates.priority}`,
      });
    }

    return { success: true, report };
  }

  /**
   * Adds an internal note to a report investigation
   */
  static addInternalNote(
    reportId: string,
    noteText: string,
    actor: { id: string; name: string; role: string }
  ): { success: boolean; error?: string; note?: ReportInternalNote } {
    const report = this.getReportById(reportId);
    if (!report) {
      return { success: false, error: `Report ${reportId} not found.` };
    }

    if (!noteText || !noteText.trim()) {
      return { success: false, error: "Note text cannot be empty." };
    }

    const note: ReportInternalNote = {
      id: `note_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      authorId: actor.id,
      authorName: actor.name,
      authorRole: actor.role,
      note: noteText.trim(),
      createdAt: new Date().toISOString(),
    };

    if (!report.internalNotes) report.internalNotes = [];
    report.internalNotes.push(note);
    report.updatedAt = new Date().toISOString();

    // If still in SUBMITTED or TRIAGED, auto advance to INVESTIGATION
    if (report.status === "SUBMITTED" || report.status === "TRIAGED") {
      report.status = "INVESTIGATION";
    }

    tsStore.reports.set(report.id, report);
    persistToDisk();

    this.logAuditEvent({
      admin: actor.name,
      action: "NOTE_ADDED",
      targetType: report.entityType,
      targetId: report.targetId,
      targetName: report.targetTitle,
      reason: "Internal investigation note added",
      details: `Administrator ${actor.name} added investigation note to case ${report.caseNumber}: "${note.note.substring(0, 80)}..."`,
    });

    return { success: true, note };
  }

  /**
   * Adds evidence to a report
   */
  static addEvidence(
    reportId: string,
    evidenceData: Omit<ReportEvidence, "id" | "reportId" | "createdAt">,
    actorName: string
  ): { success: boolean; error?: string; evidence?: ReportEvidence } {
    const report = this.getReportById(reportId);
    if (!report) return { success: false, error: `Report ${reportId} not found.` };

    const ev: ReportEvidence = {
      ...evidenceData,
      id: `ev_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      reportId: report.id,
      createdAt: new Date().toISOString(),
      uploadedBy: actorName,
    };

    if (!report.evidence) report.evidence = [];
    report.evidence.push(ev);
    report.updatedAt = new Date().toISOString();

    tsStore.reports.set(report.id, report);
    persistToDisk();

    this.logAuditEvent({
      admin: actorName,
      action: "EVIDENCE_ADDED",
      targetType: report.entityType,
      targetId: report.targetId,
      targetName: report.targetTitle,
      reason: `Attached ${ev.type} evidence: ${ev.fileName || ev.description}`,
      details: `Evidence attached to case ${report.caseNumber}`,
    });

    return { success: true, evidence: ev };
  }

  /**
   * Executes standardized enforcement action
   */
  static executeEnforcement(
    reportId: string,
    action: EnforcementActionType,
    duration: EnforcementDuration,
    reason: string,
    actor: { id: string; name: string; role: string }
  ): { success: boolean; error?: string; report?: TrustSafetyReport } {
    const report = this.getReportById(reportId);
    if (!report) return { success: false, error: `Report ${reportId} not found.` };

    if (!reason || !reason.trim()) {
      return { success: false, error: "Enforcement reason is mandatory." };
    }

    const now = new Date().toISOString();
    report.enforcementAction = action;
    report.enforcementDuration = duration;
    report.enforcementReason = reason.trim();
    report.enforcedAt = now;
    report.enforcedBy = actor.name;
    report.status = "ACTION";
    report.updatedAt = now;

    // Apply entity-specific restriction to the core system
    this.applySystemEnforcement(report, action, duration, reason, actor);

    tsStore.reports.set(report.id, report);
    persistToDisk();

    // Add note and audit log
    this.addInternalNote(
      report.id,
      `ENFORCEMENT EXECUTED: ${action} (${duration}). Reason: ${reason}`,
      actor
    );

    this.logAuditEvent({
      admin: actor.name,
      action: this.mapEnforcementToAuditAction(action),
      targetType: report.entityType,
      targetId: report.targetId,
      targetName: report.targetTitle,
      newStatus: action,
      reason,
      details: `Administrator ${actor.name} enforced ${action} on ${report.targetTitle} (Duration: ${duration}). Reason: ${reason}`,
    });

    return { success: true, report };
  }

  /**
   * Applies the enforcement action directly to the underlying Drive, User, or Company
   */
  private static applySystemEnforcement(
    report: TrustSafetyReport,
    action: EnforcementActionType,
    duration: EnforcementDuration,
    reason: string,
    actor: { id: string; name: string; role: string }
  ): void {
    const now = new Date().toISOString();

    // 1. Opportunity / Drive Restriction
    if (
      action === "OPPORTUNITY_RESTRICTED" ||
      action === "CONTENT_REMOVED" ||
      ["OPPORTUNITY", "JOB", "INTERNSHIP"].includes(report.entityType)
    ) {
      const driveId = report.reportedOpportunityId || report.targetId;
      if (recruitmentStore && recruitmentStore.drives) {
        const drive = recruitmentStore.drives.get(driveId);
        if (drive) {
          drive.status = "RESTRICTED";
          drive.isRestricted = true;
          drive.restrictionReason = reason;
          drive.restrictedAt = now;
          drive.restrictedBy = actor.name;
          recruitmentStore.drives.set(driveId, drive);
        }
      }
    }

    // 2. Recruiter / User Restriction or Suspension
    if (
      action === "USER_RESTRICTED" ||
      action === "RECRUITER_SUSPENDED" ||
      action === "ACCOUNT_SUSPENDED" ||
      action === "ACCOUNT_BANNED"
    ) {
      const targetUserId = report.reportedUserId || (["RECRUITER", "STUDENT"].includes(report.entityType) ? report.targetId : undefined);
      if (targetUserId) {
        // Update user status
        const user = ServerStore.getUserById(targetUserId);
        if (user) {
          if (action === "ACCOUNT_BANNED") {
            user.status = "BANNED";
          } else if (action === "RECRUITER_SUSPENDED" || action === "ACCOUNT_SUSPENDED") {
            user.status = "SUSPENDED";
          } else {
            user.status = "RESTRICTED";
          }
          user.suspensionReason = reason;
        }

        // Notify affected user with non-sensitive platform policy message
        this.sendNotificationToUser(targetUserId, {
          title: "Account Status Notice",
          message: "Some account functionality has been temporarily restricted while we review a reported policy issue. If you believe this is an error, please contact platform support.",
          type: "system",
        });
      }
    }

    // 3. Company Suspension
    if (action === "COMPANY_SUSPENDED" || report.entityType === "COMPANY") {
      const companyId = report.reportedCompanyId || (report.entityType === "COMPANY" ? report.targetId : undefined);
      if (companyId) {
        const company = ServerStore.getCompanyById(companyId);
        if (company) {
          company.status = "SUSPENDED";
          company.isRestricted = true;
          company.restrictionReason = reason;
          company.restrictedAt = now;
          company.violationsCount = (company.violationsCount || 0) + 1;
        }
      }
    }
  }

  /**
   * Restores an opportunity from restriction
   */
  static restoreOpportunity(
    driveId: string,
    reason: string,
    actor: { id: string; name: string; role: string }
  ): { success: boolean; error?: string } {
    if (!recruitmentStore || !recruitmentStore.drives) {
      return { success: false, error: "Recruitment store unavailable." };
    }
    const drive = recruitmentStore.drives.get(driveId);
    if (!drive) return { success: false, error: `Drive ${driveId} not found.` };

    drive.status = "APPLICATIONS_OPEN";
    drive.isRestricted = false;
    drive.restrictionReason = undefined;
    drive.restrictedAt = undefined;
    drive.restrictedBy = undefined;
    recruitmentStore.drives.set(driveId, drive);

    this.logAuditEvent({
      admin: actor.name,
      action: "OPPORTUNITY_RESTRICTED",
      targetType: "DRIVE",
      targetId: driveId,
      targetName: drive.title,
      previousStatus: "RESTRICTED",
      newStatus: "APPLICATIONS_OPEN",
      reason: reason || "Restored by administrator after review",
      details: `Administrator ${actor.name} restored restricted opportunity ${drive.title}`,
    });

    return { success: true };
  }

  /**
   * Restores an account from restriction/suspension
   */
  static restoreUser(
    userId: string,
    reason: string,
    actor: { id: string; name: string; role: string }
  ): { success: boolean; error?: string } {
    const user = ServerStore.getUserById(userId);
    if (!user) return { success: false, error: `User ${userId} not found.` };

    const prev = user.status;
    user.status = "ACTIVE";
    user.suspensionReason = undefined;

    this.sendNotificationToUser(userId, {
      title: "Account Status Restored",
      message: "The review regarding your account has been completed, and full platform access has been restored.",
      type: "system",
    });

    this.logAuditEvent({
      admin: actor.name,
      action: "USER_RESTRICTED",
      targetType: "USER",
      targetId: userId,
      targetName: user.name,
      previousStatus: prev,
      newStatus: "ACTIVE",
      reason: reason || "Account reinstated after verification",
      details: `Administrator ${actor.name} restored user account ${user.name}`,
    });

    return { success: true };
  }

  /**
   * Aggregates Trust & Safety history for any entity (Company, Recruiter, Student, Opportunity)
   */
  static getEntitySafetyHistory(entityType: string, entityId: string): EntitySafetyHistory {
    const allReports = Array.from(tsStore.reports.values()).filter(
      (r) =>
        r.targetId === entityId ||
        r.reportedUserId === entityId ||
        r.reportedCompanyId === entityId ||
        r.reportedOpportunityId === entityId
    );

    let confirmedViolations = 0;
    let activeInvestigations = 0;
    let warningsCount = 0;
    const currentRestrictions: string[] = [];

    allReports.forEach((r) => {
      if (r.enforcementAction && r.enforcementAction !== "NO_ACTION" && r.enforcementAction !== "ESCALATED") {
        confirmedViolations += 1;
      }
      if (r.enforcementAction === "WARNING") {
        warningsCount += 1;
      }
      if (r.status === "INVESTIGATION" || r.status === "TRIAGED" || r.status === "DECISION") {
        activeInvestigations += 1;
      }
      if (
        r.enforcementAction &&
        ["OPPORTUNITY_RESTRICTED", "USER_RESTRICTED", "RECRUITER_SUSPENDED", "COMPANY_SUSPENDED", "ACCOUNT_SUSPENDED", "ACCOUNT_BANNED"].includes(r.enforcementAction)
      ) {
        if (!currentRestrictions.includes(r.enforcementAction)) {
          currentRestrictions.push(r.enforcementAction);
        }
      }
    });

    // Check entity verification status for the side-by-side contrast
    let entityName = entityId;
    let verificationStatus = "UNKNOWN";

    if (entityType === "COMPANY") {
      const comp = ServerStore.getCompanyById(entityId);
      if (comp) {
        entityName = comp.name;
        verificationStatus = comp.status === "VERIFIED" ? "Verified" : comp.status;
      }
    } else if (entityType === "RECRUITER" || entityType === "USER" || entityType === "STUDENT") {
      const u = ServerStore.getUserById(entityId);
      if (u) {
        entityName = u.name;
        verificationStatus = u.verificationStatus || "Verified";
      }
    } else if (entityType === "OPPORTUNITY" || entityType === "JOB" || entityType === "INTERNSHIP") {
      const drive = recruitmentStore?.drives?.get(entityId);
      if (drive) {
        entityName = drive.title;
        verificationStatus = "Listed";
      }
    }

    return {
      entityType,
      entityId,
      entityName,
      verificationStatus,
      totalReports: allReports.length,
      confirmedViolations,
      activeInvestigations,
      warningsCount,
      currentRestrictions,
      recentReports: allReports.slice(0, 10),
    };
  }

  /**
   * Aggregates Company-Level Risk Signals across all recruiters and opportunities
   */
  static getCompanyRiskSignals(companyId: string): CompanyRiskSignals {
    const comp = ServerStore.getCompanyById(companyId);
    const companyName = comp ? comp.name : companyId;

    // Find all drives associated with this company
    const companyDrives: string[] = [];
    if (recruitmentStore && recruitmentStore.drives) {
      recruitmentStore.drives.forEach((d) => {
        if (d.company.toLowerCase().includes(companyName.toLowerCase()) || d.id.includes(companyId)) {
          companyDrives.push(d.id);
        }
      });
    }

    // Find all recruiters associated with this company
    const companyRecruiters: string[] = [];
    const allUsers = ServerStore.getAllUsers();
    allUsers.forEach((u) => {
      if (u.role === "RECRUITER" && (u.companyId === companyId || (u.companyName && u.companyName.toLowerCase().includes(companyName.toLowerCase())))) {
        companyRecruiters.push(u.id);
      }
    });

    // Aggregate all reports touching company, its recruiters, or its drives
    const reportedRecruiterIds = new Set<string>();
    const reportedOpportunityIds = new Set<string>();
    let totalReports = 0;
    let previousViolations = 0;
    let activeInvestigations = 0;

    tsStore.reports.forEach((r) => {
      const isCompanyMatch = r.reportedCompanyId === companyId || r.targetId === companyId;
      const isRecruiterMatch = (r.reportedUserId && companyRecruiters.includes(r.reportedUserId)) || (r.targetId && companyRecruiters.includes(r.targetId));
      const isDriveMatch = (r.reportedOpportunityId && companyDrives.includes(r.reportedOpportunityId)) || (r.targetId && companyDrives.includes(r.targetId));

      if (isCompanyMatch || isRecruiterMatch || isDriveMatch) {
        totalReports += 1;
        if (isRecruiterMatch) {
          reportedRecruiterIds.add(r.reportedUserId || r.targetId);
        }
        if (isDriveMatch) {
          reportedOpportunityIds.add(r.reportedOpportunityId || r.targetId);
        }
        if (r.enforcementAction && r.enforcementAction !== "NO_ACTION") {
          previousViolations += 1;
        }
        if (["SUBMITTED", "TRIAGED", "INVESTIGATION", "DECISION"].includes(r.status)) {
          activeInvestigations += 1;
        }
      }
    });

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = "LOW";
    if (previousViolations >= 2 || reportedRecruiterIds.size >= 3 || totalReports >= 10) {
      riskLevel = "CRITICAL";
    } else if (previousViolations >= 1 || reportedOpportunityIds.size >= 2 || totalReports >= 5) {
      riskLevel = "HIGH";
    } else if (totalReports >= 2 || activeInvestigations >= 1) {
      riskLevel = "MEDIUM";
    }

    return {
      companyId,
      companyName,
      recruitersReportedCount: reportedRecruiterIds.size,
      opportunitiesReportedCount: reportedOpportunityIds.size,
      totalReportsCount: totalReports,
      previousViolationsCount: previousViolations,
      activeInvestigationsCount: activeInvestigations,
      riskLevel,
    };
  }

  /**
   * Computes high-level metrics for Trust & Safety dashboard
   */
  static getMetrics(): TrustSafetyMetrics {
    const all = Array.from(tsStore.reports.values());
    const openReports = all.filter((r) => !["RESOLVED", "DISMISSED"].includes(r.status)).length;
    const criticalReports = all.filter((r) => r.priority === "CRITICAL" && !["RESOLVED", "DISMISSED"].includes(r.status)).length;
    const underInvestigation = all.filter((r) => r.status === "INVESTIGATION").length;

    // Resolved today (within last 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const resolvedToday = all.filter((r) => r.resolvedAt && new Date(r.resolvedAt).getTime() > oneDayAgo).length;

    // Suspended / Restricted entities count
    let suspendedEntities = 0;
    const countedEntityIds = new Set<string>();
    all.forEach((r) => {
      if (
        r.enforcementAction &&
        ["OPPORTUNITY_RESTRICTED", "USER_RESTRICTED", "RECRUITER_SUSPENDED", "COMPANY_SUSPENDED", "ACCOUNT_SUSPENDED", "ACCOUNT_BANNED"].includes(r.enforcementAction)
      ) {
        if (!countedEntityIds.has(r.targetId)) {
          countedEntityIds.add(r.targetId);
          suspendedEntities += 1;
        }
      }
    });

    // Distributions
    const reportsByCategory: Record<string, number> = {};
    const reportsByEntityType: Record<string, number> = {};
    const priorityDistribution: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    const statusDistribution: Record<string, number> = {
      SUBMITTED: 0,
      TRIAGED: 0,
      INVESTIGATION: 0,
      DECISION: 0,
      ACTION: 0,
      RESOLVED: 0,
      ESCALATED: 0,
      DISMISSED: 0,
    };

    all.forEach((r) => {
      reportsByCategory[r.category] = (reportsByCategory[r.category] || 0) + 1;
      reportsByEntityType[r.entityType] = (reportsByEntityType[r.entityType] || 0) + 1;
      priorityDistribution[r.priority] = (priorityDistribution[r.priority] || 0) + 1;
      statusDistribution[r.status] = (statusDistribution[r.status] || 0) + 1;
    });

    const totalClosed = (statusDistribution.RESOLVED || 0) + (statusDistribution.DISMISSED || 0);
    const resolutionRate = all.length > 0 ? Math.round((totalClosed / all.length) * 100) : 0;

    return {
      openReports,
      criticalReports,
      underInvestigation,
      resolvedToday,
      suspendedEntities,
      resolutionRate,
      reportsByCategory,
      reportsByEntityType,
      priorityDistribution,
      statusDistribution,
    };
  }

  /**
   * Helper to dispatch in-app notifications
   */
  private static sendNotificationToUser(userId: string, notification: { title: string; message: string; type: any }): void {
    try {
      ServerStore.addStudentNotification(userId, {
        title: notification.title,
        description: notification.message,
        type: notification.type || "system",
      });
    } catch {
      // Fallback safe dispatch
    }
  }

  /**
   * Helper to log standardized audit event
   */
  private static logAuditEvent(entry: {
    admin: string;
    action: string;
    targetType: string;
    targetId: string;
    targetName: string;
    previousStatus?: string;
    newStatus?: string;
    reason?: string;
    details: string;
  }): void {
    try {
      ServerStore.addAuditLog({
        admin: entry.admin,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        targetName: entry.targetName,
        previousStatus: entry.previousStatus || "N/A",
        newStatus: entry.newStatus || "N/A",
        reason: entry.reason || "",
        ipSessionRef: "trust-safety-gateway",
        details: entry.details,
      });
    } catch (err) {
      console.warn("Failed to write T&S audit log:", err);
    }
  }

  private static mapEnforcementToAuditAction(action: EnforcementActionType): string {
    switch (action) {
      case "WARNING":
        return "DECISION_MADE";
      case "CONTENT_REMOVED":
        return "CONTENT_REMOVED";
      case "OPPORTUNITY_RESTRICTED":
        return "OPPORTUNITY_RESTRICTED";
      case "USER_RESTRICTED":
        return "USER_RESTRICTED";
      case "RECRUITER_SUSPENDED":
      case "ACCOUNT_SUSPENDED":
        return "USER_SUSPENDED";
      case "ACCOUNT_BANNED":
        return "USER_BANNED";
      case "COMPANY_SUSPENDED":
        return "USER_SUSPENDED";
      case "ESCALATED":
        return "REPORT_ESCALATED";
      default:
        return "DECISION_MADE";
    }
  }
}
