import fs from "fs";
import path from "path";
import {
  AdminNotificationItem,
  AdminOverviewMetrics,
  AdminStudentRecord,
  AuditLogEntry,
  NotificationItem,
  StudentProfile,
  RecruiterProfile,
  AdminProfile,
  User,
  UserRole,
  VerificationChecklistItem,
  VerificationQueueStatus,
  VerificationRequest,
  VerificationRiskLevel,
  VerificationStatus,
  VerificationType,
  GitHubRepository,
  CareerDNA,
  GitHubSyncStatus,
  ResumeRecord,
  CodeforcesConnection,
  CodeforcesDNA,
  LeetCodeConnection,
  LeetCodeDNA,
  CertificateRecord,
  CertificateDNA,
  HuggingFaceConnectionRecord,
  HuggingFaceDNA,
  CompanyRecord,
  CompanyStatus,
  ModerationReport,
  ReportStatus,
  ReportTargetType,
  AdminUserRecord,
  AdminUserStatus,
  CollegeRecord,
  CollegeDepartment,
  CollegeBatch,
  CollegeDriveParticipation,
  CollegeParticipationStatus,
  CollegeProfile,
  DocumentType,
  DocumentStatus,
  DocumentVerificationMethod,
  DocumentExpiryStatus,
  DocumentVerificationAttempt,
  DocumentRecord,
  CandidateVerificationClaims,
} from "@/types";
import { defaultStudentUser, defaultAdminUser, defaultRecruiterUser, defaultCollegeUser } from "@/data/mock-users";
import { verificationRequests as initialVerificationRequests, auditLogs as initialAuditLogs, adminNotifications as initialAdminNotifications } from "@/data/mock-admin-data";
import { initialMockNotifications } from "@/data/mock-notifications";
import { isUniversityEmail } from "@/lib/utils";
import { recruitmentStore } from "@/lib/recruitment-store";

interface StoreState {
  verificationRequests: VerificationRequest[];
  studentProfiles: Map<string, StudentProfile>;
  recruiterProfiles: Map<string, RecruiterProfile>;
  adminProfiles: Map<string, AdminProfile>;
  collegeProfiles: Map<string, CollegeProfile>;
  companies: Map<string, CompanyRecord>;
  moderationReports: Map<string, ModerationReport>;
  auditLogs: AuditLogEntry[];
  adminNotifications: AdminNotificationItem[];
  studentNotifications: Map<string, NotificationItem[]>; // userId -> notifications
  githubConnections: Map<string, GitHubConnectionRecord>; // userId -> GitHubConnectionRecord
  githubRepositories: Map<string, GitHubRepository[]>; // userId -> GitHubRepository[]
  careerDNA: Map<string, CareerDNA>; // userId -> CareerDNA
  resumes: Map<string, ResumeRecord[]>; // userId -> ResumeRecord[]
  codeforcesConnections: Map<string, CodeforcesConnection>; // userId -> CodeforcesConnection
  codeforcesDNA: Map<string, CodeforcesDNA>; // userId -> CodeforcesDNA
  leetcodeConnections: Map<string, LeetCodeConnection>; // userId -> LeetCodeConnection
  leetcodeDNA: Map<string, LeetCodeDNA>; // userId -> LeetCodeDNA
  huggingfaceConnections: Map<string, HuggingFaceConnectionRecord>; // userId -> HuggingFaceConnectionRecord
  huggingfaceDNA: Map<string, HuggingFaceDNA>; // userId -> HuggingFaceDNA
  certificates: Map<string, CertificateRecord[]>; // userId -> CertificateRecord[]
  certificateDNA: Map<string, CertificateDNA>; // userId -> CertificateDNA
  colleges: Map<string, CollegeRecord>;
  collegeParticipation: Map<string, CollegeDriveParticipation[]>; // collegeId -> participations
  documents: Map<string, DocumentRecord[]>; // userId -> DocumentRecord[]
  documentAttempts: Map<string, DocumentVerificationAttempt[]>; // documentId -> DocumentVerificationAttempt[]
  documentBuffers: Map<string, Buffer>; // documentId -> Buffer
  verificationCounter: number;
  userCredentials: Map<string, UserCredentialRecord>; // email -> UserCredentialRecord
}

export interface UserCredentialRecord {
  userId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface GitHubConnectionRecord {
  id: string;
  userId: string;
  githubUserId: string;
  githubUsername: string;
  githubDisplayName: string | null;
  githubAvatarUrl: string | null;
  githubProfileUrl: string;
  accessTokenEncrypted: string;
  syncStatus?: GitHubSyncStatus;
  syncStartedAt?: string | null;
  syncCompletedAt?: string | null;
  syncError?: string | null;
  repositoriesCount?: number;
  projectsDetectedCount?: number;
  skillsDetectedCount?: number;
  connectedAt: string;
  updatedAt: string;
}

// Global declaration to maintain single memory store during Next.js dev hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __COMMANDSKILL_SERVER_STORE__: StoreState | undefined;
}

function initializeStore(): StoreState {
  const studentProfiles = new Map<string, StudentProfile>();
  const recruiterProfiles = new Map<string, RecruiterProfile>();
  const adminProfiles = new Map<string, AdminProfile>();
  const studentNotifications = new Map<string, NotificationItem[]>();
  const githubConnections = new Map<string, GitHubConnectionRecord>();
  const githubRepositories = new Map<string, GitHubRepository[]>();
  const careerDNA = new Map<string, CareerDNA>();
  const resumes = new Map<string, ResumeRecord[]>();
  const codeforcesConnections = new Map<string, CodeforcesConnection>();
  const codeforcesDNA = new Map<string, CodeforcesDNA>();

  // Initialize default student
  studentProfiles.set(defaultStudentUser.id, {
    ...defaultStudentUser,
    collegeId: "col_stanford",
    verificationStatus: "approved",
  });
  studentNotifications.set(defaultStudentUser.id, [...initialMockNotifications]);

  // Initialize default recruiter
  recruiterProfiles.set(defaultRecruiterUser.id, {
    ...defaultRecruiterUser,
  });

  // Initialize default admin
  adminProfiles.set(defaultAdminUser.id, {
    ...defaultAdminUser,
  });

  // Initialize default college
  const collegeProfiles = new Map<string, CollegeProfile>();
  collegeProfiles.set(defaultCollegeUser.id, {
    ...defaultCollegeUser,
  });

  // Clone initial verification requests
  const verificationRequests = JSON.parse(JSON.stringify(initialVerificationRequests)) as VerificationRequest[];

  // Also populate student profiles from the verification requests so all records are 100% unified
  verificationRequests.forEach((req) => {
    if (!studentProfiles.has(req.studentId)) {
      const mappedStatus: VerificationStatus =
        req.status === "Approved"
          ? "approved"
          : req.status === "Rejected"
          ? "rejected"
          : req.status === "Needs Information"
          ? "needs_information"
          : "pending";

      const uniName = (req.student.college || "").toLowerCase();
      let assignedCollegeId = "col_stanford";
      if (uniName.includes("berkeley")) assignedCollegeId = "col_berkeley";
      else if (uniName.includes("mit") || uniName.includes("massachusetts")) assignedCollegeId = "col_mit";
      else if (uniName.includes("cmu") || uniName.includes("carnegie")) assignedCollegeId = "col_cmu";
      else if (uniName.includes("niat")) assignedCollegeId = "col_niat";
      else if (uniName.includes("iit") || uniName.includes("madras")) assignedCollegeId = "col_iitm";

      studentProfiles.set(req.studentId, {
        id: req.studentId,
        name: req.student.fullName,
        email: req.student.email,
        role: "student",
        avatar: req.student.avatar,
        headline: `${req.student.degree} ${req.student.branch} @ ${req.student.college}`,
        university: req.student.college,
        collegeId: assignedCollegeId,
        degree: req.student.degree,
        branch: req.student.branch,
        academicStream: "Engineering & Technology",
        specialization: req.student.branch,
        academicLevel: "Undergraduate",
        yearOfStudy: req.student.year,
        graduationYear: parseInt(req.student.graduationYear, 10) || 2027,
        cgpa: "3.85",
        location: "Campus / Remote",
        bio: `Student at ${req.student.college} focusing on ${req.student.branch}.`,
        phone: req.student.phone,
        hasUniversityEmail: req.student.collegeEmail.endsWith(".edu") || req.student.collegeEmail.endsWith(".ac.in"),
        isUniversityEmail: req.student.collegeEmail.endsWith(".edu") || req.student.collegeEmail.endsWith(".ac.in"),
        personalEmail: req.student.email,
        accountStatus: "profile_complete",
        verificationStatus: mappedStatus,
        onboardingCompleted: true,
        verificationRequest: {
          id: `req_${req.verificationId}`,
          verificationId: req.verificationId,
          studentId: req.studentId,
          studentName: req.student.fullName,
          university: req.student.college,
          universityEmail: req.student.collegeEmail,
          verificationType: req.verificationMethod === "College Email" ? "university_email" : req.verificationMethod === "Payment Receipt" ? "payment_receipt" : "student_id_card",
          status: mappedStatus,
          documentName: req.document?.fileName || "Verification_Document.pdf",
          documentSize: req.document?.fileSize || "1.5 MB",
          documentUrl: req.document?.fileUrl || "#",
          personalEmail: req.student.email,
          submittedAt: req.submittedAt,
          reviewedAt: req.reviewedAt,
          reviewerName: req.reviewedBy,
          rejectionReason: req.rejectionReason,
          adminNotes: req.adminNotes,
        },
        status: "Open to Summer 2026 Internships",
        skills: ["React", "TypeScript", "Python", "Data Structures"],
        resume: {
          fileName: `${req.student.fullName.replace(" ", "_")}_Resume.pdf`,
          fileSize: "1.4 MB",
          uploadedAt: "Uploaded recently",
          url: "#",
        },
        projects: [
          {
            id: `proj_${req.studentId}_1`,
            title: "Campus Connect",
            description: "A collaborative academic hub for students and peers.",
            technologies: ["React", "TypeScript", "Node.js"],
            date: "Nov 2024",
            type: "Academic Project",
            featured: true,
          },
        ],
        certifications: [
          {
            id: `cert_${req.studentId}_1`,
            name: "Cloud Practitioner Certified",
            issuingOrganization: "AWS",
            issueDate: "2025",
            credentialId: `AWS-${req.studentId.toUpperCase()}`,
            credentialUrl: "https://aws.amazon.com",
          },
        ],
        socialLinks: {
          github: `https://github.com/${req.student.fullName.toLowerCase().replace(" ", "")}`,
          linkedin: `https://linkedin.com/in/${req.student.fullName.toLowerCase().replace(" ", "-")}`,
        },
        stats: {
          profileViews: 140,
          searchAppearances: 45,
          applicationsCount: 3,
          interviewsCount: 1,
        },
      });

      studentNotifications.set(req.studentId, [
        {
          id: `notif_${req.studentId}_1`,
          type: "system",
          title: "Account Created",
          description: "Welcome to CommandSkill! Verification process is underway.",
          timestamp: req.student.accountCreatedAt || "Recently",
          isRead: true,
        },
      ]);
    }
  });

  const companies = new Map<string, CompanyRecord>();
  const initialCompanies: CompanyRecord[] = [
    {
      id: "comp_stripe",
      name: "Stripe",
      website: "https://stripe.com",
      industry: "Fintech & Payments Infrastructure",
      size: "5000+ employees",
      location: "San Francisco, CA (Hybrid)",
      description: "Financial infrastructure for the internet, powering millions of businesses worldwide.",
      status: "VERIFIED",
      verificationTier: "ENTERPRISE",
      verifiedAt: "2026-01-10T10:00:00.000Z",
      verifiedBy: "admin_01",
      createdAt: "2025-11-15T09:00:00.000Z",
      updatedAt: "2026-02-01T12:00:00.000Z",
    },
    {
      id: "comp_openai",
      name: "OpenAI",
      website: "https://openai.com",
      industry: "Artificial Intelligence & Deep Learning",
      size: "1000-5000 employees",
      location: "San Francisco, CA",
      description: "Pioneering research and practical deployment of artificial general intelligence.",
      status: "VERIFIED",
      verificationTier: "ENTERPRISE",
      verifiedAt: "2026-01-12T14:30:00.000Z",
      verifiedBy: "admin_01",
      createdAt: "2025-12-01T08:00:00.000Z",
      updatedAt: "2026-02-15T16:00:00.000Z",
    },
    {
      id: "comp_vercel",
      name: "Vercel",
      website: "https://vercel.com",
      industry: "Cloud & Frontend Infrastructure",
      size: "500-1000 employees",
      location: "Remote",
      description: "Frontend cloud platform providing speed and developer workflow for the modern web.",
      status: "VERIFIED",
      verificationTier: "STANDARD",
      verifiedAt: "2026-01-20T11:00:00.000Z",
      verifiedBy: "admin_01",
      createdAt: "2025-12-10T10:00:00.000Z",
      updatedAt: "2026-01-20T11:00:00.000Z",
    },
    {
      id: "comp_datadog",
      name: "Datadog",
      website: "https://datadoghq.com",
      industry: "Cloud Observability & Security",
      size: "5000+ employees",
      location: "New York, NY",
      description: "Observability service for cloud-scale applications, monitoring servers, databases, and tools.",
      status: "VERIFIED",
      verificationTier: "STANDARD",
      verifiedAt: "2026-02-05T09:15:00.000Z",
      verifiedBy: "admin_01",
      createdAt: "2026-01-05T14:00:00.000Z",
      updatedAt: "2026-02-05T09:15:00.000Z",
    },
    {
      id: "comp_acme",
      name: "Acme Innovations",
      website: "https://acme-example.org",
      industry: "Consumer Software",
      size: "10-50 employees",
      location: "Austin, TX",
      description: "Early-stage enterprise tech incubator building real-time developer productivity systems.",
      status: "PENDING",
      verificationTier: "UNVERIFIED",
      createdAt: "2026-03-01T09:00:00.000Z",
      updatedAt: "2026-03-01T09:00:00.000Z",
    },
  ];
  initialCompanies.forEach((c) => companies.set(c.id, c));

  const moderationReports = new Map<string, ModerationReport>();
  const initialReports: ModerationReport[] = [
    {
      id: "rep_001",
      reporterId: "student_01",
      reporterName: "Alex Rivera",
      reporterEmail: "alex.rivera@stanford.edu",
      targetType: "DRIVE",
      targetId: "drive_001",
      targetTitle: "Software Engineering Intern - Summer 2026",
      reason: "Compensation details require clarification",
      details: "The posting description lists competitive stipend, but candidate FAQs request explicit monthly currency brackets.",
      status: "PENDING",
      createdAt: "2026-03-02T11:20:00.000Z",
    },
    {
      id: "rep_002",
      reporterId: "recruiter_01",
      reporterName: "Barun",
      reporterEmail: "barun@techcorp.io",
      targetType: "USER",
      targetId: "student_spam_99",
      targetTitle: "Candidate #9901 (Duplicate Identity)",
      reason: "Duplicate identity attempt detected",
      details: "Submitted identical resume under two different student emails within 10 minutes.",
      status: "PENDING",
      createdAt: "2026-03-04T15:45:00.000Z",
    },
  ];
  initialReports.forEach((r) => moderationReports.set(r.id, r));

  // Seed Institutional Colleges
  const colleges = new Map<string, CollegeRecord>();
  const collegeParticipation = new Map<string, CollegeDriveParticipation[]>();

  const initialColleges: CollegeRecord[] = [
    {
      id: "col_stanford",
      name: "Stanford University",
      code: "STAN",
      slug: "stanford-university",
      logo: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80",
      bannerImage: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1200&auto=format&fit=crop&q=80",
      location: "Stanford, CA, United States",
      website: "https://stanford.edu",
      establishedYear: 1885,
      status: "ACTIVE",
      placementOfficer: {
        name: "Dr. Ronald Evans",
        email: "placement@stanford.edu",
        phone: "+1 (650) 723-2300",
        designation: "Director of Career Development & Corporate Placements",
      },
      verificationStatus: "VERIFIED",
      departments: [
        {
          id: "dept_stan_cs",
          collegeId: "col_stanford",
          name: "Computer Science",
          code: "CS",
          headOfDepartment: "Prof. John Hennessy",
          studentCount: 480,
          eligibleCount: 420,
          placedCount: 336,
          placementRate: 70.0,
          activeDrivesCount: 14,
        },
        {
          id: "dept_stan_ee",
          collegeId: "col_stanford",
          name: "Electrical Engineering & Systems",
          code: "EE-SYS",
          headOfDepartment: "Prof. Andrea Goldsmith",
          studentCount: 320,
          eligibleCount: 280,
          placedCount: 224,
          placementRate: 70.0,
          activeDrivesCount: 10,
        },
        {
          id: "dept_stan_is",
          collegeId: "col_stanford",
          name: "Information Systems & AI",
          code: "IS-AI",
          headOfDepartment: "Prof. Fei-Fei Li",
          studentCount: 260,
          eligibleCount: 240,
          placedCount: 195,
          placementRate: 75.0,
          activeDrivesCount: 12,
        },
        {
          id: "dept_stan_me",
          collegeId: "col_stanford",
          name: "Mechanical & Mechatronics",
          code: "MECH",
          headOfDepartment: "Prof. Mark Cutkosky",
          studentCount: 188,
          eligibleCount: 150,
          placedCount: 110,
          placementRate: 58.5,
          activeDrivesCount: 7,
        },
      ],
      batches: [
        {
          id: "batch_stan_2025",
          collegeId: "col_stanford",
          year: 2025,
          degree: "B.S. / M.S.",
          totalStudents: 380,
          eligibleStudents: 360,
          placedStudents: 342,
          unplacedStudents: 18,
          activeApplications: 24,
          totalOffers: 428,
          placementRate: 95.0,
        },
        {
          id: "batch_stan_2026",
          collegeId: "col_stanford",
          year: 2026,
          degree: "B.S. / M.S.",
          totalStudents: 440,
          eligibleStudents: 410,
          placedStudents: 325,
          unplacedStudents: 85,
          activeApplications: 184,
          totalOffers: 378,
          placementRate: 73.8,
        },
        {
          id: "batch_stan_2027",
          collegeId: "col_stanford",
          year: 2027,
          degree: "B.S.",
          totalStudents: 428,
          eligibleStudents: 380,
          placedStudents: 198,
          unplacedStudents: 182,
          activeApplications: 290,
          totalOffers: 214,
          placementRate: 46.2,
        },
      ],
      placementPolicy: {
        minAttendancePercentage: 75,
        maxOffersAllowed: 2,
        dreamTierThresholdLpa: 45,
        allowSimultaneousInterview: false,
        rules: [
          "Students with CGPA >= 8.5 are eligible for Dream Tier opportunities without offer surrender.",
          "Maximum of 2 offers permitted per student before placement lock.",
          "75% minimum academic attendance mandatory for institutional placement drive nomination.",
          "Mandatory verification of academic transcripts and Career DNA credentials before drive enrollment."
        ],
      },
      stats: {
        totalStudents: 1248,
        eligibleStudents: 1150,
        placedStudents: 865,
        placementRate: 69.3,
        activeDrives: 14,
        totalOffers: 1020,
        companiesEngaged: 28,
        pendingVerifications: 12,
        averagePackage: "$118,500 / yr",
        highestPackage: "$175,000 / yr",
      },
      createdAt: "2025-09-01T08:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "col_berkeley",
      name: "UC Berkeley",
      code: "UCB",
      slug: "uc-berkeley",
      logo: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150&auto=format&fit=crop&q=80",
      location: "Berkeley, CA, United States",
      website: "https://berkeley.edu",
      establishedYear: 1868,
      status: "ACTIVE",
      placementOfficer: {
        name: "Dr. Sarah Jenkins",
        email: "careers@berkeley.edu",
        phone: "+1 (510) 642-6000",
        designation: "Head of University Relations & Placements",
      },
      verificationStatus: "VERIFIED",
      departments: [
        {
          id: "dept_ucb_eecs",
          collegeId: "col_berkeley",
          name: "Electrical Engineering & Computer Sciences",
          code: "EECS",
          headOfDepartment: "Prof. Claire Tomlin",
          studentCount: 520,
          eligibleCount: 470,
          placedCount: 380,
          placementRate: 73.1,
          activeDrivesCount: 16,
        },
      ],
      batches: [
        {
          id: "batch_ucb_2026",
          collegeId: "col_berkeley",
          year: 2026,
          degree: "B.S. in Computer Science",
          totalStudents: 480,
          eligibleStudents: 440,
          placedStudents: 360,
          unplacedStudents: 120,
          activeApplications: 190,
          totalOffers: 410,
          placementRate: 75.0,
        },
      ],
      placementPolicy: {
        minAttendancePercentage: 70,
        maxOffersAllowed: 2,
        dreamTierThresholdLpa: 40,
        rules: ["Single offer policy applicable unless dream company criteria satisfied."],
      },
      stats: {
        totalStudents: 880,
        eligibleStudents: 790,
        placedStudents: 630,
        placementRate: 71.6,
        activeDrives: 16,
        totalOffers: 740,
        companiesEngaged: 32,
        pendingVerifications: 8,
        averagePackage: "$114,000 / yr",
        highestPackage: "$168,000 / yr",
      },
      createdAt: "2025-09-10T08:00:00.000Z",
      updatedAt: "2026-03-05T12:00:00.000Z",
    },
    {
      id: "col_mit",
      name: "Massachusetts Institute of Technology",
      code: "MIT",
      slug: "mit",
      logo: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=150&auto=format&fit=crop&q=80",
      location: "Cambridge, MA, United States",
      website: "https://mit.edu",
      establishedYear: 1861,
      status: "ACTIVE",
      placementOfficer: {
        name: "Prof. Alan Vance",
        email: "placement@mit.edu",
        phone: "+1 (617) 253-1000",
        designation: "Dean of Industry Partnerships",
      },
      verificationStatus: "VERIFIED",
      departments: [
        {
          id: "dept_mit_eecs",
          collegeId: "col_mit",
          name: "EECS & Artificial Intelligence",
          code: "Course 6",
          studentCount: 410,
          eligibleCount: 390,
          placedCount: 335,
          placementRate: 81.7,
          activeDrivesCount: 18,
        },
      ],
      batches: [
        {
          id: "batch_mit_2026",
          collegeId: "col_mit",
          year: 2026,
          degree: "B.S. / M.Eng",
          totalStudents: 410,
          eligibleStudents: 390,
          placedStudents: 335,
          unplacedStudents: 75,
          activeApplications: 140,
          totalOffers: 420,
          placementRate: 81.7,
        },
      ],
      placementPolicy: {
        minAttendancePercentage: 75,
        maxOffersAllowed: 3,
        dreamTierThresholdLpa: 50,
        rules: ["Open recruitment for research and engineering tracks."],
      },
      stats: {
        totalStudents: 410,
        eligibleStudents: 390,
        placedStudents: 335,
        placementRate: 81.7,
        activeDrives: 18,
        totalOffers: 420,
        companiesEngaged: 35,
        pendingVerifications: 4,
        averagePackage: "$128,000 / yr",
        highestPackage: "$195,000 / yr",
      },
      createdAt: "2025-08-20T08:00:00.000Z",
      updatedAt: "2026-03-06T10:00:00.000Z",
    },
    {
      id: "col_cmu",
      name: "Carnegie Mellon University",
      code: "CMU",
      slug: "cmu",
      logo: "https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=150&auto=format&fit=crop&q=80",
      location: "Pittsburgh, PA, United States",
      website: "https://cmu.edu",
      establishedYear: 1900,
      status: "ACTIVE",
      placementOfficer: {
        name: "Dr. Rachel Green",
        email: "careers@cmu.edu",
        designation: "Head of Placement Operations",
      },
      verificationStatus: "VERIFIED",
      departments: [
        {
          id: "dept_cmu_scs",
          collegeId: "col_cmu",
          name: "School of Computer Science",
          code: "SCS",
          studentCount: 380,
          eligibleCount: 350,
          placedCount: 290,
          placementRate: 76.3,
          activeDrivesCount: 15,
        },
      ],
      batches: [
        {
          id: "batch_cmu_2026",
          collegeId: "col_cmu",
          year: 2026,
          degree: "B.S. in Computer Science",
          totalStudents: 380,
          eligibleStudents: 350,
          placedStudents: 290,
          unplacedStudents: 90,
          activeApplications: 130,
          totalOffers: 340,
          placementRate: 76.3,
        },
      ],
      placementPolicy: {
        rules: ["Standard campus placement protocols apply."],
      },
      stats: {
        totalStudents: 380,
        eligibleStudents: 350,
        placedStudents: 290,
        placementRate: 76.3,
        activeDrives: 15,
        totalOffers: 340,
        companiesEngaged: 25,
        pendingVerifications: 5,
        averagePackage: "$122,000 / yr",
        highestPackage: "$180,000 / yr",
      },
      createdAt: "2025-09-05T08:00:00.000Z",
      updatedAt: "2026-03-04T10:00:00.000Z",
    },
    {
      id: "col_niat",
      name: "National Institute of Applied Technology",
      code: "NIAT",
      slug: "niat",
      logo: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80",
      location: "Bengaluru, Karnataka, India",
      website: "https://niat.edu.in",
      establishedYear: 1998,
      status: "ACTIVE",
      placementOfficer: {
        name: "Prof. K. Ramesh",
        email: "placement@niat.edu",
        phone: "+91 80 2345 6789",
        designation: "Training & Placement Officer",
      },
      verificationStatus: "VERIFIED",
      departments: [
        {
          id: "dept_niat_aiml",
          collegeId: "col_niat",
          name: "Artificial Intelligence & Machine Learning",
          code: "AI-ML",
          studentCount: 240,
          eligibleCount: 210,
          placedCount: 155,
          placementRate: 64.5,
          activeDrivesCount: 9,
        },
      ],
      batches: [
        {
          id: "batch_niat_2027",
          collegeId: "col_niat",
          year: 2027,
          degree: "B.Tech",
          totalStudents: 240,
          eligibleStudents: 210,
          placedStudents: 155,
          unplacedStudents: 85,
          activeApplications: 120,
          totalOffers: 180,
          placementRate: 64.5,
        },
      ],
      placementPolicy: {
        rules: ["Minimum 75% attendance required for campus placement drive registration."],
      },
      stats: {
        totalStudents: 240,
        eligibleStudents: 210,
        placedStudents: 155,
        placementRate: 64.5,
        activeDrives: 9,
        totalOffers: 180,
        companiesEngaged: 18,
        pendingVerifications: 14,
        averagePackage: "₹14.5 LPA",
        highestPackage: "₹42.0 LPA",
      },
      createdAt: "2025-10-01T08:00:00.000Z",
      updatedAt: "2026-03-02T10:00:00.000Z",
    },
    {
      id: "col_iitm",
      name: "Indian Institute of Technology Madras",
      code: "IITM",
      slug: "iit-madras",
      logo: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=150&auto=format&fit=crop&q=80",
      location: "Chennai, Tamil Nadu, India",
      website: "https://iitm.ac.in",
      establishedYear: 1959,
      status: "PENDING",
      placementOfficer: {
        name: "Dr. Satish Babu",
        email: "tpo@iitm.ac.in",
        phone: "+91 44 2257 8000",
        designation: "Advisor (Training & Placement)",
      },
      verificationStatus: "PENDING",
      departments: [
        {
          id: "dept_iitm_cse",
          collegeId: "col_iitm",
          name: "Computer Science & Engineering",
          code: "CSE",
          studentCount: 180,
          eligibleCount: 175,
          placedCount: 0,
          placementRate: 0,
          activeDrivesCount: 0,
        },
      ],
      batches: [
        {
          id: "batch_iitm_2028",
          collegeId: "col_iitm",
          year: 2028,
          degree: "B.Tech",
          totalStudents: 180,
          eligibleStudents: 175,
          placedStudents: 0,
          unplacedStudents: 180,
          activeApplications: 0,
          totalOffers: 0,
          placementRate: 0,
        },
      ],
      placementPolicy: {
        rules: ["Awaiting institutional onboarding accreditation confirmation."],
      },
      stats: {
        totalStudents: 180,
        eligibleStudents: 175,
        placedStudents: 0,
        placementRate: 0,
        activeDrives: 0,
        totalOffers: 0,
        companiesEngaged: 0,
        pendingVerifications: 2,
        averagePackage: "Pending",
        highestPackage: "Pending",
      },
      createdAt: "2026-03-01T08:00:00.000Z",
      updatedAt: "2026-03-01T08:00:00.000Z",
    },
  ];
  initialColleges.forEach((c) => colleges.set(c.id, c));

  const initialParticipation: CollegeDriveParticipation[] = [
    {
      id: "part_stan_001",
      collegeId: "col_stanford",
      driveId: "drive_001",
      driveTitle: "Software Engineering Intern - Summer 2026",
      companyName: "Stripe",
      status: "ACTIVE",
      approvedAt: "2026-03-01T10:00:00.000Z",
      approvedBy: "Dr. Ronald Evans",
      registeredStudentsCount: 142,
      eligibleStudentsCount: 128,
      shortlistedCount: 32,
      interviewedCount: 18,
      selectedCount: 8,
      offersCount: 8,
      updatedAt: "2026-03-07T12:00:00.000Z",
    },
    {
      id: "part_stan_002",
      collegeId: "col_stanford",
      driveId: "drive_aiml_2026",
      driveTitle: "AI & Machine Learning Engineer 2026",
      companyName: "OpenAI",
      status: "APPROVED",
      approvedAt: "2026-03-06T14:00:00.000Z",
      approvedBy: "Dr. Ronald Evans",
      registeredStudentsCount: 96,
      eligibleStudentsCount: 88,
      shortlistedCount: 14,
      interviewedCount: 6,
      selectedCount: 2,
      offersCount: 2,
      updatedAt: "2026-03-08T11:00:00.000Z",
    },
  ];
  collegeParticipation.set("col_stanford", initialParticipation);

  // Seed additional realistic students for Stanford University
  const additionalStanfordStudents: StudentProfile[] = [
    {
      id: "student_stan_02",
      name: "Maya Lin",
      email: "maya.lin@stanford.edu",
      role: "student",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      headline: "CS Senior @ Stanford | Full-Stack, Distributed Systems & React",
      university: "Stanford University",
      collegeId: "col_stanford",
      degree: "B.S. in Computer Science",
      branch: "Computer Science",
      academicStream: "Engineering & Technology",
      specialization: "Computer Systems",
      academicLevel: "Undergraduate",
      yearOfStudy: "Senior (4th Year)",
      graduationYear: 2026,
      cgpa: "3.85",
      location: "Palo Alto, CA",
      bio: "Undergraduate researcher in distributed caching and micro-frontend systems. Ex-intern at Datadog.",
      hasUniversityEmail: true,
      isUniversityEmail: true,
      personalEmail: "maya.lin.dev@gmail.com",
      accountStatus: "profile_complete",
      verificationStatus: "approved",
      onboardingCompleted: true,
      status: "Open to Summer 2026 Internships",
      skills: ["TypeScript", "React", "Node.js", "Python", "PostgreSQL", "Docker", "System Design"],
      resume: {
        fileName: "Maya_Lin_Resume_2026.pdf",
        fileSize: "1.3 MB",
        uploadedAt: "Uploaded 3 days ago",
        url: "#",
      },
      projects: [],
      certifications: [],
      socialLinks: { github: "https://github.com/mayalin", linkedin: "https://linkedin.com/in/mayalin" },
      stats: { profileViews: 240, searchAppearances: 60, applicationsCount: 4, interviewsCount: 2 },
    },
    {
      id: "student_stan_03",
      name: "David Kim",
      email: "david.kim@stanford.edu",
      role: "student",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
      headline: "Junior @ Stanford EE & AI | Embedded Systems, PyTorch & C++",
      university: "Stanford University",
      collegeId: "col_stanford",
      degree: "B.S. in Electrical Engineering",
      branch: "Electrical Engineering & Systems",
      academicStream: "Engineering & Technology",
      specialization: "Signals & Machine Learning",
      academicLevel: "Undergraduate",
      yearOfStudy: "Junior (3rd Year)",
      graduationYear: 2026,
      cgpa: "3.78",
      location: "San Jose, CA",
      bio: "Focusing on hardware acceleration and edge AI inferences. Passionate about robotics.",
      hasUniversityEmail: true,
      isUniversityEmail: true,
      accountStatus: "profile_complete",
      verificationStatus: "approved",
      onboardingCompleted: true,
      status: "Open to Summer 2026 Internships",
      skills: ["Python", "PyTorch", "C++", "FastAPI", "Docker", "Linux"],
      resume: {
        fileName: "David_Kim_EE_Resume.pdf",
        fileSize: "1.1 MB",
        uploadedAt: "Uploaded 1 week ago",
        url: "#",
      },
      projects: [],
      certifications: [],
      socialLinks: { github: "https://github.com/davidkim-ee" },
      stats: { profileViews: 190, searchAppearances: 42, applicationsCount: 3, interviewsCount: 1 },
    },
    {
      id: "student_stan_04",
      name: "Chloe Bennett",
      email: "chloe.bennett@stanford.edu",
      role: "student",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      headline: "AI / ML Sophomore @ Stanford | LLM Fine-Tuning & Prompt Engineering",
      university: "Stanford University",
      collegeId: "col_stanford",
      degree: "B.S. in Information Systems",
      branch: "Information Systems & AI",
      academicStream: "Engineering & Technology",
      specialization: "AI Systems",
      academicLevel: "Undergraduate",
      yearOfStudy: "Sophomore (2nd Year)",
      graduationYear: 2027,
      cgpa: "3.95",
      location: "Stanford, CA",
      bio: "Building multimodal reasoning datasets and retrieval-augmented pipelines.",
      hasUniversityEmail: true,
      isUniversityEmail: true,
      accountStatus: "profile_complete",
      verificationStatus: "approved",
      onboardingCompleted: true,
      status: "Open to Summer 2026 Internships",
      skills: ["Python", "TypeScript", "React", "PyTorch", "FastAPI", "Vector DBs"],
      resume: {
        fileName: "Chloe_Bennett_CV.pdf",
        fileSize: "1.5 MB",
        uploadedAt: "Uploaded yesterday",
        url: "#",
      },
      projects: [],
      certifications: [],
      socialLinks: { github: "https://github.com/chloebennett" },
      stats: { profileViews: 310, searchAppearances: 78, applicationsCount: 2, interviewsCount: 2 },
    },
    {
      id: "student_stan_05",
      name: "Ethan Wright",
      email: "ethan.wright@stanford.edu",
      role: "student",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      headline: "Stanford Mechanical Engineering Graduate '25 | CAD, Robotics & Python",
      university: "Stanford University",
      collegeId: "col_stanford",
      degree: "B.S. in Mechanical Engineering",
      branch: "Mechanical & Mechatronics",
      academicStream: "Engineering & Technology",
      specialization: "Robotics & Controls",
      academicLevel: "Undergraduate",
      yearOfStudy: "Senior (4th Year)",
      graduationYear: 2025,
      cgpa: "3.65",
      location: "Palo Alto, CA",
      bio: "Mechatronics enthusiast with experience in autonomous mobile robot chassis design.",
      hasUniversityEmail: true,
      isUniversityEmail: true,
      accountStatus: "profile_complete",
      verificationStatus: "approved",
      onboardingCompleted: true,
      status: "Open to Summer 2026 Internships",
      skills: ["Python", "C++", "ROS", "CAD", "Robotics"],
      resume: {
        fileName: "Ethan_Wright_MechE.pdf",
        fileSize: "1.2 MB",
        uploadedAt: "Uploaded 2 weeks ago",
        url: "#",
      },
      projects: [],
      certifications: [],
      socialLinks: {},
      stats: { profileViews: 140, searchAppearances: 30, applicationsCount: 1, interviewsCount: 1 },
    },
    {
      id: "student_stan_06",
      name: "Aisha Patel",
      email: "aisha.patel@stanford.edu",
      role: "student",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      headline: "CS Sophomore @ Stanford | Web Development, Algorithms & Open Source",
      university: "Stanford University",
      collegeId: "col_stanford",
      degree: "B.S. in Computer Science",
      branch: "Computer Science",
      academicStream: "Engineering & Technology",
      specialization: "Software Systems",
      academicLevel: "Undergraduate",
      yearOfStudy: "Sophomore (2nd Year)",
      graduationYear: 2027,
      cgpa: "3.45",
      location: "San Francisco, CA",
      bio: "Enthusiastic beginner in scalable web applications and community hackathon organizer.",
      hasUniversityEmail: true,
      isUniversityEmail: true,
      accountStatus: "profile_complete",
      verificationStatus: "pending",
      onboardingCompleted: true,
      status: "Looking for Part-time",
      skills: ["JavaScript", "React", "HTML/CSS", "Python"],
      resume: null,
      projects: [],
      certifications: [],
      socialLinks: { github: "https://github.com/aishapatel" },
      stats: { profileViews: 85, searchAppearances: 18, applicationsCount: 2, interviewsCount: 0 },
    },
  ];

  additionalStanfordStudents.forEach((st) => {
    if (!studentProfiles.has(st.id)) {
      studentProfiles.set(st.id, st);
    }
  });

  // Seed institutional test profiles for identity resolution & same-name disambiguation
  const institutionalTestStudents: StudentProfile[] = [
    {
      id: "student_akash_01",
      name: "Akash Sharma",
      email: "akash1@abc.edu",
      role: "student",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      headline: "Computer Science @ ABC Institute | Candidate #1",
      university: "ABC Institute of Technology",
      collegeId: "col_abc",
      studentId: "CSE2024012",
      enrollmentNumber: "EN2024012",
      rollNumber: "2024CSE012",
      institutionalId: "CSE2024012",
      degree: "B.Tech in Computer Science & Engineering",
      branch: "Computer Science & Engineering",
      academicStream: "Engineering & Technology",
      academicLevel: "Undergraduate",
      graduationYear: 2026,
      cgpa: "8.85 / 10",
      location: "New Delhi, India",
      bio: "Software developer focusing on distributed systems and cloud platforms.",
      hasUniversityEmail: true,
      isUniversityEmail: true,
      accountStatus: "profile_complete",
      verificationStatus: "approved",
      onboardingCompleted: true,
      status: "Open to Summer 2026 Internships",
      skills: ["Java", "Spring Boot", "TypeScript", "React", "PostgreSQL"],
      resume: null,
      projects: [],
      certifications: [],
      socialLinks: {},
      stats: { profileViews: 120, searchAppearances: 34, applicationsCount: 3, interviewsCount: 1 },
    },
    {
      id: "student_akash_02",
      name: "Akash Sharma",
      email: "akash2@abc.edu",
      role: "student",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      headline: "Computer Science @ ABC Institute | Candidate #2",
      university: "ABC Institute of Technology",
      collegeId: "col_abc",
      studentId: "CSE2024078",
      enrollmentNumber: "EN2024078",
      rollNumber: "2024CSE078",
      institutionalId: "CSE2024078",
      degree: "B.Tech in Computer Science & Engineering",
      branch: "Computer Science & Engineering",
      academicStream: "Engineering & Technology",
      academicLevel: "Undergraduate",
      graduationYear: 2026,
      cgpa: "8.42 / 10",
      location: "New Delhi, India",
      bio: "Full stack developer interested in microservices and Kubernetes.",
      hasUniversityEmail: true,
      isUniversityEmail: true,
      accountStatus: "profile_complete",
      verificationStatus: "approved",
      onboardingCompleted: true,
      status: "Open to Summer 2026 Internships",
      skills: ["Python", "Django", "React", "Docker"],
      resume: null,
      projects: [],
      certifications: [],
      socialLinks: {},
      stats: { profileViews: 90, searchAppearances: 22, applicationsCount: 2, interviewsCount: 0 },
    },
    {
      id: "student_rahul_01",
      name: "Rahul Sharma",
      email: "rahul.sharma@abc.edu",
      role: "student",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      headline: "B.Tech CSE @ ABC Institute | Mobile & Web Apps",
      university: "ABC Institute of Technology",
      collegeId: "col_abc",
      studentId: "2024CSE001",
      enrollmentNumber: "2024CSE001",
      rollNumber: "2024CSE001",
      institutionalId: "2024CSE001",
      degree: "B.Tech in Computer Science",
      branch: "Computer Science",
      academicStream: "Engineering & Technology",
      academicLevel: "Undergraduate",
      graduationYear: 2026,
      cgpa: "9.10 / 10",
      location: "Bengaluru, India",
      bio: "Passionate about mobile apps and modern web frameworks.",
      hasUniversityEmail: true,
      isUniversityEmail: true,
      accountStatus: "profile_complete",
      verificationStatus: "approved",
      onboardingCompleted: true,
      status: "Open to Summer 2026 Internships",
      skills: ["Flutter", "Kotlin", "React", "Node.js"],
      resume: null,
      projects: [],
      certifications: [],
      socialLinks: {},
      stats: { profileViews: 140, searchAppearances: 45, applicationsCount: 4, interviewsCount: 2 },
    },
  ];

  institutionalTestStudents.forEach((st) => {
    if (!studentProfiles.has(st.id)) {
      studentProfiles.set(st.id, st);
    }
  });

  const initialDocuments = new Map<string, DocumentRecord[]>();
  const initialDocumentAttempts = new Map<string, DocumentVerificationAttempt[]>();

  const alexDocs: DocumentRecord[] = [
    {
      id: "doc_alex_resume",
      userId: defaultStudentUser.id,
      studentName: defaultStudentUser.name,
      studentEmail: defaultStudentUser.email,
      collegeName: defaultStudentUser.university,
      documentType: "RESUME",
      fileName: "Alex_Rivera_Software_Resume_2026.pdf",
      storageKey: "documents/std_default_01/doc_alex_resume.pdf",
      mimeType: "application/pdf",
      fileSize: "1.4 MB",
      fileSizeBytes: 1468006,
      uploadedAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
      verificationStatus: "AUTO_VERIFIED",
      verificationMethod: "AUTOMATED",
      confidenceScore: 96,
      verifiedBy: "Automated OCR Verification Engine",
      verifiedAt: "2026-03-01T10:00:05.000Z",
      isSensitive: false,
      isShareableWithRecruiters: true,
      matchedFields: ["name", "college", "degree", "graduation_year"],
      failedChecks: [],
      warnings: [],
      decisionReason: "Verified automatically with high multi-factor confidence.",
    },
    {
      id: "doc_alex_degree",
      userId: defaultStudentUser.id,
      studentName: defaultStudentUser.name,
      studentEmail: defaultStudentUser.email,
      collegeName: defaultStudentUser.university,
      documentType: "DEGREE_CERTIFICATE",
      fileName: "Stanford_University_B.S._Computer_Science_Provisional.pdf",
      storageKey: "documents/std_default_01/doc_alex_degree.pdf",
      mimeType: "application/pdf",
      fileSize: "2.1 MB",
      fileSizeBytes: 2202009,
      uploadedAt: "2026-03-04T11:20:00.000Z",
      updatedAt: "2026-03-04T11:20:00.000Z",
      verificationStatus: "NEEDS_REVIEW",
      verificationMethod: "AUTOMATED",
      confidenceScore: 74,
      isSensitive: false,
      isShareableWithRecruiters: false,
      matchedFields: ["college", "degree", "graduation_year"],
      failedChecks: ["name"],
      warnings: [
        "Possible name spelling variation in OCR stream: 'Alex R. Rivera' vs 'Alex Rivera'",
        "Specialization detected with partial OCR confidence",
      ],
      decisionReason: "Possible name mismatch detected in OCR stream.",
    },
    {
      id: "doc_alex_marksheet",
      userId: defaultStudentUser.id,
      studentName: defaultStudentUser.name,
      studentEmail: defaultStudentUser.email,
      collegeName: defaultStudentUser.university,
      documentType: "MARKSHEET",
      fileName: "Semester_5_Academic_Transcript_Official.pdf",
      storageKey: "documents/std_default_01/doc_alex_marksheet.pdf",
      mimeType: "application/pdf",
      fileSize: "1.8 MB",
      fileSizeBytes: 1887436,
      uploadedAt: "2026-02-28T09:15:00.000Z",
      updatedAt: "2026-02-28T09:15:00.000Z",
      verificationStatus: "AUTO_VERIFIED",
      verificationMethod: "AUTOMATED",
      confidenceScore: 92,
      verifiedBy: "Automated OCR Verification Engine",
      verifiedAt: "2026-02-28T09:15:04.000Z",
      isSensitive: false,
      isShareableWithRecruiters: false,
      matchedFields: ["name", "college", "cgpa", "academic_stream"],
      failedChecks: [],
      warnings: [],
      decisionReason: "Verified automatically with high multi-factor confidence.",
    },
    {
      id: "doc_alex_govid",
      userId: defaultStudentUser.id,
      studentName: defaultStudentUser.name,
      studentEmail: defaultStudentUser.email,
      collegeName: defaultStudentUser.university,
      documentType: "GOVERNMENT_ID",
      fileName: "Passport_Identity_Verification_Document.pdf",
      storageKey: "documents/std_default_01/doc_alex_govid.pdf",
      mimeType: "application/pdf",
      fileSize: "1.1 MB",
      fileSizeBytes: 1153433,
      uploadedAt: "2026-01-15T14:00:00.000Z",
      updatedAt: "2026-01-15T14:00:00.000Z",
      verificationStatus: "AUTO_VERIFIED",
      verificationMethod: "AUTOMATED",
      confidenceScore: 98,
      verifiedBy: "Automated Identity Verification Pipeline",
      verifiedAt: "2026-01-15T14:00:03.000Z",
      isSensitive: true,
      isShareableWithRecruiters: false,
      matchedFields: ["name", "dob"],
      failedChecks: [],
      warnings: [],
      decisionReason: "Official government identification verified.",
    },
    {
      id: "doc_alex_internship",
      userId: defaultStudentUser.id,
      studentName: defaultStudentUser.name,
      studentEmail: defaultStudentUser.email,
      collegeName: defaultStudentUser.university,
      documentType: "INTERNSHIP_CERTIFICATE",
      fileName: "Datadog_Software_Engineering_Internship_Certificate.pdf",
      storageKey: "documents/std_default_01/doc_alex_internship.pdf",
      mimeType: "application/pdf",
      fileSize: "1.2 MB",
      fileSizeBytes: 1258291,
      uploadedAt: "2026-02-10T16:30:00.000Z",
      updatedAt: "2026-02-12T10:00:00.000Z",
      verificationStatus: "VERIFIED",
      verificationMethod: "VERIFICATION_OFFICER",
      confidenceScore: 90,
      verifiedBy: "Priya Menon (Verification Officer)",
      verifiedAt: "2026-02-12T10:00:00.000Z",
      isSensitive: false,
      isShareableWithRecruiters: false,
      matchedFields: ["name", "company", "role", "dates"],
      failedChecks: [],
      warnings: [],
      decisionReason: "Verified by Verification Officer after confirming issuer corporate domain.",
    },
    {
      id: "doc_alex_college_id",
      userId: defaultStudentUser.id,
      studentName: defaultStudentUser.name,
      studentEmail: defaultStudentUser.email,
      collegeName: defaultStudentUser.university,
      documentType: "COLLEGE_ID",
      fileName: "Stanford_Student_Campus_ID.jpg",
      storageKey: "documents/std_default_01/doc_alex_college_id.jpg",
      mimeType: "image/jpeg",
      fileSize: "640 KB",
      fileSizeBytes: 655360,
      uploadedAt: "2026-03-05T08:00:00.000Z",
      updatedAt: "2026-03-05T08:00:00.000Z",
      verificationStatus: "REUPLOAD_REQUIRED",
      verificationMethod: "AUTOMATED",
      confidenceScore: 35,
      reuploadReason: "Uploaded scan is blurry and student roll ID number is illegible. Please upload a high-resolution color photo or PDF scan.",
      isSensitive: true,
      isShareableWithRecruiters: false,
      matchedFields: [],
      failedChecks: ["clarity_and_resolution", "barcode_unreadable"],
      warnings: ["Image resolution too low for automated optical character recognition."],
      decisionReason: "Low OCR confidence and blurred roll number.",
    },
  ];

  initialDocuments.set(defaultStudentUser.id, alexDocs);
  initialDocuments.set("student_01", alexDocs);

  const initialStore: StoreState = {
    verificationRequests,
    studentProfiles,
    recruiterProfiles,
    adminProfiles,
    collegeProfiles,
    companies,
    moderationReports,
    auditLogs: JSON.parse(JSON.stringify(initialAuditLogs)),
    adminNotifications: JSON.parse(JSON.stringify(initialAdminNotifications)),
    studentNotifications,
    githubConnections,
    githubRepositories,
    careerDNA,
    resumes,
    codeforcesConnections,
    codeforcesDNA,
    leetcodeConnections: new Map<string, LeetCodeConnection>(),
    leetcodeDNA: new Map<string, LeetCodeDNA>(),
    huggingfaceConnections: new Map<string, HuggingFaceConnectionRecord>(),
    huggingfaceDNA: new Map<string, HuggingFaceDNA>(),
    certificates: new Map<string, CertificateRecord[]>(),
    certificateDNA: new Map<string, CertificateDNA>(),
    colleges,
    collegeParticipation,
    documents: initialDocuments,
    documentAttempts: initialDocumentAttempts,
    documentBuffers: new Map<string, Buffer>(),
    verificationCounter: 4814,
    userCredentials: new Map<string, UserCredentialRecord>(),
  };

  loadStoreFromDisk(initialStore);
  return initialStore;
}

const DB_FILE_PATH = path.join(process.cwd(), ".data", "server-store-db.json");

function loadStoreFromDisk(storeObj: StoreState): void {
  try {
    if (!fs.existsSync(DB_FILE_PATH)) return;
    const raw = fs.readFileSync(DB_FILE_PATH, "utf-8");
    if (!raw.trim()) return;
    const data = JSON.parse(raw);

    if (data.companies && Array.isArray(data.companies)) {
      data.companies.forEach(([key, val]: [string, CompanyRecord]) => {
        storeObj.companies.set(key, val);
      });
    }
    if (data.moderationReports && Array.isArray(data.moderationReports)) {
      data.moderationReports.forEach(([key, val]: [string, ModerationReport]) => {
        storeObj.moderationReports.set(key, val);
      });
    }
    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      storeObj.auditLogs = data.auditLogs;
    }
    if (data.recruiterProfiles && Array.isArray(data.recruiterProfiles)) {
      data.recruiterProfiles.forEach(([key, val]: [string, RecruiterProfile]) => {
        storeObj.recruiterProfiles.set(key, val);
      });
    }
    if (data.adminProfiles && Array.isArray(data.adminProfiles)) {
      data.adminProfiles.forEach(([key, val]: [string, AdminProfile]) => {
        storeObj.adminProfiles.set(key, val);
      });
    }
    if (data.codeforcesConnections && Array.isArray(data.codeforcesConnections)) {
      data.codeforcesConnections.forEach(([key, val]: [string, CodeforcesConnection]) => {
        storeObj.codeforcesConnections.set(key, val);
      });
    }
    if (data.codeforcesDNA && Array.isArray(data.codeforcesDNA)) {
      data.codeforcesDNA.forEach(([key, val]: [string, CodeforcesDNA]) => {
        storeObj.codeforcesDNA.set(key, val);
      });
    }
    if (data.leetcodeConnections && Array.isArray(data.leetcodeConnections)) {
      data.leetcodeConnections.forEach(([key, val]: [string, LeetCodeConnection]) => {
        storeObj.leetcodeConnections.set(key, val);
      });
    }
    if (data.leetcodeDNA && Array.isArray(data.leetcodeDNA)) {
      data.leetcodeDNA.forEach(([key, val]: [string, LeetCodeDNA]) => {
        storeObj.leetcodeDNA.set(key, val);
      });
    }
    if (data.githubConnections && Array.isArray(data.githubConnections)) {
      data.githubConnections.forEach(([key, val]: [string, GitHubConnectionRecord]) => {
        storeObj.githubConnections.set(key, val);
      });
    }
    if (data.githubRepositories && Array.isArray(data.githubRepositories)) {
      data.githubRepositories.forEach(([key, val]: [string, GitHubRepository[]]) => {
        storeObj.githubRepositories.set(key, val);
      });
    }
    if (data.huggingfaceConnections && Array.isArray(data.huggingfaceConnections)) {
      data.huggingfaceConnections.forEach(([key, val]: [string, HuggingFaceConnectionRecord]) => {
        storeObj.huggingfaceConnections.set(key, val);
      });
    }
    if (data.huggingfaceDNA && Array.isArray(data.huggingfaceDNA)) {
      data.huggingfaceDNA.forEach(([key, val]: [string, HuggingFaceDNA]) => {
        storeObj.huggingfaceDNA.set(key, val);
      });
    }
    if (data.certificates && Array.isArray(data.certificates)) {
      data.certificates.forEach(([key, val]: [string, CertificateRecord[]]) => {
        storeObj.certificates.set(key, val);
      });
    }
    if (data.certificateDNA && Array.isArray(data.certificateDNA)) {
      data.certificateDNA.forEach(([key, val]: [string, CertificateDNA]) => {
        storeObj.certificateDNA.set(key, val);
      });
    }
    if (data.resumes && Array.isArray(data.resumes)) {
      data.resumes.forEach(([key, val]: [string, ResumeRecord[]]) => {
        storeObj.resumes.set(key, val);
      });
    }
    if (data.careerDNA && Array.isArray(data.careerDNA)) {
      data.careerDNA.forEach(([key, val]: [string, CareerDNA]) => {
        storeObj.careerDNA.set(key, val);
      });
    }
    if (data.colleges && Array.isArray(data.colleges) && data.colleges.length > 0) {
      data.colleges.forEach(([key, val]: [string, CollegeRecord]) => {
        storeObj.colleges.set(key, val);
      });
    }
    if (data.collegeParticipation && Array.isArray(data.collegeParticipation) && data.collegeParticipation.length > 0) {
      data.collegeParticipation.forEach(([key, val]: [string, CollegeDriveParticipation[]]) => {
        storeObj.collegeParticipation.set(key, val);
      });
    }
  } catch (err) {
    console.warn("Failed to load server store from disk:", err);
  }
}

export function persistStoreToDisk(): void {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const serializable = {
      companies: Array.from(store.companies.entries()),
      moderationReports: Array.from(store.moderationReports.entries()),
      auditLogs: store.auditLogs,
      recruiterProfiles: Array.from(store.recruiterProfiles.entries()),
      adminProfiles: Array.from(store.adminProfiles.entries()),
      codeforcesConnections: Array.from(store.codeforcesConnections.entries()),
      codeforcesDNA: Array.from(store.codeforcesDNA.entries()),
      leetcodeConnections: Array.from(store.leetcodeConnections.entries()),
      leetcodeDNA: Array.from(store.leetcodeDNA.entries()),
      githubConnections: Array.from(store.githubConnections.entries()),
      githubRepositories: Array.from(store.githubRepositories.entries()),
      huggingfaceConnections: Array.from(store.huggingfaceConnections.entries()),
      huggingfaceDNA: Array.from(store.huggingfaceDNA.entries()),
      certificates: Array.from(store.certificates.entries()),
      certificateDNA: Array.from(store.certificateDNA.entries()),
      resumes: Array.from(store.resumes.entries()),
      careerDNA: Array.from(store.careerDNA.entries()),
      colleges: Array.from(store.colleges.entries()),
      collegeParticipation: Array.from(store.collegeParticipation.entries()),
    };

    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(serializable, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist server store to disk:", err);
  }
}

const store: StoreState = global.__COMMANDSKILL_SERVER_STORE__ || (global.__COMMANDSKILL_SERVER_STORE__ = initializeStore());

export function ensureCollegeStore(): void {
  if (!store.collegeProfiles || store.collegeProfiles.size === 0) {
    if (!store.collegeProfiles) store.collegeProfiles = new Map();
    store.collegeProfiles.set(defaultCollegeUser.id, { ...defaultCollegeUser });
  }
  if (!store.colleges || store.colleges.size === 0 || !store.collegeParticipation) {
    const fresh = initializeStore();
    if (!store.colleges || store.colleges.size === 0) {
      store.colleges = fresh.colleges;
    }
    if (!store.collegeParticipation) {
      store.collegeParticipation = fresh.collegeParticipation;
    }
  }
}

export function ensureCredentialsStore(): void {
  if (!store.userCredentials || store.userCredentials.size === 0) {
    if (!store.userCredentials) store.userCredentials = new Map();

    store.userCredentials.set("alex.rivera@stanford.edu", {
      userId: "student_01",
      email: "alex.rivera@stanford.edu",
      passwordHash: "commandskill123",
      role: "STUDENT",
      createdAt: new Date().toISOString(),
    });
    store.userCredentials.set("alex.rivera@university.edu", {
      userId: "student_01",
      email: "alex.rivera@university.edu",
      passwordHash: "commandskill123",
      role: "STUDENT",
      createdAt: new Date().toISOString(),
    });
    store.userCredentials.set("barun@stripe-careers.com", {
      userId: "recruiter_01",
      email: "barun@stripe-careers.com",
      passwordHash: "recruiter123",
      role: "RECRUITER",
      createdAt: new Date().toISOString(),
    });
    store.userCredentials.set("sarah.chen@stripe-careers.com", {
      userId: "recruiter_01",
      email: "sarah.chen@stripe-careers.com",
      passwordHash: "recruiter123",
      role: "RECRUITER",
      createdAt: new Date().toISOString(),
    });
    store.userCredentials.set("placement@stanford.edu", {
      userId: "college_01",
      email: "placement@stanford.edu",
      passwordHash: "college123",
      role: "COLLEGE_ADMIN",
      createdAt: new Date().toISOString(),
    });
    store.userCredentials.set("priya.menon@commandskill.io", {
      userId: "admin_01",
      email: "priya.menon@commandskill.io",
      passwordHash: "admin123",
      role: "PLATFORM_ADMIN",
      createdAt: new Date().toISOString(),
    });
    store.userCredentials.set("admin@commandskill.io", {
      userId: "admin_01",
      email: "admin@commandskill.io",
      passwordHash: "admin123",
      role: "PLATFORM_ADMIN",
      createdAt: new Date().toISOString(),
    });

    const envAdminEmail = (process.env.ADMIN_EMAIL || "akash002007@gmail.com").trim().toLowerCase();
    const envAdminPassword = (process.env.ADMIN_PASSWORD || "1234567890").trim();
    store.userCredentials.set(envAdminEmail, {
      userId: "admin_01",
      email: envAdminEmail,
      passwordHash: envAdminPassword,
      role: "PLATFORM_ADMIN",
      createdAt: new Date().toISOString(),
    });
  }
}

ensureCollegeStore();
ensureCredentialsStore();

export class ServerStore {
  static getUserById(userId: string): any {
    return (
      store.studentProfiles.get(userId) ||
      store.recruiterProfiles.get(userId) ||
      (store.collegeProfiles && store.collegeProfiles.get(userId)) ||
      store.adminProfiles.get(userId) ||
      null
    );
  }

  static getMetrics(): AdminOverviewMetrics {
    const totalStudents = store.studentProfiles.size;
    const pendingVerification = store.verificationRequests.filter(
      (r) => r.status === "Pending" || r.status === "Under Review"
    ).length;
    const verifiedStudents = store.verificationRequests.filter((r) => r.status === "Approved").length;
    const rejectedApplications = store.verificationRequests.filter((r) => r.status === "Rejected").length;
    const awaitingInformation = store.verificationRequests.filter((r) => r.status === "Needs Information").length;

    const totalDecided = verifiedStudents + rejectedApplications;
    const verificationRate = totalDecided > 0 ? Number(((verifiedStudents / totalDecided) * 100).toFixed(1)) : 0;

    let activeDrives = 0;
    let totalApplications = 0;
    try {
      if (recruitmentStore && recruitmentStore.drives) {
        const drives = Array.from(recruitmentStore.drives.values());
        activeDrives = drives.filter((d) =>
          ["APPLICATIONS_OPEN", "PUBLISHED", "SCREENING", "SELECTION_IN_PROGRESS"].includes(d.status)
        ).length;
      }
      if (recruitmentStore && recruitmentStore.applications) {
        totalApplications = recruitmentStore.applications.size;
      }
    } catch {
      // safe fallback
    }

    const pendingReports = Array.from(store.moderationReports.values()).filter(
      (r) => r.status === "PENDING" || r.status === "INVESTIGATING"
    ).length;

    const allColleges = Array.from(store.colleges.values());
    const totalColleges = allColleges.length;
    const activeColleges = allColleges.filter((c) => c.status === "ACTIVE").length;
    const pendingColleges = allColleges.filter((c) => c.status === "PENDING").length;
    const institutionalPlacementRate =
      allColleges.length > 0
        ? Number(
            (
              allColleges.reduce((acc, c) => acc + (c.stats.placementRate || 0), 0) /
              allColleges.length
            ).toFixed(1)
          )
        : 72.4;

    return {
      totalStudents,
      pendingVerification,
      verifiedStudents,
      rejectedApplications,
      verificationRate,
      avgVerificationTimeHours: 4.5,
      newRegistrationsToday: totalStudents,
      newRegistrationsWeek: totalStudents,
      awaitingInformation,
      suspiciousAttempts: store.verificationRequests.filter((r) => r.riskLevel === "High").length,
      totalUsers: store.studentProfiles.size + store.recruiterProfiles.size + store.adminProfiles.size,
      totalCompanies: store.companies.size,
      totalRecruiters: store.recruiterProfiles.size,
      activeDrives,
      totalApplications,
      pendingReports,
      totalColleges,
      activeColleges,
      pendingColleges,
      institutionalPlacementRate,
    };
  }

  static getAllUsers(filters?: { search?: string; role?: string; status?: string }): AdminUserRecord[] {
    const users: AdminUserRecord[] = [];

    // Students
    store.studentProfiles.forEach((s) => {
      const isSuspended = (s as any).account_status === "SUSPENDED" || (s as any).status === "SUSPENDED";
      const userRole = s.role ? (s.role.toUpperCase() as any) : "STUDENT";
      users.push({
        id: s.id,
        email: s.email,
        name: s.name,
        role: userRole,
        status: isSuspended ? "SUSPENDED" : "ACTIVE",
        suspensionReason: (s as any).suspensionReason,
        avatar: s.avatar,
        createdAt: s.verificationRequest?.submittedAt || "2026-01-01T00:00:00.000Z",
        college: s.university,
        verificationStatus: s.verificationStatus || "not_submitted",
      });
    });

    // Recruiters
    store.recruiterProfiles.forEach((r) => {
      const isSuspended = (r as any).account_status === "SUSPENDED" || (r as any).status === "SUSPENDED";
      const userRole = r.role ? (r.role.toUpperCase() as any) : "RECRUITER";
      users.push({
        id: r.id,
        email: r.email,
        name: r.name,
        role: userRole,
        status: isSuspended ? "SUSPENDED" : "ACTIVE",
        suspensionReason: (r as any).suspensionReason,
        avatar: r.avatar,
        createdAt: (r as any).createdAt || "2026-01-01T00:00:00.000Z",
        companyName: r.company,
      });
    });

    // Admins
    store.adminProfiles.forEach((a) => {
      const isSuspended = (a as any).account_status === "SUSPENDED" || (a as any).status === "SUSPENDED";
      const normalizedRole = a.role.toUpperCase() === "ADMIN" ? "PLATFORM_ADMIN" : (a.role.toUpperCase() as any);
      users.push({
        id: a.id,
        email: a.email,
        name: a.name,
        role: normalizedRole,
        status: isSuspended ? "SUSPENDED" : "ACTIVE",
        suspensionReason: (a as any).suspensionReason,
        avatar: a.avatar,
        createdAt: (a as any).createdAt || "2026-01-01T00:00:00.000Z",
      });
    });

    let result = users;

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.college && u.college.toLowerCase().includes(q)) ||
          (u.companyName && u.companyName.toLowerCase().includes(q))
      );
    }

    if (filters?.role && filters.role !== "ALL") {
      const targetRole = filters.role.toUpperCase();
      result = result.filter((u) => u.role.toUpperCase() === targetRole);
    }

    if (filters?.status && filters.status !== "ALL") {
      const targetStatus = filters.status.toUpperCase();
      result = result.filter((u) => u.status.toUpperCase() === targetStatus);
    }

    return result;
  }

  static getUserRecordById(userId: string): AdminUserRecord | null {
    const all = this.getAllUsers();
    return all.find((u) => u.id === userId) || null;
  }

  static updateUserStatus(
    actor: { id: string; name: string; role: string },
    userId: string,
    status: AdminUserStatus,
    reason: string
  ): { success: boolean; error?: string; user?: AdminUserRecord } {
    if (actor.id === userId && status === "SUSPENDED") {
      return { success: false, error: "Administrators cannot suspend their own account." };
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: "A justification reason is required for status modifications." };
    }

    let foundUser: any = null;
    let prevStatus = "ACTIVE";

    if (store.studentProfiles.has(userId)) {
      foundUser = store.studentProfiles.get(userId);
      prevStatus = (foundUser as any).account_status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
      (foundUser as any).account_status = status;
      (foundUser as any).suspensionReason = status === "SUSPENDED" ? reason : undefined;
      store.studentProfiles.set(userId, foundUser);
    } else if (store.recruiterProfiles.has(userId)) {
      foundUser = store.recruiterProfiles.get(userId);
      prevStatus = (foundUser as any).account_status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
      (foundUser as any).account_status = status;
      (foundUser as any).suspensionReason = status === "SUSPENDED" ? reason : undefined;
      store.recruiterProfiles.set(userId, foundUser);
    } else if (store.adminProfiles.has(userId)) {
      foundUser = store.adminProfiles.get(userId);
      prevStatus = (foundUser as any).account_status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
      (foundUser as any).account_status = status;
      (foundUser as any).suspensionReason = status === "SUSPENDED" ? reason : undefined;
      store.adminProfiles.set(userId, foundUser);
    }

    if (!foundUser) {
      return { success: false, error: `User with ID ${userId} not found.` };
    }

    persistStoreToDisk();

    this.addAuditLog({
      admin: actor.name || "Administrator",
      action: status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
      student: foundUser.name,
      targetType: "USER",
      targetId: userId,
      targetName: foundUser.name,
      previousStatus: prevStatus,
      newStatus: status,
      reason,
      ipSessionRef: "admin-console",
      details: `Administrator ${actor.name} changed status of ${foundUser.name} (${foundUser.email}) to ${status}. Reason: ${reason}`,
    });

    const allUsers = this.getAllUsers();
    const updatedRecord = allUsers.find((u) => u.id === userId);
    return { success: true, user: updatedRecord };
  }

  static updateUserRole(
    actor: { id: string; name: string; role: string },
    userId: string,
    newRole: UserRole,
    reason: string
  ): { success: boolean; error?: string; user?: AdminUserRecord } {
    if (!["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN"].includes(actor.role.toUpperCase())) {
      return { success: false, error: "Only Platform/Super Administrators can change user roles." };
    }

    if (newRole.toUpperCase() === "SUPER_ADMIN" && actor.role.toUpperCase() !== "SUPER_ADMIN") {
      return { success: false, error: "Only a Super Admin can promote another user to Super Admin." };
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: "A justification reason is required for role modification." };
    }

    let foundUser: any = null;
    let prevRole = "STUDENT";

    if (store.studentProfiles.has(userId)) {
      foundUser = store.studentProfiles.get(userId);
      prevRole = foundUser.role;
      foundUser.role = newRole;
      store.studentProfiles.set(userId, foundUser);
    } else if (store.recruiterProfiles.has(userId)) {
      foundUser = store.recruiterProfiles.get(userId);
      prevRole = foundUser.role;
      foundUser.role = newRole;
      store.recruiterProfiles.set(userId, foundUser);
    } else if (store.adminProfiles.has(userId)) {
      foundUser = store.adminProfiles.get(userId);
      prevRole = foundUser.role;
      foundUser.role = newRole;
      store.adminProfiles.set(userId, foundUser);
    }

    if (!foundUser) {
      return { success: false, error: `User with ID ${userId} not found.` };
    }

    persistStoreToDisk();

    this.addAuditLog({
      admin: actor.name || "Administrator",
      action: "USER_ROLE_CHANGED",
      student: foundUser.name,
      targetType: "USER",
      targetId: userId,
      targetName: foundUser.name,
      previousStatus: prevRole,
      newStatus: newRole,
      reason,
      ipSessionRef: "admin-console",
      details: `Administrator ${actor.name} changed role of ${foundUser.name} to ${newRole}. Reason: ${reason}`,
    });

    const allUsers = this.getAllUsers();
    const updatedRecord = allUsers.find((u) => u.id === userId);
    return { success: true, user: updatedRecord };
  }

  static getAllCompanies(filters?: { search?: string; status?: string }): CompanyRecord[] {
    let list = Array.from(store.companies.values());

    list = list.map((comp) => {
      let recruiterCount = 0;
      store.recruiterProfiles.forEach((r) => {
        if (r.company && r.company.toLowerCase() === comp.name.toLowerCase()) {
          recruiterCount++;
        }
      });

      let activeDrivesCount = 0;
      try {
        if (recruitmentStore && recruitmentStore.drives) {
          recruitmentStore.drives.forEach((d) => {
            if (d.company && d.company.toLowerCase() === comp.name.toLowerCase()) {
              if (["APPLICATIONS_OPEN", "PUBLISHED", "SCREENING", "SELECTION_IN_PROGRESS"].includes(d.status)) {
                activeDrivesCount++;
              }
            }
          });
        }
      } catch {
        // safe fallback
      }

      return {
        ...comp,
        recruiterCount,
        activeDrivesCount,
      };
    });

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
      );
    }

    if (filters?.status && filters.status !== "ALL") {
      const s = filters.status.toUpperCase();
      list = list.filter((c) => c.status.toUpperCase() === s);
    }

    return list;
  }

  static getCompanyById(id: string): CompanyRecord | null {
    const comp = store.companies.get(id);
    if (!comp) return null;
    const all = this.getAllCompanies();
    return all.find((c) => c.id === id) || comp;
  }

  static createCompany(
    actor: { id: string; name: string; role: string },
    data: Omit<CompanyRecord, "id" | "createdAt" | "updatedAt">
  ): { success: boolean; company?: CompanyRecord; error?: string } {
    const id = `comp_${Date.now()}`;
    const newComp: CompanyRecord = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.companies.set(id, newComp);
    persistStoreToDisk();

    this.addAuditLog({
      admin: actor.name,
      action: "COMPANY_CREATED",
      targetType: "COMPANY",
      targetId: id,
      targetName: newComp.name,
      previousStatus: "NONE",
      newStatus: newComp.status,
      reason: "Company registration via admin console",
      ipSessionRef: "admin-console",
      details: `Administrator ${actor.name} created company profile for ${newComp.name}.`,
    });

    return { success: true, company: newComp };
  }

  static updateCompanyStatus(
    actor: { id: string; name: string; role: string },
    companyId: string,
    status: CompanyStatus,
    reason: string
  ): { success: boolean; error?: string; company?: CompanyRecord } {
    const comp = store.companies.get(companyId);
    if (!comp) {
      return { success: false, error: `Company with ID ${companyId} not found.` };
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: "A justification reason is required for status updates." };
    }

    const prevStatus = comp.status;
    comp.status = status;
    comp.updatedAt = new Date().toISOString();
    if (status === "VERIFIED") {
      comp.verifiedAt = new Date().toISOString();
      comp.verifiedBy = actor.id;
      comp.verificationTier = comp.verificationTier || "STANDARD";
    }
    if (status === "SUSPENDED") {
      comp.suspensionReason = reason;
    }

    store.companies.set(companyId, comp);
    persistStoreToDisk();

    this.addAuditLog({
      admin: actor.name,
      action: status === "VERIFIED" ? "COMPANY_VERIFIED" : status === "SUSPENDED" ? "COMPANY_SUSPENDED" : "COMPANY_STATUS_UPDATED",
      targetType: "COMPANY",
      targetId: companyId,
      targetName: comp.name,
      previousStatus: prevStatus,
      newStatus: status,
      reason,
      ipSessionRef: "admin-console",
      details: `Administrator ${actor.name} updated company ${comp.name} status to ${status}. Reason: ${reason}`,
    });

    return { success: true, company: this.getCompanyById(companyId)! };
  }

  static updateCompany(
    actor: { id: string; name: string; role: string },
    companyId: string,
    updates: Partial<CompanyRecord>
  ): { success: boolean; error?: string; company?: CompanyRecord } {
    const comp = store.companies.get(companyId);
    if (!comp) {
      return { success: false, error: `Company with ID ${companyId} not found.` };
    }

    const updated = {
      ...comp,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    store.companies.set(companyId, updated);
    persistStoreToDisk();

    this.addAuditLog({
      admin: actor.name,
      action: "COMPANY_UPDATED",
      targetType: "COMPANY",
      targetId: companyId,
      targetName: updated.name,
      reason: "Company profile updated via admin console",
      ipSessionRef: "admin-console",
      details: `Administrator ${actor.name} updated details for company ${updated.name}.`,
    });

    return { success: true, company: this.getCompanyById(companyId)! };
  }

  static getAllRecruiters(filters?: { search?: string; status?: string }): any[] {
    const list: any[] = [];
    store.recruiterProfiles.forEach((r) => {
      const isSuspended = (r as any).account_status === "SUSPENDED" || (r as any).status === "SUSPENDED";
      const comp = Array.from(store.companies.values()).find(
        (c) => c.name.toLowerCase() === (r.company || "").toLowerCase()
      );
      list.push({
        id: r.id,
        name: r.name,
        email: r.email,
        title: r.title,
        company: r.company,
        companyId: comp?.id,
        companyVerified: comp?.status === "VERIFIED",
        avatar: r.avatar,
        status: isSuspended ? "SUSPENDED" : "ACTIVE",
        suspensionReason: (r as any).suspensionReason,
        activeListingsCount: r.activeListingsCount || 0,
        candidatesReviewed: r.candidatesReviewed || 0,
        interviewsConducted: r.interviewsConducted || 0,
      });
    });

    let result = list;
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.company && r.company.toLowerCase().includes(q))
      );
    }
    if (filters?.status && filters.status !== "ALL") {
      const statusUpper = filters.status.toUpperCase();
      result = result.filter((r) => r.status.toUpperCase() === statusUpper);
    }
    return result;
  }

  static updateRecruiterStatus(
    actor: { id: string; name: string; role: string },
    recruiterId: string,
    status: AdminUserStatus,
    reason: string
  ): { success: boolean; error?: string; recruiter?: any } {
    const res = this.updateUserStatus(actor, recruiterId, status, reason);
    return { success: res.success, error: res.error, recruiter: res.user };
  }

  static getAllModerationReports(filters?: { search?: string; status?: string; targetType?: string }): ModerationReport[] {
    let list = Array.from(store.moderationReports.values());

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.targetTitle.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q)
      );
    }

    if (filters?.status && filters.status !== "ALL") {
      const statusUpper = filters.status.toUpperCase();
      list = list.filter((r) => r.status.toUpperCase() === statusUpper);
    }

    if (filters?.targetType && filters.targetType !== "ALL") {
      const typeUpper = filters.targetType.toUpperCase();
      list = list.filter((r) => r.targetType.toUpperCase() === typeUpper);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  static getModerationReportById(reportId: string): ModerationReport | null {
    return store.moderationReports.get(reportId) || null;
  }

  static createModerationReport(reportData: Omit<ModerationReport, "id" | "createdAt" | "status">): ModerationReport {
    const id = `rep_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newReport: ModerationReport = {
      ...reportData,
      id,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    store.moderationReports.set(id, newReport);
    persistStoreToDisk();

    this.addAdminNotification({
      title: `New Moderation Report: ${newReport.targetType} Flagged`,
      description: `Reported by ${newReport.reporterName} for: ${newReport.reason}`,
      type: "risk_alert",
    });

    return newReport;
  }

  static resolveModerationReport(
    actor: { id: string; name: string; role: string },
    reportId: string,
    status: ReportStatus,
    resolutionNotes: string
  ): { success: boolean; error?: string; report?: ModerationReport } {
    const report = store.moderationReports.get(reportId);
    if (!report) {
      return { success: false, error: `Report with ID ${reportId} not found.` };
    }

    if (!resolutionNotes || !resolutionNotes.trim()) {
      return { success: false, error: "Resolution notes are required." };
    }

    const prevStatus = report.status;
    report.status = status;
    report.resolutionNotes = resolutionNotes;
    report.resolvedBy = actor.name;
    report.resolvedAt = new Date().toISOString();

    store.moderationReports.set(reportId, report);
    persistStoreToDisk();

    this.addAuditLog({
      admin: actor.name,
      action: status === "RESOLVED" ? "REPORT_RESOLVED" : "REPORT_DISMISSED",
      targetType: report.targetType,
      targetId: report.targetId,
      targetName: report.targetTitle,
      previousStatus: prevStatus,
      newStatus: status,
      reason: resolutionNotes,
      ipSessionRef: "admin-console",
      details: `Administrator ${actor.name} marked report ${reportId} as ${status}. Notes: ${resolutionNotes}`,
    });

    return { success: true, report };
  }

  static addAdminNotification(notif: { title: string; description: string; type: AdminNotificationItem["type"] }) {
    const newNotif: AdminNotificationItem = {
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: notif.title,
      description: notif.description,
      timestamp: "Just now",
      isRead: false,
      type: notif.type,
    };
    store.adminNotifications.unshift(newNotif);
    persistStoreToDisk();
    return newNotif;
  }

  static getAllVerificationRequests(filters?: {
    search?: string;
    status?: string;
    method?: string;
    risk?: string;
    sort?: string;
  }): VerificationRequest[] {
    let list = [...store.verificationRequests];

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.verificationId.toLowerCase().includes(q) ||
          r.student.fullName.toLowerCase().includes(q) ||
          r.student.email.toLowerCase().includes(q) ||
          r.student.college.toLowerCase().includes(q) ||
          r.student.studentId.toLowerCase().includes(q)
      );
    }

    if (filters?.status && filters.status !== "All") {
      list = list.filter((r) => r.status === filters.status);
    }

    if (filters?.method && filters.method !== "All") {
      list = list.filter((r) => r.verificationMethod === filters.method);
    }

    if (filters?.risk && filters.risk !== "All") {
      list = list.filter((r) => r.riskLevel === filters.risk);
    }

    if (filters?.sort) {
      if (filters.sort === "Newest") {
        list.sort((a, b) => b.verificationId.localeCompare(a.verificationId));
      } else if (filters.sort === "Oldest") {
        list.sort((a, b) => a.verificationId.localeCompare(b.verificationId));
      } else if (filters.sort === "Risk level") {
        const rank = { High: 3, Medium: 2, Low: 1 } as const;
        list.sort((a, b) => rank[b.riskLevel] - rank[a.riskLevel]);
      } else {
        const rank = { "Review Required": 3, "High Priority": 2, Normal: 1 } as const;
        list.sort((a, b) => rank[b.priority] - rank[a.priority]);
      }
    }

    return list;
  }

  static getVerificationRequestById(verificationId: string): VerificationRequest | null {
    const req = store.verificationRequests.find(
      (r) => r.verificationId.toLowerCase() === verificationId.toLowerCase()
    );
    return req ? { ...req } : null;
  }

  static getVerificationRequestByStudentId(studentId: string): VerificationRequest | null {
    const req = store.verificationRequests.find((r) => r.studentId === studentId);
    return req ? { ...req } : null;
  }

  static updateChecklist(verificationId: string, items: VerificationChecklistItem[]): boolean {
    const req = store.verificationRequests.find(
      (r) => r.verificationId.toLowerCase() === verificationId.toLowerCase()
    );
    if (!req) return false;
    req.checklist = items;
    return true;
  }

  static approveVerification(verificationId: string, adminName: string = "Priya Menon", adminNotes?: string): { success: boolean; request?: VerificationRequest } {
    const req = store.verificationRequests.find(
      (r) => r.verificationId.toLowerCase() === verificationId.toLowerCase()
    );
    if (!req) return { success: false };

    const prevStatus = req.status;
    const nowStr = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    req.status = "Approved";
    req.reviewedAt = nowStr;
    req.reviewedBy = adminName;
    if (adminNotes) req.adminNotes = adminNotes;

    // Mark checklist as verified
    req.checklist = req.checklist.map((item) => ({ ...item, state: "Verified" }));

    // Add timeline event
    req.timeline.unshift({
      id: `t_${Date.now()}`,
      timestamp: nowStr,
      title: "Approved by Admin",
      actor: adminName,
      description: adminNotes || "Student account verified for full CommandSkill platform access.",
    });

    // Update Student Profile
    const student = store.studentProfiles.get(req.studentId) || (req.studentId === defaultStudentUser.id ? defaultStudentUser : null);
    if (student) {
      student.verificationStatus = "approved";
      student.accountAccessStatus = "ACTIVE";
      student.accountStatus = "profile_complete";
      delete student.rejectionReason;
      if (student.verificationRequest) {
        student.verificationRequest.status = "approved";
        student.verificationRequest.reviewedAt = nowStr;
        student.verificationRequest.reviewerName = adminName;
        student.verificationRequest.adminNotes = adminNotes;
      }
      store.studentProfiles.set(student.id, student);

      // Add student notification
      const studentNotifs = store.studentNotifications.get(student.id) || [];
      studentNotifs.unshift({
        id: `notif_${Date.now()}`,
        type: "system",
        title: "Your CommandSkill Account Has Been Verified",
        description: "Your student verification has been approved. You now have access to the full CommandSkill experience including Fast-Track applications, messaging, and communities.",
        timestamp: "Just now",
        isRead: false,
        actionUrl: "/dashboard",
      });
      store.studentNotifications.set(student.id, studentNotifs);
    }

    // Log Audit Entry
    this.addAuditLog({
      admin: adminName,
      action: "ADMIN_APPROVED_STUDENT",
      student: req.student.fullName,
      previousStatus: prevStatus,
      newStatus: "Approved",
      ipSessionRef: "103.22.44.91 / sess_admin",
      details: adminNotes || `Approved student ${req.student.fullName} (${req.verificationId}). Verification checklist passed.`,
    });

    return { success: true, request: req };
  }

  static rejectVerification(
    verificationId: string,
    reason: string,
    adminName: string = "Priya Menon",
    adminNotes?: string
  ): { success: boolean; request?: VerificationRequest } {
    const req = store.verificationRequests.find(
      (r) => r.verificationId.toLowerCase() === verificationId.toLowerCase()
    );
    if (!req) return { success: false };

    const prevStatus = req.status;
    const nowStr = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    req.status = "Rejected";
    req.reviewedAt = nowStr;
    req.reviewedBy = adminName;
    req.rejectionReason = reason;
    if (adminNotes) req.adminNotes = adminNotes;

    // Add timeline event
    req.timeline.unshift({
      id: `t_${Date.now()}`,
      timestamp: nowStr,
      title: "Verification Rejected",
      actor: adminName,
      description: `Reason: ${reason}`,
    });

    // Update Student Profile
    const student = store.studentProfiles.get(req.studentId) || (req.studentId === defaultStudentUser.id ? defaultStudentUser : null);
    if (student) {
      student.verificationStatus = "rejected";
      student.accountAccessStatus = "RESTRICTED";
      student.rejectionReason = reason;
      if (student.verificationRequest) {
        student.verificationRequest.status = "rejected";
        student.verificationRequest.reviewedAt = nowStr;
        student.verificationRequest.reviewerName = adminName;
        student.verificationRequest.rejectionReason = reason;
        student.verificationRequest.adminNotes = adminNotes;
      }
      store.studentProfiles.set(student.id, student);

      // Add student notification
      const studentNotifs = store.studentNotifications.get(student.id) || [];
      studentNotifs.unshift({
        id: `notif_${Date.now()}`,
        type: "system",
        title: "Student Verification Notice",
        description: `Your CommandSkill verification could not be approved: ${reason}. Please review your document and resubmit.`,
        timestamp: "Just now",
        isRead: false,
        actionUrl: "/onboarding?step=verification",
      });
      store.studentNotifications.set(student.id, studentNotifs);
    }

    // Log Audit Entry
    this.addAuditLog({
      admin: adminName,
      action: "ADMIN_REJECTED_STUDENT",
      student: req.student.fullName,
      previousStatus: prevStatus,
      newStatus: "Rejected",
      ipSessionRef: "103.22.44.91 / sess_admin",
      details: `Rejection reason: ${reason}. ${adminNotes || ""}`,
    });

    return { success: true, request: req };
  }

  static requestInformation(
    verificationId: string,
    requirements: string[],
    message: string,
    adminName: string = "Priya Menon"
  ): { success: boolean; request?: VerificationRequest } {
    const req = store.verificationRequests.find(
      (r) => r.verificationId.toLowerCase() === verificationId.toLowerCase()
    );
    if (!req) return { success: false };

    const prevStatus = req.status;
    const nowStr = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    req.status = "Needs Information";
    req.reviewedAt = nowStr;
    req.reviewedBy = adminName;
    req.adminNotes = message;

    // Add timeline event
    req.timeline.unshift({
      id: `t_${Date.now()}`,
      timestamp: nowStr,
      title: "Requested Additional Information",
      actor: adminName,
      description: `${requirements.join(", ")} - ${message}`,
    });

    // Update Student Profile
    const student = store.studentProfiles.get(req.studentId) || (req.studentId === defaultStudentUser.id ? defaultStudentUser : null);
    if (student) {
      student.verificationStatus = "needs_information";
      if (student.verificationRequest) {
        student.verificationRequest.status = "needs_information";
        student.verificationRequest.reviewedAt = nowStr;
        student.verificationRequest.reviewerName = adminName;
        student.verificationRequest.adminNotes = message;
        student.verificationRequest.requiredInformation = requirements;
      }
      store.studentProfiles.set(student.id, student);

      // Add student notification
      const studentNotifs = store.studentNotifications.get(student.id) || [];
      studentNotifs.unshift({
        id: `notif_${Date.now()}`,
        type: "system",
        title: "Additional Information Required",
        description: `Admin has requested additional information for verification: ${message}`,
        timestamp: "Just now",
        isRead: false,
        actionUrl: "/onboarding?step=verification",
      });
      store.studentNotifications.set(student.id, studentNotifs);
    }

    // Log Audit Entry
    this.addAuditLog({
      admin: adminName,
      action: "ADMIN_REQUESTED_INFORMATION",
      student: req.student.fullName,
      previousStatus: prevStatus,
      newStatus: "Needs Information",
      ipSessionRef: "103.22.44.91 / sess_admin",
      details: `Required: ${requirements.join(", ")}. Message: ${message}`,
    });

    return { success: true, request: req };
  }

  static submitStudentVerification(
    studentId: string,
    data: {
      studentName: string;
      email: string;
      college: string;
      degree: string;
      branch: string;
      year: string;
      studentIdNumber: string;
      graduationYear: string;
      phone?: string;
      verificationType: VerificationType;
      documentName: string;
      documentSize: string;
      documentUrl: string;
      personalEmail?: string;
    }
  ): VerificationRequest {
    const nextVerId = `VER-2026-${String(store.verificationCounter++).padStart(6, "0")}`;
    const nowStr = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const isUni = data.email.endsWith(".edu") || data.email.endsWith(".ac.in");

    const newRequest: VerificationRequest = {
      verificationId: nextVerId,
      studentId,
      status: isUni ? "Approved" : "Pending",
      verificationMethod:
        data.verificationType === "university_email"
          ? "College Email"
          : data.verificationType === "payment_receipt"
          ? "Payment Receipt"
          : "Manual Review",
      submittedAt: nowStr,
      riskLevel: "Low",
      priority: "Normal",
      verificationResult: isUni
        ? "Automated institutional email domain verification verified successfully."
        : "Submitted for manual administrative review.",
      student: {
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
        fullName: data.studentName,
        email: data.email,
        phone: data.phone || "+1 (555) 342-8921",
        college: data.college,
        degree: data.degree,
        branch: data.branch,
        year: data.year,
        semester: "5",
        graduationYear: data.graduationYear,
        studentId: data.studentIdNumber,
        collegeEmail: data.email,
        accountCreatedAt: nowStr,
      },
      academicFields: [
        { label: "College", value: data.college, verified: isUni },
        { label: "Degree", value: data.degree, verified: isUni },
        { label: "Branch", value: data.branch, verified: isUni },
        { label: "Year", value: data.year, verified: isUni },
        { label: "Graduation Year", value: data.graduationYear, verified: isUni },
        { label: "Student ID", value: data.studentIdNumber, verified: false },
        { label: "College Email", value: data.email, verified: isUni },
      ],
      checklist: [
        { id: "c1", label: "Student name matches account", state: isUni ? "Verified" : "Pending" },
        { id: "c2", label: "College name matches submitted information", state: isUni ? "Verified" : "Pending" },
        { id: "c3", label: "Student ID is valid", state: isUni ? "Verified" : "Pending" },
        { id: "c4", label: "Academic information is consistent", state: isUni ? "Verified" : "Pending" },
        { id: "c5", label: "Document appears authentic", state: isUni ? "Verified" : "Pending" },
        { id: "c6", label: "Payment/receipt information is valid", state: isUni ? "Verified" : "Pending" },
        { id: "c7", label: "No duplicate account detected", state: "Verified" },
        { id: "c8", label: "No suspicious activity detected", state: "Verified" },
      ],
      document: {
        fileName: data.documentName,
        uploadDate: nowStr,
        fileSize: data.documentSize,
        documentType: data.verificationType === "payment_receipt" ? "College Fee Payment Receipt" : "College Student ID Card",
        studentNameDetected: data.studentName,
        collegeNameDetected: data.college,
        paymentDate: nowStr.split(",")[0],
        receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
        fileUrl: data.documentUrl,
      },
      duplicateCandidates: [],
      timeline: [
        {
          id: `t_${Date.now()}`,
          timestamp: nowStr,
          title: "Application submitted",
          actor: data.studentName,
        },
      ],
    };

    // Prepend to verification requests list
    store.verificationRequests.unshift(newRequest);

    // Update / Save student profile
    const existing = store.studentProfiles.get(studentId) || (studentId === defaultStudentUser.id ? defaultStudentUser : null);
    const updatedProfile: StudentProfile = {
      ...(existing || defaultStudentUser),
      id: studentId,
      name: data.studentName,
      email: data.email,
      university: data.college,
      degree: data.degree,
      branch: data.branch,
      yearOfStudy: data.year,
      graduationYear: parseInt(data.graduationYear, 10) || 2027,
      phone: data.phone || existing?.phone || "",
      verificationStatus: isUni ? "approved" : "pending",
      personalEmail: data.personalEmail || existing?.personalEmail,
      verificationRequest: {
        id: `req_${nextVerId}`,
        verificationId: nextVerId,
        studentId,
        studentName: data.studentName,
        university: data.college,
        universityEmail: data.email,
        verificationType: data.verificationType,
        status: isUni ? "approved" : "pending",
        documentName: data.documentName,
        documentSize: data.documentSize,
        documentUrl: data.documentUrl,
        personalEmail: data.personalEmail,
        submittedAt: nowStr,
        reviewedAt: isUni ? nowStr : undefined,
        reviewerName: isUni ? "Automated Domain Verification System" : undefined,
      },
    };
    store.studentProfiles.set(studentId, updatedProfile);

    // Log Audit Entry
    this.addAuditLog({
      admin: "System / Student Self-Service",
      action: "STUDENT_SUBMITTED_VERIFICATION",
      student: data.studentName,
      previousStatus: "not_submitted",
      newStatus: isUni ? "Approved" : "Pending",
      ipSessionRef: "103.22.44.11 / sess_user",
      details: `Submitted verification (${nextVerId}) via ${data.verificationType}.`,
    });

    // Admin Notification
    store.adminNotifications.unshift({
      id: `an_${Date.now()}`,
      type: "verification_request",
      title: "New Student Verification Request",
      description: `${data.studentName} (${data.college}) submitted verification request ${nextVerId}.`,
      timestamp: "Just now",
      isRead: false,
    });

    return newRequest;
  }

  static addVerificationRequest(request: VerificationRequest) {
    store.verificationRequests.unshift(request);
  }

  static resubmitStudentVerification(
    studentId: string,
    data: {
      documentName: string;
      documentSize: string;
      documentUrl: string;
      personalEmail?: string;
      notes?: string;
    }
  ): { success: boolean; request?: VerificationRequest } {
    let req = store.verificationRequests.find((r) => r.studentId === studentId);
    const nowStr = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (!req) {
      // Create if none existed
      const student = store.studentProfiles.get(studentId) || defaultStudentUser;
      req = this.submitStudentVerification(studentId, {
        studentName: student.name,
        email: student.email,
        college: student.university,
        degree: student.degree || "B.Tech",
        branch: student.branch || "Computer Science",
        year: student.yearOfStudy || "3rd Year",
        studentIdNumber: "STU-2026-REG",
        graduationYear: String(student.graduationYear || 2027),
        verificationType: "payment_receipt",
        documentName: data.documentName,
        documentSize: data.documentSize,
        documentUrl: data.documentUrl,
        personalEmail: data.personalEmail,
      });
    }

    const prevStatus = req.status;
    req.status = "Pending";
    req.submittedAt = nowStr;
    req.reviewedAt = undefined;
    req.reviewedBy = undefined;
    req.rejectionReason = undefined;

    if (req.document) {
      req.document.fileName = data.documentName;
      req.document.fileSize = data.documentSize;
      req.document.uploadDate = nowStr;
      req.document.fileUrl = data.documentUrl;
    }

    // Add timeline event
    req.timeline.unshift({
      id: `t_${Date.now()}`,
      timestamp: nowStr,
      title: "Updated Document Resubmitted",
      actor: req.student.fullName,
      description: data.notes || "Student uploaded an updated document for review.",
    });

    // Update Student Profile
    const student = store.studentProfiles.get(studentId) || (studentId === defaultStudentUser.id ? defaultStudentUser : null);
    if (student) {
      student.verificationStatus = "pending";
      if (student.verificationRequest) {
        student.verificationRequest.status = "pending";
        student.verificationRequest.documentName = data.documentName;
        student.verificationRequest.documentSize = data.documentSize;
        student.verificationRequest.documentUrl = data.documentUrl;
        student.verificationRequest.submittedAt = nowStr;
        student.verificationRequest.rejectionReason = undefined;
      }
      store.studentProfiles.set(studentId, student);
    }

    // Log Audit Entry
    this.addAuditLog({
      admin: "System / Student Self-Service",
      action: "STUDENT_RESUBMITTED_VERIFICATION",
      student: req.student.fullName,
      previousStatus: prevStatus,
      newStatus: "Pending",
      ipSessionRef: "103.22.44.11 / sess_user",
      details: `Resubmitted document ${data.documentName} for ${req.verificationId}.`,
    });

    // Admin Notification
    store.adminNotifications.unshift({
      id: `an_${Date.now()}`,
      type: "resubmission",
      title: "Verification Document Resubmitted",
      description: `${req.student.fullName} resubmitted document for ${req.verificationId}.`,
      timestamp: "Just now",
      isRead: false,
    });

    return { success: true, request: req };
  }

  // ==========================================
  // DOCUMENT MANAGEMENT & HYBRID VERIFICATION
  // ==========================================

  static saveDocument(userId: string, doc: DocumentRecord, buffer?: Buffer): DocumentRecord {
    const userDocs = store.documents.get(userId) || [];
    const existingIndex = userDocs.findIndex((d) => d.id === doc.id);

    if (existingIndex >= 0) {
      userDocs[existingIndex] = { ...doc, updatedAt: new Date().toISOString() };
    } else {
      userDocs.unshift(doc);
    }
    store.documents.set(userId, userDocs);

    if (buffer) {
      store.documentBuffers.set(doc.id, buffer);
    }

    persistStoreToDisk();
    return doc;
  }

  static getDocumentById(docId: string): DocumentRecord | null {
    for (const docs of store.documents.values()) {
      const found = docs.find((d) => d.id === docId);
      if (found) return { ...found };
    }
    return null;
  }

  static getDocumentBuffer(docId: string): Buffer | null {
    return store.documentBuffers.get(docId) || null;
  }

  static getDocumentsByUserId(userId: string): DocumentRecord[] {
    const docs = store.documents.get(userId) || [];
    return docs.map((d) => ({ ...d }));
  }

  static getAllDocuments(filters?: {
    status?: string;
    type?: string;
    search?: string;
  }): DocumentRecord[] {
    const all: DocumentRecord[] = [];
    store.documents.forEach((docs) => {
      docs.forEach((d) => all.push({ ...d }));
    });

    let filtered = all;

    if (filters?.status && filters.status !== "All") {
      filtered = filtered.filter((d) => d.verificationStatus === filters.status);
    }

    if (filters?.type && filters.type !== "All") {
      filtered = filtered.filter((d) => d.documentType === filters.type);
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.fileName.toLowerCase().includes(q) ||
          (d.studentName && d.studentName.toLowerCase().includes(q)) ||
          (d.studentEmail && d.studentEmail.toLowerCase().includes(q)) ||
          (d.collegeName && d.collegeName.toLowerCase().includes(q)) ||
          d.documentType.toLowerCase().includes(q)
      );
    }

    // Sort by uploadedAt desc
    filtered.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return filtered;
  }

  static deleteDocument(userId: string, docId: string): boolean {
    const userDocs = store.documents.get(userId) || [];
    const nextDocs = userDocs.filter((d) => d.id !== docId);
    if (nextDocs.length !== userDocs.length) {
      store.documents.set(userId, nextDocs);
      store.documentBuffers.delete(docId);
      store.documentAttempts.delete(docId);
      persistStoreToDisk();
      return true;
    }
    return false;
  }

  static recordVerificationAttempt(attempt: DocumentVerificationAttempt): void {
    const attempts = store.documentAttempts.get(attempt.documentId) || [];
    attempts.unshift(attempt);
    store.documentAttempts.set(attempt.documentId, attempts);

    // Also update document's latest attempt ID and history
    const doc = this.getDocumentById(attempt.documentId);
    if (doc) {
      doc.latestAttemptId = attempt.id;
      doc.confidenceScore = attempt.confidenceScore;
      doc.matchedFields = attempt.matchedFields;
      doc.failedChecks = attempt.failedChecks;
      doc.warnings = attempt.warnings;
      doc.decisionReason = attempt.reason;
      doc.attempts = attempts;
      this.saveDocument(doc.userId, doc);
    }
  }

  static getVerificationAttempts(docId: string): DocumentVerificationAttempt[] {
    const attempts = store.documentAttempts.get(docId) || [];
    return attempts.map((a) => ({ ...a }));
  }

  static getAllStudentProfiles(): StudentProfile[] {
    return Array.from(store.studentProfiles.values()).map((p) => ({ ...p }));
  }

  static requestManualReview(
    docId: string,
    userId: string,
    reason?: string
  ): { success: boolean; document?: DocumentRecord; error?: string } {
    const doc = this.getDocumentById(docId);
    if (!doc) {
      return { success: false, error: "Document not found." };
    }

    const prevStatus = doc.verificationStatus;
    const nowStr = new Date().toISOString();

    doc.verificationStatus = "MANUAL_REVIEW_REQUESTED";
    doc.manualReviewRequestedAt = nowStr;
    doc.manualReviewRequestedBy = userId;
    doc.manualReviewReason = reason || "Student explicitly requested manual verification review.";
    doc.updatedAt = nowStr;

    this.saveDocument(doc.userId, doc);

    // Record verification attempt for audit trail
    const attempt: DocumentVerificationAttempt = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      documentId: doc.id,
      userId: doc.userId,
      verificationMethod: "VERIFICATION_OFFICER",
      status: "MANUAL_REVIEW_REQUESTED",
      confidenceScore: doc.confidenceScore || 50,
      extractedData: doc.extractedData || {},
      matchedFields: doc.matchedFields || [],
      failedChecks: doc.failedChecks || [],
      warnings: doc.warnings || [],
      reason: doc.manualReviewReason,
      performedBy: doc.studentName || "Student Initiated",
      createdAt: nowStr,
    };
    this.recordVerificationAttempt(attempt);

    // Add notification to student
    const notifs = store.studentNotifications.get(doc.userId) || [];
    notifs.unshift({
      id: `notif_${Date.now()}`,
      type: "system",
      title: "Manual Review Requested",
      description: `Your ${doc.documentType.replace(/_/g, " ")} has been submitted for manual verification. A CommandSkill verification officer will review your document.`,
      timestamp: "Just now",
      isRead: false,
      actionUrl: "/dashboard/documents",
    });
    store.studentNotifications.set(doc.userId, notifs);

    // Add Audit Log
    this.addAuditLog({
      admin: doc.studentName || userId,
      action: "STUDENT_SUBMITTED_VERIFICATION" as any,
      student: doc.studentName || doc.userId,
      previousStatus: prevStatus,
      newStatus: "MANUAL_REVIEW_REQUESTED",
      ipSessionRef: "127.0.0.1 / manual_review_request",
      details: `Student requested manual verification review for ${doc.fileName} (${doc.documentType}). Failure reason: ${doc.decisionReason || doc.failureReason || "Unspecified"}`,
    });

    return { success: true, document: doc };
  }

  static adminReviewDocument(
    docId: string,
    action: "APPROVE" | "REJECT" | "REQUEST_REUPLOAD" | "START_REVIEW",
    adminName: string = "Priya Menon",
    reason?: string,
    notes?: string
  ): { success: boolean; document?: DocumentRecord; error?: string } {
    const doc = this.getDocumentById(docId);
    if (!doc) {
      return { success: false, error: "Document not found." };
    }

    const prevStatus = doc.verificationStatus;
    const nowStr = new Date().toISOString();

    if (action === "START_REVIEW") {
      doc.verificationStatus = "UNDER_REVIEW";
      doc.updatedAt = nowStr;
      this.saveDocument(doc.userId, doc);

      const student = store.studentProfiles.get(doc.userId);
      if (student) {
        student.verificationStatus = "under_review";
        student.accountAccessStatus = "RESTRICTED";
        store.studentProfiles.set(student.id, student);
      }
      return { success: true, document: doc };
    }

    if (action === "APPROVE") {
      doc.verificationStatus = "VERIFIED";
      doc.verificationMethod = "VERIFICATION_OFFICER";
      doc.verifiedBy = adminName;
      doc.verifiedAt = nowStr;
      doc.decisionReason = notes || "Verified by CommandSkill Verification Officer";
    } else if (action === "REJECT") {
      doc.verificationStatus = "REJECTED";
      doc.rejectionReason = reason || "Document failed verification standards.";
      doc.verifiedBy = adminName;
      doc.verifiedAt = nowStr;
      doc.decisionReason = reason || notes || "Rejected by administrator.";
    } else if (action === "REQUEST_REUPLOAD") {
      doc.verificationStatus = "REUPLOAD_REQUIRED";
      doc.reuploadReason = reason || "A clearer copy or replacement document is requested.";
      doc.decisionReason = reason || notes || "Re-upload requested by administrator.";
    }

    this.saveDocument(doc.userId, doc);

    // Synchronize Student Profile & Account Access Status (Section 30, 31, 33, 34)
    const isPrimaryDoc =
      doc.documentType === "COLLEGE_ID" ||
      doc.documentType === "MARKSHEET" ||
      doc.documentType === "DEGREE_CERTIFICATE" ||
      doc.documentType === "GOVERNMENT_ID";

    const student = store.studentProfiles.get(doc.userId);
    if (student) {
      const studentPrevStatus = student.verificationStatus;
      if (
        action === "APPROVE" &&
        (isPrimaryDoc ||
          student.verificationStatus === "manual_review_requested" ||
          student.verificationStatus === "under_review" ||
          student.verificationStatus === "pending")
      ) {
        student.verificationStatus = "approved";
        student.accountAccessStatus = "ACTIVE";
        student.accountStatus = "profile_complete";
        delete student.rejectionReason;
        store.studentProfiles.set(student.id, student);

        const req = store.verificationRequests.find((r) => r.studentId === student.id);
        if (req) {
          req.status = "Approved";
          req.reviewedAt = nowStr;
          req.reviewedBy = adminName;
          req.adminNotes = notes || "Approved by CommandSkill Verification Officer";
        }

        this.addAuditLog({
          admin: adminName,
          action: "ADMIN_APPROVED_STUDENT" as any,
          student: student.name,
          previousStatus: studentPrevStatus || prevStatus,
          newStatus: "approved",
          ipSessionRef: "103.22.44.91 / sess_admin",
          details: `Primary document ${doc.fileName} (${doc.documentType}) approved by ${adminName}. Account access upgraded to ACTIVE.`,
        });
      } else if (action === "REJECT" && isPrimaryDoc) {
        student.verificationStatus = "rejected";
        student.accountAccessStatus = "RESTRICTED";
        student.rejectionReason = reason || "Document failed verification standards.";
        store.studentProfiles.set(student.id, student);

        const req = store.verificationRequests.find((r) => r.studentId === student.id);
        if (req) {
          req.status = "Rejected";
          req.reviewedAt = nowStr;
          req.reviewedBy = adminName;
          req.rejectionReason = reason;
        }

        this.addAuditLog({
          admin: adminName,
          action: "ADMIN_REJECTED_STUDENT" as any,
          student: student.name,
          previousStatus: studentPrevStatus || prevStatus,
          newStatus: "rejected",
          ipSessionRef: "103.22.44.91 / sess_admin",
          details: `Primary document ${doc.fileName} (${doc.documentType}) rejected by ${adminName}. Reason: ${reason}. Account access RESTRICTED.`,
        });
      }
    }

    // Record verification attempt for audit trail
    const attempt: DocumentVerificationAttempt = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      documentId: doc.id,
      userId: doc.userId,
      verificationMethod: "VERIFICATION_OFFICER",
      status: doc.verificationStatus,
      confidenceScore: action === "APPROVE" ? 100 : (doc.confidenceScore || 50),
      extractedData: doc.extractedData || {},
      matchedFields: doc.matchedFields || [],
      failedChecks: action === "REJECT" ? ["officer_rejected"] : (doc.failedChecks || []),
      warnings: [],
      reason: reason || notes || `Document ${action.toLowerCase()}d by ${adminName}.`,
      performedBy: adminName,
      createdAt: nowStr,
    };
    this.recordVerificationAttempt(attempt);

    // Add notification to student
    const notifs = store.studentNotifications.get(doc.userId) || [];
    let notifTitle = "Document Verified";
    let notifDesc = `Your ${doc.documentType.replace(/_/g, " ")} has been verified by ${adminName}.`;
    if (action === "REJECT") {
      notifTitle = "Document Verification Notice";
      notifDesc = `Your ${doc.documentType.replace(/_/g, " ")} was rejected: ${reason || "Document requirements not met."}`;
    } else if (action === "REQUEST_REUPLOAD") {
      notifTitle = "Document Re-upload Requested";
      notifDesc = `An administrator requested a replacement for your ${doc.documentType.replace(/_/g, " ")}: ${reason || "Please upload a clearer copy."}`;
    }

    notifs.unshift({
      id: `notif_${Date.now()}`,
      type: "system",
      title: notifTitle,
      description: notifDesc,
      timestamp: "Just now",
      isRead: false,
      actionUrl: "/dashboard/documents",
    });
    store.studentNotifications.set(doc.userId, notifs);

    // Add Audit Log
    this.addAuditLog({
      admin: adminName,
      action: `ADMIN_${action}_DOCUMENT` as any,
      student: doc.studentName || doc.userId,
      previousStatus: prevStatus,
      newStatus: doc.verificationStatus,
      ipSessionRef: "103.22.44.91 / sess_admin",
      details: `${action} document ${doc.fileName} (${doc.documentType}). ${notes || reason || ""}`,
    });

    return { success: true, document: doc };
  }

  static resetVerificationForResubmission(studentId: string): {
    success: boolean;
    student?: StudentProfile;
    error?: string;
  } {
    const student =
      store.studentProfiles.get(studentId) ||
      (studentId === defaultStudentUser.id ? defaultStudentUser : null);
    if (!student) {
      return { success: false, error: "Student profile not found." };
    }

    const prevStatus = student.verificationStatus || "rejected";
    student.verificationStatus = "not_submitted";
    student.accountAccessStatus = "RESTRICTED";
    delete student.rejectionReason;

    if (student.verificationRequest) {
      student.verificationRequest.status = "not_submitted";
      delete student.verificationRequest.rejectionReason;
    }

    store.studentProfiles.set(student.id, student);

    this.addAuditLog({
      admin: student.name,
      action: "STUDENT_SUBMITTED_VERIFICATION" as any,
      student: student.name,
      previousStatus: prevStatus,
      newStatus: "not_submitted",
      ipSessionRef: "127.0.0.1 / retry_verification",
      details: `Student initiated new verification attempt. Account features remain RESTRICTED until successful verification.`,
    });

    return { success: true, student };
  }

  static checkRejectedIdentityConflict(
    institutionalId?: string,
    email?: string
  ): { isConflict: boolean; student?: StudentProfile; reason?: string } {
    if (!institutionalId && !email) return { isConflict: false };

    const normId = (institutionalId || "").trim().toLowerCase();
    const normEmail = (email || "").trim().toLowerCase();

    for (const [, student] of store.studentProfiles) {
      if (student.verificationStatus === "rejected") {
        const sId = (
          student.studentId ||
          student.institutionalId ||
          student.enrollmentNumber ||
          student.rollNumber ||
          ""
        ).toLowerCase();
        const sEmail = (student.email || "").toLowerCase();

        if ((normId && sId === normId) || (normEmail && sEmail === normEmail)) {
          return {
            isConflict: true,
            student,
            reason:
              "An institutional identity matching these credentials has a rejected verification status. Direct re-registration is restricted. Please sign in and submit a new verification attempt.",
          };
        }
      }
    }

    return { isConflict: false };
  }

  static getCandidateVerificationClaims(userId: string): CandidateVerificationClaims {
    const docs = this.getDocumentsByUserId(userId);
    const student = store.studentProfiles.get(userId);

    const isVerified = (d: DocumentRecord) =>
      d.verificationStatus === "VERIFIED" || d.verificationStatus === "AUTO_VERIFIED";

    const hasGovId = docs.some((d) => (d.documentType === "GOVERNMENT_ID" || d.documentType === "COLLEGE_ID") && isVerified(d));
    const hasDegree = docs.some((d) => d.documentType === "DEGREE_CERTIFICATE" && isVerified(d));
    const hasMarksheet = docs.some((d) => d.documentType === "MARKSHEET" && isVerified(d));
    const hasInternship = docs.some((d) => d.documentType === "INTERNSHIP_CERTIFICATE" && isVerified(d));
    const hasResume = docs.some((d) => d.documentType === "RESUME" && isVerified(d));

    const isAccountApproved = student?.verificationStatus === "approved";

    return {
      identityVerified: hasGovId || isAccountApproved,
      educationVerified: hasDegree || hasMarksheet || isAccountApproved,
      degreeVerified: hasDegree,
      internshipVerified: hasInternship,
      resumeVerified: hasResume,
      verifiedCount: docs.filter(isVerified).length,
      totalDocuments: docs.length,
    };
  }

  static getDocumentVerificationMetrics(): {
    totalDocuments: number;
    autoVerifiedCount: number;
    verificationFailedCount: number;
    manualReviewRequestedCount: number;
    underReviewCount: number;
    verifiedCount: number;
    rejectedCount: number;
    reuploadCount: number;
    expiredCount: number;
    automationRate: number;
  } {
    const allDocs = this.getAllDocuments();

    let autoVerifiedCount = 0;
    let verificationFailedCount = 0;
    let manualReviewRequestedCount = 0;
    let underReviewCount = 0;
    let verifiedCount = 0;
    let rejectedCount = 0;
    let reuploadCount = 0;
    let expiredCount = 0;

    allDocs.forEach((d) => {
      if (d.verificationStatus === "AUTO_VERIFIED") {
        autoVerifiedCount++;
        verifiedCount++;
      } else if (d.verificationStatus === "VERIFIED") {
        verifiedCount++;
        if (d.verificationMethod === "AUTOMATED") {
          autoVerifiedCount++;
        }
      } else if (d.verificationStatus === "VERIFICATION_FAILED") {
        verificationFailedCount++;
      } else if (d.verificationStatus === "MANUAL_REVIEW_REQUESTED" || d.verificationStatus === "NEEDS_REVIEW") {
        manualReviewRequestedCount++;
      } else if (d.verificationStatus === "UNDER_REVIEW") {
        underReviewCount++;
      } else if (d.verificationStatus === "REJECTED") {
        rejectedCount++;
      } else if (d.verificationStatus === "REUPLOAD_REQUIRED") {
        reuploadCount++;
      } else if (d.verificationStatus === "EXPIRED" || d.expiryStatus === "EXPIRED") {
        expiredCount++;
      }
    });

    const totalDocuments = allDocs.length;
    // Total processed for automation rate: automated + manual reviews + rejections
    const totalProcessed = autoVerifiedCount + manualReviewRequestedCount + underReviewCount + (verifiedCount - autoVerifiedCount) + rejectedCount;
    const automationRate = totalProcessed > 0 ? parseFloat(((autoVerifiedCount / totalProcessed) * 100).toFixed(1)) : 85.9;

    return {
      totalDocuments,
      autoVerifiedCount,
      verificationFailedCount,
      manualReviewRequestedCount,
      underReviewCount,
      verifiedCount,
      rejectedCount,
      reuploadCount,
      expiredCount,
      automationRate,
    };
  }

  static getAllStudents(query?: string, statusFilter?: string): AdminStudentRecord[] {
    const list: AdminStudentRecord[] = [];

    store.studentProfiles.forEach((p) => {
      let vStatus: VerificationQueueStatus = "Pending";
      if (p.verificationStatus === "approved") vStatus = "Approved";
      else if (p.verificationStatus === "rejected") vStatus = "Rejected";
      else if (p.verificationStatus === "needs_information") vStatus = "Needs Information";

      const dna = store.careerDNA.get(p.id);
      const githubConn = store.githubConnections.get(p.id);

      let careerDnaSummary = null;
      if (dna) {
        let scoreLabel = "Good";
        if (dna.overallScore >= 90) scoreLabel = "Exceptional";
        else if (dna.overallScore >= 80) scoreLabel = "Strong";
        else if (dna.overallScore >= 70) scoreLabel = "Good";
        else if (dna.overallScore >= 60) scoreLabel = "Developing";
        else scoreLabel = "Needs Improvement";

        careerDnaSummary = {
          score: dna.overallScore,
          rating: scoreLabel,
          confidence: dna.analysisConfidence || 85,
          primaryStrength: dna.potentialCareerDirections?.[0] || "Software Engineering",
          topSkills: (dna.topSkills || []).slice(0, 4).map((s) => s.name),
          projectsAnalyzed: dna.githubStats?.totalRepos || 0,
          verified: Boolean(githubConn && githubConn.syncStatus === "SYNCED"),
          lastAnalyzedAt: dna.updatedAt,
          summary: dna.summary,
          evidences: (dna.evidences || []).slice(0, 4),
          featuredProjects: dna.featuredProjects || [],
          skillGaps: dna.skillGaps || [],
          dimensions: dna.dimensions,
        };
      }

      const record: AdminStudentRecord = {
        id: p.id,
        name: p.name,
        email: p.email,
        college: p.university,
        degree: `${p.degree || "B.Tech"} ${p.branch || ""}`.trim(),
        year: p.yearOfStudy || "3rd Year",
        verificationStatus: vStatus,
        profileCompletion: p.skills.length > 0 && p.resume ? 95 : 80,
        lastActive: "Just now",
        joined: "Aug 2026",
        skills: p.skills || [],
        avatar: p.avatar,
        headline: p.headline,
        careerDNA: careerDnaSummary,
      };

      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.email.toLowerCase().includes(query.toLowerCase()) ||
        p.university.toLowerCase().includes(query.toLowerCase()) ||
        p.id.toLowerCase().includes(query.toLowerCase());

      const matchesStatus = !statusFilter || statusFilter === "All" || vStatus === statusFilter;

      if (matchesQuery && matchesStatus) {
        list.push(record);
      }
    });

    return list;
  }

  static getStudentProfileById(studentId: string): StudentProfile | null {
    const profile = store.studentProfiles.get(studentId) || (studentId === defaultStudentUser.id ? defaultStudentUser : null);
    return profile ? JSON.parse(JSON.stringify(profile)) : null;
  }

  static getStudent(studentId: string): StudentProfile | null {
    return this.getStudentProfileById(studentId);
  }

  static saveStudentProfile(profile: StudentProfile): void {
    store.studentProfiles.set(profile.id, profile);
  }

  static updateStudentProfile(studentId: string, updates: Partial<StudentProfile>): StudentProfile | null {
    const profile = store.studentProfiles.get(studentId) || (studentId === defaultStudentUser.id ? defaultStudentUser : null);
    const updated = { ...(profile || { ...defaultStudentUser, id: studentId }), ...updates, id: studentId };
    store.studentProfiles.set(studentId, updated as StudentProfile);
    return updated as StudentProfile;
  }

  static updateStudent(studentId: string, updates: Partial<StudentProfile>): StudentProfile | null {
    return this.updateStudentProfile(studentId, updates);
  }

  static addAuditLog(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
    const newLog: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      student: entry.student || entry.targetName || "Platform Resource",
      ...entry,
    };
    store.auditLogs.unshift(newLog);
    persistStoreToDisk();
    return newLog;
  }

  static getAuditLogs(filters?: { search?: string; action?: string }): AuditLogEntry[] {
    let list = [...store.auditLogs];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.admin.toLowerCase().includes(q) ||
          (l.student && l.student.toLowerCase().includes(q)) ||
          (l.targetName && l.targetName.toLowerCase().includes(q)) ||
          l.action.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          (l.reason && l.reason.toLowerCase().includes(q))
      );
    }
    if (filters?.action && filters.action !== "ALL") {
      list = list.filter((l) => l.action.toLowerCase() === filters.action!.toLowerCase());
    }
    return list;
  }

  static getAdminNotifications(): AdminNotificationItem[] {
    return [...store.adminNotifications];
  }

  static markAdminNotificationAsRead(id: string) {
    store.adminNotifications = store.adminNotifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
  }

  static getStudentNotifications(studentId: string): NotificationItem[] {
    return store.studentNotifications.get(studentId) || [...initialMockNotifications];
  }

  static addStudentNotification(studentId: string, notification: Omit<NotificationItem, "id" | "timestamp" | "isRead">) {
    const list = store.studentNotifications.get(studentId) || [];
    const newNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      timestamp: "Just now",
      isRead: false,
      ...notification,
    };
    list.unshift(newNotif);
    store.studentNotifications.set(studentId, list);
    return newNotif;
  }

  static findUserByGoogleId(googleId: string): User | null {
    // Check students
    const students = Array.from(store.studentProfiles.values());
    for (let i = 0; i < students.length; i++) {
      if (students[i].googleId === googleId) return students[i];
    }
    // Check recruiters
    const recruiters = Array.from(store.recruiterProfiles.values());
    for (let i = 0; i < recruiters.length; i++) {
      if (recruiters[i].googleId === googleId) return recruiters[i];
    }
    // Check admins
    const admins = Array.from(store.adminProfiles.values());
    for (let i = 0; i < admins.length; i++) {
      if (admins[i].googleId === googleId) return admins[i];
    }
    return null;
  }

  static findUserByEmail(email: string): User | null {
    const normalized = email.trim().toLowerCase();
    // Check students
    const students = Array.from(store.studentProfiles.values());
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (student.email.trim().toLowerCase() === normalized) return student;
      if (student.personalEmail && student.personalEmail.trim().toLowerCase() === normalized) return student;
      if (student.id === "student_01" && (normalized === "alex.rivera@stanford.edu" || normalized === "alex.rivera@university.edu")) return student;
    }
    // Check recruiters
    const recruiters = Array.from(store.recruiterProfiles.values());
    for (let i = 0; i < recruiters.length; i++) {
      if (recruiters[i].email.trim().toLowerCase() === normalized) return recruiters[i];
      if (recruiters[i].id === "recruiter_01" && (normalized === "barun@stripe-careers.com" || normalized === "sarah.chen@stripe-careers.com")) return recruiters[i];
    }
    // Check college profiles
    if (store.collegeProfiles) {
      const colleges = Array.from(store.collegeProfiles.values());
      for (let i = 0; i < colleges.length; i++) {
        if (colleges[i].email.trim().toLowerCase() === normalized) return colleges[i];
      }
    }
    // Check admins
    const admins = Array.from(store.adminProfiles.values());
    for (let i = 0; i < admins.length; i++) {
      if (admins[i].email.trim().toLowerCase() === normalized) return admins[i];
    }
    return null;
  }

  static getDemoUser(roleKey: string): { user: User; role: UserRole; redirectUrl: string } | null {
    const norm = (roleKey || "").trim().toLowerCase();
    ensureCollegeStore();

    if (norm === "student") {
      let student = store.studentProfiles.get("student_01");
      if (!student) {
        student = {
          ...defaultStudentUser,
          id: "student_01",
          email: "alex.rivera@stanford.edu",
          role: "STUDENT",
          collegeId: "col_stanford",
          verificationStatus: "approved",
          onboardingCompleted: true,
          accountStatus: "onboarding_complete",
        };
      } else {
        student.verificationStatus = "approved";
        student.onboardingCompleted = true;
        student.accountStatus = "onboarding_complete";
        student.role = "STUDENT";
        student.email = "alex.rivera@stanford.edu";
      }
      store.studentProfiles.set("student_01", student);
      return {
        user: { ...student, role: "STUDENT" },
        role: "STUDENT",
        redirectUrl: "/dashboard",
      };
    }

    if (norm === "recruiter" || norm === "company_admin") {
      let recruiter = store.recruiterProfiles.get("recruiter_01");
      if (!recruiter) {
        recruiter = {
          ...defaultRecruiterUser,
          id: "recruiter_01",
          email: "barun@stripe-careers.com",
          role: "RECRUITER",
          company: "Stripe",
        };
      } else {
        recruiter.role = "RECRUITER";
        recruiter.email = "barun@stripe-careers.com";
      }
      store.recruiterProfiles.set("recruiter_01", recruiter);
      return {
        user: { ...recruiter, role: "RECRUITER" },
        role: "RECRUITER",
        redirectUrl: "/dashboard/recruiter",
      };
    }

    if (
      norm === "college_admin" ||
      norm === "college" ||
      norm === "college_dean" ||
      norm === "placement_officer" ||
      norm === "college_placement_officer" ||
      norm === "dean"
    ) {
      if (!store.collegeProfiles) {
        store.collegeProfiles = new Map();
      }
      let college = store.collegeProfiles.get("college_01");
      if (!college) {
        college = {
          ...defaultCollegeUser,
          id: "college_01",
          email: "placement@stanford.edu",
          role: "COLLEGE_ADMIN",
          collegeId: "col_stanford",
        };
      } else {
        college.role = "COLLEGE_ADMIN";
        college.email = "placement@stanford.edu";
      }
      store.collegeProfiles.set("college_01", college);
      return {
        user: { ...college, role: "COLLEGE_ADMIN" },
        role: "COLLEGE_ADMIN",
        redirectUrl: "/college/dashboard",
      };
    }

    if (
      norm === "admin" ||
      norm === "platform_admin" ||
      norm === "super_admin" ||
      norm === "verification_officer"
    ) {
      let admin = store.adminProfiles.get("admin_01");
      if (!admin) {
        admin = {
          ...defaultAdminUser,
          id: "admin_01",
          email: "priya.menon@commandskill.io",
          role: "PLATFORM_ADMIN",
        };
      } else {
        admin.role = "PLATFORM_ADMIN";
        admin.email = "priya.menon@commandskill.io";
      }
      store.adminProfiles.set("admin_01", admin);
      return {
        user: { ...admin, role: "PLATFORM_ADMIN" },
        role: "PLATFORM_ADMIN",
        redirectUrl: "/admin",
      };
    }

    return null;
  }

  static authenticateWithPassword(
    email: string,
    password: string,
    requestedRole?: string
  ): { user: User; role: UserRole; redirectUrl: string } | { error: string; status: number } {
    ensureCollegeStore();
    ensureCredentialsStore();

    const normEmail = (email || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    if (!normEmail || !cleanPassword) {
      return { error: "Email and password are required.", status: 400 };
    }

    const cred = store.userCredentials.get(normEmail);
    if (!cred || cred.passwordHash !== cleanPassword) {
      return { error: "Invalid email or password. Please verify your credentials and try again.", status: 401 };
    }

    let userProfile: User | null = null;
    let canonicalRole: UserRole = cred.role;

    if (cred.role === "STUDENT" || cred.role === "student") {
      let student = store.studentProfiles.get(cred.userId);
      if (!student) {
        student = {
          ...defaultStudentUser,
          id: cred.userId,
          email: cred.email,
          role: "STUDENT",
          verificationStatus: isUniversityEmail(cred.email) ? "approved" : "not_submitted",
          onboardingCompleted: isUniversityEmail(cred.email),
          accountStatus: isUniversityEmail(cred.email) ? "onboarding_complete" : "account_created",
        };
        store.studentProfiles.set(cred.userId, student);
      }
      userProfile = { ...student, role: "STUDENT" };
      canonicalRole = "STUDENT";
    } else if (cred.role === "RECRUITER" || cred.role === "recruiter") {
      let recruiter = store.recruiterProfiles.get(cred.userId);
      if (!recruiter) {
        recruiter = {
          ...defaultRecruiterUser,
          id: cred.userId,
          email: cred.email,
          role: "RECRUITER",
        };
        store.recruiterProfiles.set(cred.userId, recruiter);
      }
      userProfile = { ...recruiter, role: "RECRUITER" };
      canonicalRole = "RECRUITER";
    } else if (cred.role === "COLLEGE_ADMIN" || cred.role === "COLLEGE_PLACEMENT_OFFICER") {
      let college = store.collegeProfiles?.get(cred.userId);
      if (!college) {
        college = {
          ...defaultCollegeUser,
          id: cred.userId,
          email: cred.email,
          role: "COLLEGE_ADMIN",
        };
        store.collegeProfiles?.set(cred.userId, college);
      }
      userProfile = { ...college, role: "COLLEGE_ADMIN" };
      canonicalRole = "COLLEGE_ADMIN";
    } else {
      let admin = store.adminProfiles.get(cred.userId);
      if (!admin) {
        admin = {
          ...defaultAdminUser,
          id: cred.userId,
          email: cred.email,
          role: "PLATFORM_ADMIN",
        };
        store.adminProfiles.set(cred.userId, admin);
      }
      userProfile = { ...admin, role: "PLATFORM_ADMIN" };
      canonicalRole = "PLATFORM_ADMIN";
    }

    const roleStr = String(canonicalRole);
    const redirectUrl =
      roleStr === "PLATFORM_ADMIN" || roleStr === "SUPER_ADMIN"
        ? "/admin"
        : roleStr === "COLLEGE_ADMIN" || roleStr === "COLLEGE_PLACEMENT_OFFICER"
        ? "/college/dashboard"
        : roleStr === "RECRUITER" || roleStr === "COMPANY_ADMIN"
        ? "/dashboard/recruiter"
        : (userProfile as StudentProfile).verificationStatus === "not_submitted"
        ? "/onboarding?step=verification"
        : "/dashboard";

    return { user: userProfile, role: canonicalRole, redirectUrl };
  }

  static registerUser(data: {
    role: "student" | "recruiter" | "STUDENT" | "RECRUITER";
    name: string;
    email: string;
    password: string;
    university?: string;
    phone?: string;
    companyName?: string;
    companyWebsite?: string;
    companyLocation?: string;
    companySize?: string;
    companyType?: string;
    jobTitle?: string;
    department?: string;
    recruiterRole?: string;
    recruiterUsage?: string[];
  }): { user: User; role: UserRole; redirectUrl: string } | { error: string; status: number } {
    ensureCollegeStore();
    ensureCredentialsStore();

    const normEmail = (data.email || "").trim().toLowerCase();
    const cleanPassword = (data.password || "").trim();
    const cleanName = (data.name || "").trim();

    if (!normEmail || !normEmail.includes("@")) {
      return { error: "A valid email address is required.", status: 400 };
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return { error: "Password must be at least 6 characters.", status: 400 };
    }
    if (!cleanName) {
      return { error: "Full name is required.", status: 400 };
    }

    // Check for duplicate account
    if (store.userCredentials.has(normEmail) || ServerStore.findUserByEmail(normEmail)) {
      return { error: "An account with this email address already exists. Please sign in.", status: 409 };
    }

    const isRecruiter = (data.role || "").toLowerCase() === "recruiter";

    if (isRecruiter) {
      const recruiterId = `recruiter_${Date.now()}`;
      const newRecruiter: RecruiterProfile = {
        id: recruiterId,
        name: cleanName,
        email: normEmail,
        phone: data.phone?.trim() || "",
        role: "recruiter",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        title: data.jobTitle?.trim() || "University Talent Partner",
        department: data.department?.trim() || "University Talent & Early Career",
        company: data.companyName?.trim() || "Enterprise Partner",
        companyLogo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=80",
        companyWebsite: data.companyWebsite?.trim() || "",
        companyLocation: data.companyLocation?.trim() || "San Francisco, CA",
        companySize: data.companySize || "500 - 1,000 employees",
        companyType: data.companyType || "Technology & Software",
        recruiterRole: data.recruiterRole || "Talent Acquisition",
        recruiterUsage: data.recruiterUsage || ["Hire interns", "Discover student talent"],
        location: data.companyLocation?.trim() || "San Francisco, CA",
        bio: `Hiring ambitious college students and university talent at ${data.companyName?.trim() || "our company"}.`,
        verificationStatus: "Recruiter Verified",
        activeListingsCount: 0,
        candidatesReviewed: 0,
        interviewsConducted: 0,
      };

      store.recruiterProfiles.set(recruiterId, newRecruiter);
      store.userCredentials.set(normEmail, {
        userId: recruiterId,
        email: normEmail,
        passwordHash: cleanPassword,
        role: "RECRUITER",
        createdAt: new Date().toISOString(),
      });

      return {
        user: { ...newRecruiter, role: "RECRUITER" },
        role: "RECRUITER",
        redirectUrl: "/dashboard/recruiter",
      };
    } else {
      const studentId = `student_${Date.now()}`;
      const isUni = isUniversityEmail(normEmail);
      const uniName = (data.university || "").trim() || "University";

      const newStudent: StudentProfile = {
        id: studentId,
        name: cleanName,
        email: normEmail,
        role: "student",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        headline: `Student @ ${uniName}`,
        university: uniName,
        degree: "Undergraduate",
        branch: "General",
        academicStream: "Engineering & Technology",
        specialization: "",
        academicLevel: "Undergraduate",
        yearOfStudy: "1st Year",
        graduationYear: new Date().getFullYear() + 4,
        cgpa: "",
        location: "Campus / Remote",
        bio: "",
        phone: "",
        hasUniversityEmail: isUni,
        isUniversityEmail: isUni,
        personalEmail: "",
        status: "Looking for Part-time",
        skills: [],
        resume: null,
        projects: [],
        certifications: [],
        socialLinks: {},
        stats: {
          profileViews: 1,
          searchAppearances: 0,
          applicationsCount: 0,
          interviewsCount: 0,
        },
        accountStatus: isUni ? "onboarding_complete" : "account_created",
        verificationStatus: isUni ? "approved" : "not_submitted",
        onboardingCompleted: isUni,
      };

      store.studentProfiles.set(studentId, newStudent);
      store.userCredentials.set(normEmail, {
        userId: studentId,
        email: normEmail,
        passwordHash: cleanPassword,
        role: "STUDENT",
        createdAt: new Date().toISOString(),
      });

      return {
        user: { ...newStudent, role: "STUDENT" },
        role: "STUDENT",
        redirectUrl: isUni ? "/dashboard" : "/onboarding?step=verification",
      };
    }
  }

  static resetPassword(email: string, newPassword?: string): { success: boolean; message: string } | { error: string; status: number } {
    ensureCredentialsStore();
    const normEmail = (email || "").trim().toLowerCase();
    if (!normEmail) {
      return { error: "Email is required.", status: 400 };
    }

    const cred = store.userCredentials.get(normEmail);
    if (!cred) {
      const user = ServerStore.findUserByEmail(normEmail);
      if (!user) {
        return { error: "No account found with this email address.", status: 404 };
      }
      store.userCredentials.set(normEmail, {
        userId: user.id,
        email: normEmail,
        passwordHash: newPassword?.trim() || "commandskill123",
        role: (user.role || "STUDENT").toUpperCase() as UserRole,
        createdAt: new Date().toISOString(),
      });
      return { success: true, message: `Password reset instructions sent to ${normEmail}.` };
    }

    cred.passwordHash = newPassword?.trim() || "commandskill123";
    return { success: true, message: `Password reset instructions sent to ${normEmail}.` };
  }

  static handleGoogleAuth(params: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
    role?: UserRole;
    university?: string;
    company?: string;
  }): { user: User; isNewUser: boolean; redirectUrl: string } | { error: string; status: number } {
    const { googleId, email, name, avatar, role = "student", university, company } = params;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user already exists with this googleId
    const existingGoogleUser = ServerStore.findUserByGoogleId(googleId);
    if (existingGoogleUser) {
      const redirectUrl =
        existingGoogleUser.role === "admin"
          ? "/admin"
          : existingGoogleUser.role === "recruiter"
          ? "/dashboard/recruiter"
          : (existingGoogleUser as StudentProfile).verificationStatus === "not_submitted"
          ? "/onboarding?step=verification"
          : "/dashboard";

      return { user: existingGoogleUser, isNewUser: false, redirectUrl };
    }

    // 2. Check if user already exists with this verified email (Account Linking)
    const existingEmailUser = ServerStore.findUserByEmail(normalizedEmail);
    if (existingEmailUser) {
      // Safely link the Google ID to existing account
      existingEmailUser.googleId = googleId;
      existingEmailUser.emailVerified = true;
      existingEmailUser.authProvider = "google";
      if (avatar && (!existingEmailUser.avatar || existingEmailUser.avatar.includes("unsplash") === false)) {
        existingEmailUser.avatar = avatar;
      }

      if (existingEmailUser.role === "student") {
        store.studentProfiles.set(existingEmailUser.id, existingEmailUser as StudentProfile);
      } else if (existingEmailUser.role === "recruiter") {
        store.recruiterProfiles.set(existingEmailUser.id, existingEmailUser as RecruiterProfile);
      } else if (existingEmailUser.role === "admin") {
        store.adminProfiles.set(existingEmailUser.id, existingEmailUser as AdminProfile);
      }

      const redirectUrl =
        existingEmailUser.role === "admin"
          ? "/admin"
          : existingEmailUser.role === "recruiter"
          ? "/dashboard/recruiter"
          : (existingEmailUser as StudentProfile).verificationStatus === "not_submitted"
          ? "/onboarding?step=verification"
          : "/dashboard";

      return { user: existingEmailUser, isNewUser: false, redirectUrl };
    }

    // 3. New User Registration Flow
    // Admin Security Rule: Public users CANNOT self-select Admin role on signup
    if (role === "admin") {
      const authorizedAdmins = ["priya.menon@commandskill.io", "admin@commandskill.io", "admin@commandskill.com"];
      const isAuthorized =
        authorizedAdmins.includes(normalizedEmail) ||
        Array.from(store.adminProfiles.values()).some((a) => a.email.toLowerCase() === normalizedEmail);

      if (!isAuthorized) {
        return {
          error: "Unauthorized: This Google account is not registered as an administrator. Please contact your system administrator.",
          status: 403,
        };
      }
    }

    if (role === "COLLEGE_ADMIN" || (role as string) === "college") {
      const existingCollege = defaultCollegeUser;
      return { user: existingCollege, isNewUser: false, redirectUrl: "/college/dashboard" };
    }

    if (role === "recruiter") {
      const newRecruiterId = `recruiter_${Date.now()}`;
      const newRecruiter: RecruiterProfile = {
        id: newRecruiterId,
        name: name || "Recruiter",
        email: normalizedEmail,
        role: "recruiter",
        avatar: avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        title: "Talent Acquisition Specialist",
        company: company || "Partner Company",
        companyLogo: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
        location: "San Francisco, CA / Remote",
        bio: `Recruiting talent at ${company || "our organization"}.`,
        verificationStatus: "Pending",
        activeListingsCount: 0,
        candidatesReviewed: 0,
        googleId,
        emailVerified: true,
        authProvider: "google",
      };

      store.recruiterProfiles.set(newRecruiterId, newRecruiter);
      return { user: newRecruiter, isNewUser: true, redirectUrl: "/dashboard/recruiter" };
    }

    // Default: Student Registration
    const isUni = isUniversityEmail(normalizedEmail);
    const newStudentId = `student_${Date.now()}`;
    const newStudent: StudentProfile = {
      id: newStudentId,
      name: name || "Student Candidate",
      email: normalizedEmail,
      role: "student",
      avatar: avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      headline: `Student @ ${university || "University"}`,
      university: university || (isUni ? normalizedEmail.split("@")[1] : "University"),
      degree: "Undergraduate Studies",
      branch: "Computer Science & Engineering",
      academicStream: "Engineering & Technology",
      specialization: "General",
      academicLevel: "Undergraduate",
      yearOfStudy: "1st Year",
      graduationYear: new Date().getFullYear() + 4,
      cgpa: "",
      location: "Campus / Remote",
      bio: "Ambitious student exploring technology and software engineering opportunities.",
      hasUniversityEmail: isUni,
      isUniversityEmail: isUni,
      personalEmail: normalizedEmail,
      accountStatus: isUni ? "profile_complete" : "account_created",
      // Non-university emails MUST go through CommandSkill verification!
      verificationStatus: isUni ? "approved" : "not_submitted",
      onboardingCompleted: isUni,
      verificationRequest: null,
      status: "Open to Summer 2026 Internships",
      skills: ["Problem Solving", "Collaboration"],
      resume: null,
      projects: [],
      certifications: [],
      socialLinks: {},
      stats: {
        profileViews: 0,
        searchAppearances: 0,
        applicationsCount: 0,
        interviewsCount: 0,
      },
      googleId,
      emailVerified: true,
      authProvider: "google",
    };

    store.studentProfiles.set(newStudentId, newStudent);

    // Add initial welcome notification
    store.studentNotifications.set(newStudentId, [
      {
        id: `notif_${newStudentId}_1`,
        type: "system",
        title: "Welcome to CommandSkill!",
        description: isUni
          ? "Your institutional email was automatically verified. Complete your profile to get discovered!"
          : "Your Google account is connected. Please submit your student verification to unlock full student perks.",
        timestamp: "Just now",
        isRead: false,
      },
    ]);

    const redirectUrl = isUni ? "/dashboard" : "/onboarding?step=verification";
    return { user: newStudent, isNewUser: true, redirectUrl };
  }

  // ==========================================================================
  // INSTITUTION & COLLEGE MANAGEMENT METHODS
  // ==========================================================================

  static getColleges(filters?: { search?: string; status?: string }): CollegeRecord[] {
    ensureCollegeStore();
    let list = Array.from(store.colleges.values());
    if (filters?.status && filters.status !== "All") {
      list = list.filter((c) => c.status.toLowerCase() === filters.status?.toLowerCase());
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  static getCollegeById(id: string): CollegeRecord | null {
    if (!id) return null;
    ensureCollegeStore();
    const direct = store.colleges.get(id);
    if (direct) return direct;
    const lower = id.toLowerCase();
    for (const c of store.colleges.values()) {
      if (c.slug.toLowerCase() === lower || c.code.toLowerCase() === lower || c.name.toLowerCase() === lower) {
        return c;
      }
    }
    return null;
  }

  static updateCollege(id: string, updates: Partial<CollegeRecord>, actorName: string = "Admin"): CollegeRecord | null {
    const col = this.getCollegeById(id);
    if (!col) return null;
    const updated: CollegeRecord = {
      ...col,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    store.colleges.set(col.id, updated);
    this.addAuditLog({
      admin: actorName,
      action: "UPDATED",
      targetId: col.id,
      targetName: col.name,
      targetType: "COLLEGE",
      details: `Updated institutional profile and settings for ${col.name}`,
      ipSessionRef: "127.0.0.1 (Institutional Console)",
    });
    persistStoreToDisk();
    return updated;
  }

  static approveCollege(id: string, adminName: string = "Platform Admin"): CollegeRecord | null {
    const col = this.getCollegeById(id);
    if (!col) return null;
    col.status = "ACTIVE";
    col.verificationStatus = "VERIFIED";
    col.updatedAt = new Date().toISOString();
    store.colleges.set(col.id, col);
    this.addAuditLog({
      admin: adminName,
      action: "APPROVED",
      targetId: col.id,
      targetName: col.name,
      targetType: "COLLEGE",
      details: `Approved institutional registration and granted full placement workspace access to ${col.name}`,
      ipSessionRef: "127.0.0.1 (Platform Admin)",
    });
    persistStoreToDisk();
    return col;
  }

  static suspendCollege(id: string, reason: string, adminName: string = "Platform Admin"): CollegeRecord | null {
    const col = this.getCollegeById(id);
    if (!col) return null;
    col.status = "SUSPENDED";
    col.updatedAt = new Date().toISOString();
    store.colleges.set(col.id, col);
    this.addAuditLog({
      admin: adminName,
      action: "SUSPENDED",
      targetId: col.id,
      targetName: col.name,
      targetType: "COLLEGE",
      details: `Suspended institution: ${reason}`,
      ipSessionRef: "127.0.0.1 (Platform Admin)",
    });
    persistStoreToDisk();
    return col;
  }

  static getCollegeStudents(
    collegeId: string,
    filters?: {
      search?: string;
      department?: string;
      branch?: string;
      batch?: number | string;
      status?: string;
      verificationStatus?: string;
    }
  ): StudentProfile[] {
    const col = this.getCollegeById(collegeId);
    const collegeKey = col?.id || collegeId;
    const collegeName = col?.name.toLowerCase() || "";

    let students = Array.from(store.studentProfiles.values()).filter((s) => {
      if (s.collegeId && s.collegeId === collegeKey) return true;
      if (collegeName && s.university && s.university.toLowerCase().includes(collegeName)) return true;
      return false;
    });

    if (filters?.department && filters.department !== "All") {
      const dep = filters.department.toLowerCase();
      students = students.filter(
        (s) =>
          (s.branch && s.branch.toLowerCase().includes(dep)) ||
          (s.specialization && s.specialization.toLowerCase().includes(dep))
      );
    }

    if (filters?.branch && filters.branch !== "All") {
      const br = filters.branch.toLowerCase();
      students = students.filter(
        (s) =>
          (s.branch && s.branch.toLowerCase().includes(br)) ||
          (s.specialization && s.specialization.toLowerCase().includes(br))
      );
    }

    if (filters?.batch && filters.batch !== "All") {
      const bYear = Number(filters.batch);
      students = students.filter((s) => s.graduationYear === bYear);
    }

    if (filters?.verificationStatus && filters.verificationStatus !== "All") {
      students = students.filter(
        (s) => (s.verificationStatus || "").toLowerCase() === filters.verificationStatus?.toLowerCase()
      );
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      students = students.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.branch && s.branch.toLowerCase().includes(q))
      );
    }

    return students.sort((a, b) => a.name.localeCompare(b.name));
  }

  static getCollegeDepartments(collegeId: string): CollegeDepartment[] {
    const col = this.getCollegeById(collegeId);
    if (!col) return [];
    const students = this.getCollegeStudents(col.id);
    return col.departments.map((d) => {
      const deptStudents = students.filter(
        (s) =>
          (s.branch && s.branch.toLowerCase().includes(d.name.toLowerCase())) ||
          (s.branch && s.branch.toLowerCase().includes(d.code.toLowerCase()))
      );
      const studentCount = deptStudents.length > 0 ? deptStudents.length : d.studentCount;
      const eligibleCount = deptStudents.filter((s) => parseFloat(s.cgpa) >= 3.0).length || d.eligibleCount;
      const placedCount =
        deptStudents.filter((s) => s.status?.toLowerCase().includes("placed") || (s.stats?.applicationsCount || 0) > 2).length ||
        d.placedCount;
      const placementRate = studentCount > 0 ? Number(((placedCount / studentCount) * 100).toFixed(1)) : d.placementRate;
      return {
        ...d,
        studentCount,
        eligibleCount,
        placedCount,
        placementRate,
      };
    });
  }

  static getCollegeBatches(collegeId: string): CollegeBatch[] {
    const col = this.getCollegeById(collegeId);
    if (!col) return [];
    const students = this.getCollegeStudents(col.id);
    return col.batches.map((b) => {
      const batchStudents = students.filter((s) => s.graduationYear === b.year);
      const totalStudents = batchStudents.length > 0 ? batchStudents.length : b.totalStudents;
      const eligibleStudents = batchStudents.filter((s) => parseFloat(s.cgpa) >= 3.0).length || b.eligibleStudents;
      const placedStudents =
        batchStudents.filter((s) => s.status?.toLowerCase().includes("placed") || (s.stats?.applicationsCount || 0) > 2).length ||
        b.placedStudents;
      const unplacedStudents = Math.max(0, totalStudents - placedStudents);
      const placementRate = totalStudents > 0 ? Number(((placedStudents / totalStudents) * 100).toFixed(1)) : b.placementRate;
      return {
        ...b,
        totalStudents,
        eligibleStudents,
        placedStudents,
        unplacedStudents,
        placementRate,
      };
    });
  }

  static getCollegeDriveParticipation(collegeId: string): CollegeDriveParticipation[] {
    const col = this.getCollegeById(collegeId);
    const key = col?.id || collegeId;
    return store.collegeParticipation.get(key) || [];
  }

  static updateCollegeDriveParticipation(
    collegeId: string,
    driveId: string,
    status: CollegeParticipationStatus,
    actorName: string = "Placement Officer"
  ): CollegeDriveParticipation {
    const col = this.getCollegeById(collegeId);
    const key = col?.id || collegeId;
    const list = store.collegeParticipation.get(key) || [];

    let entry = list.find((p) => p.driveId === driveId);
    if (entry) {
      entry.status = status;
      entry.updatedAt = new Date().toISOString();
      if (status === "APPROVED") {
        entry.approvedAt = new Date().toISOString();
        entry.approvedBy = actorName;
      }
    } else {
      let dTitle = "Recruitment Drive";
      let cName = "Corporate Partner";
      if (recruitmentStore && recruitmentStore.drives) {
        const dr = recruitmentStore.drives.get(driveId);
        if (dr) {
          dTitle = dr.title;
          cName = dr.company;
        }
      }
      entry = {
        id: `part_${key}_${driveId}`,
        collegeId: key,
        driveId,
        driveTitle: dTitle,
        companyName: cName,
        status,
        approvedAt: status === "APPROVED" ? new Date().toISOString() : undefined,
        approvedBy: status === "APPROVED" ? actorName : undefined,
        registeredStudentsCount: 0,
        eligibleStudentsCount: 0,
        shortlistedCount: 0,
        interviewedCount: 0,
        selectedCount: 0,
        offersCount: 0,
        updatedAt: new Date().toISOString(),
      };
      list.push(entry);
    }

    store.collegeParticipation.set(key, list);
    this.addAuditLog({
      admin: actorName,
      action: "UPDATED",
      targetId: driveId,
      targetName: entry.driveTitle || `Drive ${driveId}`,
      targetType: "DRIVE",
      details: `Updated institutional participation status to ${status}`,
      ipSessionRef: "127.0.0.1 (Institutional Console)",
    });
    persistStoreToDisk();
    return entry;
  }

  static getCollegeMetrics(collegeId: string) {
    const col = this.getCollegeById(collegeId);
    const students = this.getCollegeStudents(col?.id || collegeId);
    const totalStudents = students.length || col?.stats.totalStudents || 1248;
    const eligibleStudents = students.filter((s) => parseFloat(s.cgpa) >= 3.0).length || col?.stats.eligibleStudents || 1150;
    const placedStudents =
      students.filter((s) => s.status?.toLowerCase().includes("placed") || (s.stats?.applicationsCount || 0) > 2).length ||
      col?.stats.placedStudents ||
      865;
    const placementRate = totalStudents > 0 ? Number(((placedStudents / totalStudents) * 100).toFixed(1)) : col?.stats.placementRate || 69.3;

    let activePlacementDrives = 0;
    if (recruitmentStore && recruitmentStore.drives) {
      const allDrives = Array.from(recruitmentStore.drives.values());
      activePlacementDrives = allDrives.filter((d) =>
        ["APPLICATIONS_OPEN", "PUBLISHED", "SCREENING", "SELECTION_IN_PROGRESS"].includes(d.status)
      ).length;
    }
    if (activePlacementDrives === 0 && col) {
      activePlacementDrives = col.stats.activeDrives;
    }

    let offersReceived = 0;
    if (recruitmentStore && recruitmentStore.applications) {
      const colApps = Array.from(recruitmentStore.applications.values()).filter(
        (a) => a.university?.toLowerCase().includes(col?.name.toLowerCase() || "") || students.some((s) => s.id === a.studentId)
      );
      offersReceived = colApps.filter((a) => a.status === "SELECTED" || (a.finalScore && a.finalScore >= 80)).length;
    }
    if (offersReceived === 0 && col) {
      offersReceived = col.stats.totalOffers;
    }

    const pendingVerifications = students.filter(
      (s) => s.verificationStatus === "pending" || s.verificationStatus === "needs_information"
    ).length;

    return {
      totalStudents,
      eligibleStudents,
      activePlacementDrives,
      studentsPlaced: placedStudents,
      placementRate,
      offersReceived,
      companiesEngaged: col?.stats.companiesEngaged || 28,
      pendingVerifications,
      averagePackage: col?.stats.averagePackage || "$118,500 / yr",
      highestPackage: col?.stats.highestPackage || "$175,000 / yr",
    };
  }

  static getCollegeRecruiters(collegeId: string) {
    const col = this.getCollegeById(collegeId);
    const companiesList = Array.from(store.companies.values());
    const drivesList = recruitmentStore && recruitmentStore.drives ? Array.from(recruitmentStore.drives.values()) : [];
    const appsList = recruitmentStore && recruitmentStore.applications ? Array.from(recruitmentStore.applications.values()) : [];

    return companiesList.map((comp) => {
      const compDrives = drivesList.filter((d) => d.company.toLowerCase() === comp.name.toLowerCase());
      const compApps = appsList.filter((a) => a.company.toLowerCase() === comp.name.toLowerCase());
      const hires = compApps.filter((a) => a.status === "SELECTED").length;

      return {
        id: comp.id,
        name: comp.name,
        logo: comp.website ? `https://logo.clearbit.com/${new URL(comp.website).hostname}` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80&auto=format&fit=crop&q=80",
        industry: comp.industry,
        location: comp.location,
        activeDrivesCount: compDrives.length,
        applicantsCount: compApps.length,
        hiresCount: hires,
        lastActive: "Recently",
      };
    });
  }

  static getCollegeCareerDNAInsights(collegeId: string) {
    const students = this.getCollegeStudents(collegeId);
    const skillCounts: Record<string, number> = {};

    students.forEach((s) => {
      (s.skills || []).forEach((sk) => {
        skillCounts[sk] = (skillCounts[sk] || 0) + 1;
      });
    });

    const topSkills = Object.entries(skillCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: students.length > 0 ? Math.round((count / students.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    let high = 0;
    let medium = 0;
    let needsDev = 0;

    students.forEach((s) => {
      const cgpaNum = parseFloat(s.cgpa) || 3.0;
      const skillsNum = (s.skills || []).length;
      if (cgpaNum >= 3.7 && skillsNum >= 6) high++;
      else if (cgpaNum >= 3.2 && skillsNum >= 4) medium++;
      else needsDev++;
    });

    const total = students.length || 1;
    const readiness = {
      highReadinessCount: high,
      highReadinessPercent: Math.round((high / total) * 100),
      mediumReadinessCount: medium,
      mediumReadinessPercent: Math.round((medium / total) * 100),
      needsDevelopmentCount: needsDev,
      needsDevelopmentPercent: Math.round((needsDev / total) * 100),
    };

    const recruiterDemands = [
      { skill: "TypeScript", demandLevel: 92 },
      { skill: "React", demandLevel: 88 },
      { skill: "Python", demandLevel: 85 },
      { skill: "System Design", demandLevel: 78 },
      { skill: "Docker & Kubernetes", demandLevel: 72 },
      { skill: "PostgreSQL", demandLevel: 70 },
      { skill: "AI / LLM Pipelines", demandLevel: 68 },
    ];

    const skillGaps = recruiterDemands.map((item) => {
      const studentSkill = topSkills.find((ts) => ts.name.toLowerCase() === item.skill.toLowerCase());
      const studentAvailability = studentSkill ? studentSkill.percentage : Math.floor(Math.random() * 30 + 20);
      const gap = Math.max(0, item.demandLevel - studentAvailability);
      return {
        skill: item.skill,
        recruiterDemand: item.demandLevel,
        studentAvailability,
        gapPercentage: gap,
        recommendation:
          gap > 30
            ? "Urgent workshop recommended"
            : gap > 15
            ? "Include in technical electives"
            : "Strong student alignment",
      };
    });

    return {
      topSkills,
      readiness,
      skillGaps,
      totalStudentsAnalyzed: students.length,
      averageReadinessIndex: Math.round(
        (readiness.highReadinessPercent * 90 + readiness.mediumReadinessPercent * 70 + readiness.needsDevelopmentPercent * 50) / 100
      ),
    };
  }

  static getPlatformInstitutionalMetrics() {
    ensureCollegeStore();
    const colleges = Array.from(store.colleges.values());
    const totalColleges = colleges.length;
    const activeColleges = colleges.filter((c) => c.status === "ACTIVE").length;
    const pendingColleges = colleges.filter((c) => c.status === "PENDING").length;
    const suspendedColleges = colleges.filter((c) => c.status === "SUSPENDED").length;

    let totalStudentsAcrossColleges = 0;
    let totalOffersAcrossColleges = 0;
    let placedSum = 0;

    colleges.forEach((c) => {
      totalStudentsAcrossColleges += c.stats.totalStudents || 0;
      totalOffersAcrossColleges += c.stats.totalOffers || 0;
      placedSum += c.stats.placedStudents || 0;
    });

    const platformPlacementRate =
      totalStudentsAcrossColleges > 0
        ? Number(((placedSum / totalStudentsAcrossColleges) * 100).toFixed(1))
        : 72.4;

    return {
      totalColleges,
      activeColleges,
      pendingColleges,
      suspendedColleges,
      totalStudentsAcrossColleges,
      totalOffersAcrossColleges,
      platformPlacementRate,
      topColleges: colleges
        .filter((c) => c.status === "ACTIVE")
        .sort((a, b) => (b.stats.placementRate || 0) - (a.stats.placementRate || 0))
        .slice(0, 5),
    };
  }
}

/**
 * Gets a student's connected GitHub record by userId
 */
export function getGitHubConnection(userId: string): GitHubConnectionRecord | null {
  return store.githubConnections.get(userId) || null;
}

/**
 * Checks if a GitHub account is already linked to any user
 */
export function getGitHubConnectionByGithubId(githubUserId: string): GitHubConnectionRecord | null {
  const connections = Array.from(store.githubConnections.values());
  for (const conn of connections) {
    if (String(conn.githubUserId) === String(githubUserId)) {
      return conn;
    }
  }
  return null;
}

/**
 * Saves or updates a GitHub connection for a student user
 */
export function saveGitHubConnection(
  data: Omit<GitHubConnectionRecord, "id" | "connectedAt" | "updatedAt">
): GitHubConnectionRecord {
  const existing = store.githubConnections.get(data.userId);
  const now = new Date().toISOString();

  const record: GitHubConnectionRecord = {
    id: existing?.id || `gh_conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...data,
    connectedAt: existing?.connectedAt || now,
    updatedAt: now,
  };

  store.githubConnections.set(data.userId, record);

  // Synchronize student profile GitHub social link and connection metadata
  const student = store.studentProfiles.get(data.userId);
  if (student) {
    student.socialLinks = {
      ...student.socialLinks,
      github: data.githubProfileUrl,
    };
    student.githubConnection = {
      id: record.id,
      userId: record.userId,
      githubUserId: record.githubUserId,
      githubUsername: record.githubUsername,
      githubDisplayName: record.githubDisplayName,
      githubAvatarUrl: record.githubAvatarUrl,
      githubProfileUrl: record.githubProfileUrl,
      connectedAt: record.connectedAt,
      updatedAt: record.updatedAt,
    };
  }

  return record;
}

/**
 * Disconnects a GitHub account from a student profile
 */
export function deleteGitHubConnection(userId: string): boolean {
  const deleted = store.githubConnections.delete(userId);
  store.githubRepositories.delete(userId);

  const student = store.studentProfiles.get(userId);
  if (student) {
    if (student.socialLinks) {
      delete student.socialLinks.github;
    }
    delete student.githubConnection;
  }

  return deleted;
}

/**
 * Updates the GitHub sync status and metadata for a user
 */
export function updateGitHubSyncStatus(
  userId: string,
  syncStatus: GitHubSyncStatus,
  metadata?: Partial<GitHubConnectionRecord>
): GitHubConnectionRecord | null {
  const existing = store.githubConnections.get(userId);
  if (!existing) return null;

  const updated: GitHubConnectionRecord = {
    ...existing,
    syncStatus,
    ...metadata,
    updatedAt: new Date().toISOString(),
  };

  store.githubConnections.set(userId, updated);

  const student = store.studentProfiles.get(userId);
  if (student && student.githubConnection) {
    student.githubConnection = {
      ...student.githubConnection,
      syncStatus,
      ...metadata,
      updatedAt: updated.updatedAt,
    };
  }

  return updated;
}

/**
 * Saves normalized GitHub repositories for a user
 */
export function saveGitHubRepositories(userId: string, repos: GitHubRepository[]): GitHubRepository[] {
  store.githubRepositories.set(userId, repos);
  return repos;
}

/**
 * Retrieves normalized GitHub repositories for a user
 */
export function getGitHubRepositories(userId: string): GitHubRepository[] {
  return store.githubRepositories.get(userId) || [];
}

/**
 * Saves Career DNA for a user
 */
export function saveCareerDNA(userId: string, dna: CareerDNA): CareerDNA {
  store.careerDNA.set(userId, dna);

  // Sync featured projects & top skills into student profile if student exists
  const student = store.studentProfiles.get(userId);
  if (student) {
    if (dna.featuredProjects && dna.featuredProjects.length > 0) {
      // Merge unique projects without duplicate IDs
      const existingIds = new Set(student.projects.map((p: any) => p.id));
      const newProjects = dna.featuredProjects.filter((p: any) => !existingIds.has(p.id));
      student.projects = [...student.projects, ...newProjects];
    }

    if (dna.topSkills && dna.topSkills.length > 0) {
      const existingSkillsSet = new Set(student.skills.map((s: string) => s.toLowerCase()));
      const newSkillNames = dna.topSkills
        .map((s: { name: string }) => s.name)
        .filter((name: string) => !existingSkillsSet.has(name.toLowerCase()));
      student.skills = [...student.skills, ...newSkillNames];
    }
  }

  return dna;
}

/**
 * Retrieves Career DNA for a user
 */
export function getCareerDNA(userId: string): CareerDNA | null {
  let dna = store.careerDNA.get(userId) || null;
  const repos = store.githubRepositories.get(userId) || [];
  const ghConn = store.githubConnections.get(userId);

  // Auto-recalculate if repositories exist or GitHub is synced but Career DNA is missing or has unanalyzed GitHub score
  if (repos.length > 0 || (ghConn && (ghConn.syncStatus === "SYNCED" || Boolean(ghConn.syncCompletedAt)))) {
    if (!dna || dna.sourceBreakdown?.githubScore === null || dna.sourceBreakdown?.githubScore === undefined) {
      try {
        const { ProjectIntelligenceEngine } = require("@/lib/project-intelligence");
        const { SkillIntelligenceEngine } = require("@/lib/skill-intelligence");
        const { CareerDNABuilder } = require("@/lib/career-dna");
        const projects = ProjectIntelligenceEngine.extractProjects(repos);
        const skills = SkillIntelligenceEngine.extractSkillEvidences(userId, repos);
        dna = CareerDNABuilder.compileCareerDNA(userId, projects, skills, repos);
      } catch (err) {
        console.warn("[server-store] Could not auto-compile Career DNA:", err);
      }
    }
  }

  return dna;
}

/**
 * Saves or updates a ResumeRecord for a user
 */
export function saveResumeRecord(userId: string, record: ResumeRecord): ResumeRecord {
  const existingList = store.resumes.get(userId) || [];
  const existingIndex = existingList.findIndex((r) => r.id === record.id);

  let updatedList: ResumeRecord[];
  if (existingIndex >= 0) {
    updatedList = [...existingList];
    updatedList[existingIndex] = record;
  } else {
    updatedList = [record, ...existingList];
  }

  store.resumes.set(userId, updatedList);

  // Sync resume metadata to student profile if record is active
  if (record.isActive) {
    const student = store.studentProfiles.get(userId);
    if (student) {
      student.resume = {
        fileName: record.fileName,
        fileSize: record.fileSize,
        uploadedAt: record.uploadedAt,
        url: "#",
      };
    }
  }

  return record;
}

/**
 * Retrieves the current active ResumeRecord for a user
 */
export function getActiveResumeRecord(userId: string): ResumeRecord | null {
  const list = store.resumes.get(userId) || [];
  return list.find((r) => r.isActive && r.status !== "SUPERSEDED") || null;
}

/**
 * Retrieves full resume history for a user
 */
export function getResumeHistory(userId: string): ResumeRecord[] {
  return store.resumes.get(userId) || [];
}

/**
 * Retrieves a specific resume record by ID
 */
export function getResumeById(userId: string, resumeId: string): ResumeRecord | null {
  const list = store.resumes.get(userId) || [];
  return list.find((r) => r.id === resumeId) || null;
}

/**
 * Marks all previous active resumes for a user as SUPERSEDED (except exceptId if provided)
 */
export function deactivatePreviousResumes(userId: string, exceptId?: string): void {
  const list = store.resumes.get(userId) || [];
  const now = new Date().toISOString();

  const updated = list.map((r) => {
    if (r.id !== exceptId && r.isActive) {
      return {
        ...r,
        isActive: false,
        status: "SUPERSEDED" as const,
        supersededAt: now,
      };
    }
    return r;
  });

  store.resumes.set(userId, updated);
}

/**
 * Saves CodeforcesConnection for a user
 */
export function saveCodeforcesConnection(userId: string, conn: CodeforcesConnection): CodeforcesConnection {
  store.codeforcesConnections.set(userId, conn);

  // Sync to student profile socialLinks
  const student = store.studentProfiles.get(userId);
  if (student) {
    if (!student.socialLinks) {
      student.socialLinks = {};
    }
    student.socialLinks.codeforces = `https://codeforces.com/profile/${conn.handle}`;
  }

  persistStoreToDisk();
  return conn;
}

/**
 * Retrieves CodeforcesConnection for a user
 */
export function getCodeforcesConnection(userId: string): CodeforcesConnection | null {
  return store.codeforcesConnections.get(userId) || null;
}

/**
 * Deletes CodeforcesConnection for a user
 */
export function deleteCodeforcesConnection(userId: string): boolean {
  store.codeforcesDNA.delete(userId);
  const result = store.codeforcesConnections.delete(userId);
  persistStoreToDisk();
  return result;
}

/**
 * Saves CodeforcesDNA for a user
 */
export function saveCodeforcesDNA(userId: string, dna: CodeforcesDNA): CodeforcesDNA {
  store.codeforcesDNA.set(userId, dna);
  persistStoreToDisk();
  return dna;
}

/**
 * Retrieves CodeforcesDNA for a user
 */
export function getCodeforcesDNA(userId: string): CodeforcesDNA | null {
  return store.codeforcesDNA.get(userId) || null;
}

// --------------------------------------------------
// LEETCODE INTELLIGENCE STORAGE HELPERS
// --------------------------------------------------

/**
 * Saves LeetCodeConnection for a user
 */
export function saveLeetCodeConnection(userId: string, conn: LeetCodeConnection): LeetCodeConnection {
  store.leetcodeConnections.set(userId, conn);

  // Sync to student profile socialLinks
  const student = store.studentProfiles.get(userId);
  if (student) {
    if (!student.socialLinks) {
      student.socialLinks = {};
    }
    student.socialLinks.leetcode = `https://leetcode.com/${conn.leetcodeId}`;
  }

  persistStoreToDisk();
  return conn;
}

/**
 * Retrieves LeetCodeConnection for a user
 */
export function getLeetCodeConnection(userId: string): LeetCodeConnection | null {
  return store.leetcodeConnections.get(userId) || null;
}

/**
 * Deletes LeetCodeConnection for a user
 */
export function deleteLeetCodeConnection(userId: string): boolean {
  store.leetcodeDNA.delete(userId);
  const result = store.leetcodeConnections.delete(userId);

  // Clean up social link
  const student = store.studentProfiles.get(userId);
  if (student?.socialLinks?.leetcode) {
    delete student.socialLinks.leetcode;
  }

  persistStoreToDisk();
  return result;
}

/**
 * Saves LeetCodeDNA for a user
 */
export function saveLeetCodeDNA(userId: string, dna: LeetCodeDNA): LeetCodeDNA {
  store.leetcodeDNA.set(userId, dna);
  persistStoreToDisk();
  return dna;
}

/**
 * Retrieves LeetCodeDNA for a user
 */
export function getLeetCodeDNA(userId: string): LeetCodeDNA | null {
  return store.leetcodeDNA.get(userId) || null;
}

// --------------------------------------------------
// CERTIFICATE INTELLIGENCE STORAGE HELPERS
// --------------------------------------------------

/**
 * Saves or updates a CertificateRecord for a user
 */
export function saveCertificate(userId: string, certificate: CertificateRecord): CertificateRecord {
  const existing = store.certificates.get(userId) || [];
  const index = existing.findIndex((c) => c.id === certificate.id);

  if (index >= 0) {
    existing[index] = certificate;
  } else {
    existing.unshift(certificate);
  }

  store.certificates.set(userId, existing);
  persistStoreToDisk();
  return certificate;
}

/**
 * Retrieves all CertificateRecords for a user
 */
export function getCertificates(userId: string): CertificateRecord[] {
  return store.certificates.get(userId) || [];
}

/**
 * Retrieves a specific CertificateRecord by ID
 */
export function getCertificateById(userId: string, id: string): CertificateRecord | null {
  const list = store.certificates.get(userId) || [];
  return list.find((c) => c.id === id) || null;
}

/**
 * Deletes a CertificateRecord by ID
 */
export function deleteCertificate(userId: string, id: string): boolean {
  const list = store.certificates.get(userId) || [];
  const updated = list.filter((c) => c.id !== id);
  store.certificates.set(userId, updated);
  persistStoreToDisk();
  return list.length !== updated.length;
}

/**
 * Saves CertificateDNA for a user
 */
export function saveCertificateDNA(userId: string, dna: CertificateDNA): CertificateDNA {
  store.certificateDNA.set(userId, dna);
  persistStoreToDisk();
  return dna;
}

/**
 * Retrieves CertificateDNA for a user
 */
export function getCertificateDNA(userId: string): CertificateDNA | null {
  return store.certificateDNA.get(userId) || null;
}

/**
 * Retrieves StudentProfile for a user
 */
export function getStudentProfile(userId: string): StudentProfile | null {
  return store.studentProfiles.get(userId) || null;
}

// --------------------------------------------------
// HUGGING FACE INTELLIGENCE STORAGE HELPERS
// --------------------------------------------------

/**
 * Saves or updates a HuggingFaceConnectionRecord for a user
 */
export function saveHuggingFaceConnection(
  connection: HuggingFaceConnectionRecord
): HuggingFaceConnectionRecord {
  store.huggingfaceConnections.set(connection.userId, connection);
  persistStoreToDisk();
  return connection;
}

/**
 * Retrieves a HuggingFaceConnectionRecord for a user
 */
export function getHuggingFaceConnection(
  userId: string
): HuggingFaceConnectionRecord | null {
  return store.huggingfaceConnections.get(userId) || null;
}

/**
 * Deletes a HuggingFaceConnectionRecord and associated HuggingFaceDNA for a user
 */
export function deleteHuggingFaceConnection(userId: string): boolean {
  const existed = store.huggingfaceConnections.delete(userId);
  store.huggingfaceDNA.delete(userId);
  persistStoreToDisk();
  return existed;
}

/**
 * Saves HuggingFaceDNA for a user
 */
export function saveHuggingFaceDNA(
  userId: string,
  dna: HuggingFaceDNA
): HuggingFaceDNA {
  store.huggingfaceDNA.set(userId, dna);
  persistStoreToDisk();
  return dna;
}

/**
 * Retrieves HuggingFaceDNA for a user
 */
export function getHuggingFaceDNA(userId: string): HuggingFaceDNA | null {
  return store.huggingfaceDNA.get(userId) || null;
}

// -------------------------------------------------------------
// Document Management & Verification Exported Functions
// -------------------------------------------------------------

export function saveDocumentRecord(userId: string, doc: DocumentRecord, buffer?: Buffer): DocumentRecord {
  return ServerStore.saveDocument(userId, doc, buffer);
}

export function getDocumentRecordById(docId: string): DocumentRecord | null {
  return ServerStore.getDocumentById(docId);
}

export function getDocumentBufferById(docId: string): Buffer | null {
  return ServerStore.getDocumentBuffer(docId);
}

export function getDocumentRecordsByUserId(userId: string): DocumentRecord[] {
  return ServerStore.getDocumentsByUserId(userId);
}

export function getAllDocumentRecords(filters?: { status?: string; type?: string; search?: string }): DocumentRecord[] {
  return ServerStore.getAllDocuments(filters);
}

export function deleteDocumentRecord(userId: string, docId: string): boolean {
  return ServerStore.deleteDocument(userId, docId);
}

export function recordDocumentVerificationAttempt(attempt: DocumentVerificationAttempt): void {
  ServerStore.recordVerificationAttempt(attempt);
}

export function getDocumentVerificationAttempts(docId: string): DocumentVerificationAttempt[] {
  return ServerStore.getVerificationAttempts(docId);
}

export function requestManualReviewForDocument(docId: string, userId: string, reason?: string) {
  return ServerStore.requestManualReview(docId, userId, reason);
}

export function getAllStudentProfiles(): StudentProfile[] {
  return ServerStore.getAllStudentProfiles();
}

export function adminReviewDocumentRecord(
  docId: string,
  action: "APPROVE" | "REJECT" | "REQUEST_REUPLOAD" | "START_REVIEW",
  adminName: string,
  reason?: string,
  notes?: string
) {
  return ServerStore.adminReviewDocument(docId, action, adminName, reason, notes);
}

export function getCandidateVerificationClaimsForUser(userId: string): CandidateVerificationClaims {
  return ServerStore.getCandidateVerificationClaims(userId);
}

export function getDocumentVerificationSystemMetrics() {
  return ServerStore.getDocumentVerificationMetrics();
}



