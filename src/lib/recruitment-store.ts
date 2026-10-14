import fs from "fs";
import path from "path";
import {
  RecruitmentDrive,
  RecruitmentStage,
  RecruitmentApplication,
  CandidateAssessmentRecord,
  CandidateInterviewRecord,
  RecruitmentResultRecord,
  RecruiterAuditLogEntry,
  EligibilityCriteria,
  StageWeights,
  InterviewEvaluation,
} from "@/types";
import { evaluateCandidateEligibility } from "@/lib/eligibility-engine";
import { calculateMeritRanking } from "@/lib/merit-engine";
import { defaultStudentUser } from "@/data/mock-users";

const RECRUITMENT_DB_FILE = path.join(process.cwd(), ".data", "recruitment-store-db.json");

interface RecruitmentStoreState {
  drives: Map<string, RecruitmentDrive>;
  stages: Map<string, RecruitmentStage[]>; // driveId -> stages
  applications: Map<string, RecruitmentApplication>; // id -> application
  assessments: Map<string, CandidateAssessmentRecord[]>; // driveId -> assessments
  interviews: Map<string, CandidateInterviewRecord[]>; // driveId -> interviews
  results: Map<string, RecruitmentResultRecord>; // driveId -> result
  auditLogs: RecruiterAuditLogEntry[];
  // High-performance query indexes
  driveAppIndex?: Map<string, Set<string>>; // driveId -> Set of appIds
  driveStageAppIndex?: Map<string, Set<string>>; // `${driveId}:${stageId}` -> Set of appIds
}

declare global {
  // eslint-disable-next-line no-var
  var __COMMANDSKILL_RECRUITMENT_STORE__: RecruitmentStoreState | undefined;
}

const defaultCriteria: EligibilityCriteria = {
  degrees: ["B.Tech", "B.E.", "B.S. in Computer Science", "M.Tech", "M.S."],
  branches: [
    "Computer Science & Engineering",
    "Information Technology",
    "Systems & Artificial Intelligence",
    "Data Science",
    "Electronics & Communication",
  ],
  minCgpa: 3.5,
  maxBacklogs: 1,
  gradYears: [2025, 2026, 2027],
  freshersAllowed: true,
  minExpYears: 0,
  maxExpYears: 2,
  requiredSkills: ["TypeScript", "React", "Node.js", "Python"],
  preferredSkills: ["PostgreSQL", "System Design", "Docker", "AWS"],
  eligibleLocations: ["San Francisco, CA", "Seattle, WA", "New York, NY", "Remote"],
  remoteAllowed: true,
};

const defaultStages = (driveId: string): RecruitmentStage[] => [
  {
    id: `stage_${driveId}_1`,
    driveId,
    name: "Eligibility & Resume Screening",
    type: "SCREENING",
    order: 1,
    description: "Automated eligibility verification against academic and skill criteria.",
    passingScore: 70,
    status: "COMPLETED",
  },
  {
    id: `stage_${driveId}_2`,
    driveId,
    name: "Technical Assessment Round",
    type: "ASSESSMENT",
    order: 2,
    description: "Algorithmic coding, system architecture, and API design evaluation.",
    passingScore: 75,
    status: "IN_PROGRESS",
  },
  {
    id: `stage_${driveId}_3`,
    driveId,
    name: "Engineering & System Interview",
    type: "INTERVIEW",
    order: 3,
    description: "1-on-1 technical deep-dive and problem-solving interview.",
    passingScore: 80,
    status: "IN_PROGRESS",
  },
  {
    id: `stage_${driveId}_4`,
    driveId,
    name: "Final Merit Selection & Offer",
    type: "FINAL_SELECTION",
    order: 4,
    description: "Consolidated rank generation, offer allocation, and result publication.",
    passingScore: 80,
    status: "PENDING",
  },
];

function initializeRecruitmentStore(): RecruitmentStoreState {
  const drives = new Map<string, RecruitmentDrive>();
  const stages = new Map<string, RecruitmentStage[]>();
  const applications = new Map<string, RecruitmentApplication>();
  const assessments = new Map<string, CandidateAssessmentRecord[]>();
  const interviews = new Map<string, CandidateInterviewRecord[]>();
  const results = new Map<string, RecruitmentResultRecord>();
  const auditLogs: RecruiterAuditLogEntry[] = [];

  // Seed Default Drive 1: Software Engineer 2026
  const drive1Id = "drive_swe_2026";
  const drive1Stages = defaultStages(drive1Id);
  stages.set(drive1Id, drive1Stages);

  const drive1: RecruitmentDrive = {
    id: drive1Id,
    title: "Software Development Engineer 2026",
    position: "Software Development Engineer (Full-Time / Intern)",
    description:
      "Join our core product infrastructure engineering team. Build scalable, high-throughput web applications, microservices, and developer toolchains.",
    company: "Stripe",
    companyLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
    department: "Core Engineering",
    employmentType: "FULL_TIME",
    workMode: "HYBRID",
    location: "San Francisco, CA / Hybrid",
    openingsCount: 12,
    salaryStipend: "$145,000 - $175,000 / yr",
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    status: "SELECTION_IN_PROGRESS",
    eligibilityCriteria: defaultCriteria,
    stages: drive1Stages,
    stageWeights: { assessmentWeight: 60, interviewWeight: 40 },
    applicantsCount: 5,
    eligibleCount: 4,
    shortlistedCount: 3,
    interviewsCount: 2,
    selectedCount: 1,
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-08T10:00:00.000Z",
    createdBy: "recruiter_01",
  };
  drives.set(drive1Id, drive1);

  // Seed Default Drive 2: AI / ML Systems Engineer
  const drive2Id = "drive_aiml_2026";
  const drive2Stages = defaultStages(drive2Id);
  stages.set(drive2Id, drive2Stages);

  const drive2: RecruitmentDrive = {
    id: drive2Id,
    title: "AI & Machine Learning Engineer 2026",
    position: "AI / ML Systems Engineer",
    description:
      "Design and deploy production LLM pipelines, vector databases, and real-time retrieval-augmented generation architectures.",
    company: "OpenAI",
    companyLogo: "https://upload.wikimedia.org/wikipedia/commons/4/4d/OpenAI_Logo.svg",
    department: "AI Applied Research",
    employmentType: "INTERNSHIP",
    workMode: "REMOTE",
    location: "Remote / San Francisco",
    openingsCount: 6,
    salaryStipend: "$9,500 / month",
    startDate: "2026-03-05",
    endDate: "2026-05-15",
    status: "APPLICATIONS_OPEN",
    eligibilityCriteria: {
      ...defaultCriteria,
      requiredSkills: ["Python", "PyTorch", "TypeScript", "FastAPI"],
      minCgpa: 3.7,
    },
    stages: drive2Stages,
    stageWeights: { assessmentWeight: 50, interviewWeight: 50 },
    applicantsCount: 3,
    eligibleCount: 3,
    shortlistedCount: 2,
    interviewsCount: 1,
    selectedCount: 0,
    createdAt: "2026-03-05T10:00:00.000Z",
    updatedAt: "2026-03-08T11:00:00.000Z",
    createdBy: "recruiter_01",
  };
  drives.set(drive2Id, drive2);

  // Seed Default Candidates & Applications for Drive 1
  const candAlex = {
    ...defaultStudentUser,
    backlogs: 0,
  };
  const alexEligibility = evaluateCandidateEligibility(candAlex, defaultCriteria);

  const app1: RecruitmentApplication = {
    id: "app_rec_001",
    driveId: drive1Id,
    driveTitle: drive1.title,
    company: drive1.company,
    studentId: defaultStudentUser.id,
    studentName: defaultStudentUser.name,
    studentEmail: defaultStudentUser.email,
    studentAvatar: defaultStudentUser.avatar,
    university: defaultStudentUser.university,
    degree: defaultStudentUser.degree,
    branch: defaultStudentUser.branch,
    graduationYear: defaultStudentUser.graduationYear,
    cgpa: "3.92",
    backlogs: 0,
    skills: defaultStudentUser.skills,
    resumeUrl: "#",
    portfolioUrl: "https://alexrivera.dev",
    githubUrl: "https://github.com/alexrivera",
    linkedinUrl: "https://linkedin.com/in/alexrivera",
    status: "IN_SELECTION",
    eligibility: alexEligibility,
    currentStageId: drive1Stages[2].id,
    currentStageName: drive1Stages[2].name,
    currentStageType: "INTERVIEW",
    assessmentScore: 94,
    interviewScore: 92,
    finalScore: 93,
    rank: 1,
    notes: "Outstanding algorithmic and React/Node.js systems proficiency. Highly recommended.",
    appliedAt: "2026-03-02T14:30:00.000Z",
    updatedAt: "2026-03-07T16:00:00.000Z",
    history: [
      {
        stageId: drive1Stages[0].id,
        stageName: drive1Stages[0].name,
        status: "ELIGIBLE",
        timestamp: "2026-03-02T14:35:00.000Z",
        actor: "Eligibility Engine",
        note: "Passed all 7 academic & skills criteria.",
      },
      {
        stageId: drive1Stages[0].id,
        stageName: drive1Stages[0].name,
        status: "SHORTLISTED",
        timestamp: "2026-03-03T10:00:00.000Z",
        actor: "Barun (Recruiter)",
        note: "Shortlisted for Round 2 Assessment.",
      },
      {
        stageId: drive1Stages[1].id,
        stageName: drive1Stages[1].name,
        status: "ASSESSMENT_CLEARED",
        timestamp: "2026-03-05T15:00:00.000Z",
        actor: "Assessment Evaluator",
        note: "Scored 94/100 on coding test.",
      },
      {
        stageId: drive1Stages[2].id,
        stageName: drive1Stages[2].name,
        status: "INTERVIEW_SCHEDULED",
        timestamp: "2026-03-06T11:00:00.000Z",
        actor: "Barun (Recruiter)",
        note: "Scheduled technical interview.",
      },
    ],
  };
  applications.set(app1.id, app1);

  // Candidate 2: Priya Sharma
  const candPriya = {
    id: "student_02",
    name: "Priya Sharma",
    email: "priya.sharma@berkeley.edu",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    university: "UC Berkeley",
    degree: "B.S. in Computer Science",
    branch: "Computer Science & Engineering",
    graduationYear: 2026,
    cgpa: "3.88",
    backlogs: 0,
    skills: ["TypeScript", "React", "Node.js", "Python", "PostgreSQL", "Docker"],
    location: "San Francisco, CA",
  };
  const priyaEligibility = evaluateCandidateEligibility(candPriya as any, defaultCriteria);

  const app2: RecruitmentApplication = {
    id: "app_rec_002",
    driveId: drive1Id,
    driveTitle: drive1.title,
    company: drive1.company,
    studentId: candPriya.id,
    studentName: candPriya.name,
    studentEmail: candPriya.email,
    studentAvatar: candPriya.avatar,
    university: candPriya.university,
    degree: candPriya.degree,
    branch: candPriya.branch,
    graduationYear: candPriya.graduationYear,
    cgpa: candPriya.cgpa,
    backlogs: 0,
    skills: candPriya.skills,
    resumeUrl: "#",
    status: "SHORTLISTED",
    eligibility: priyaEligibility,
    currentStageId: drive1Stages[1].id,
    currentStageName: drive1Stages[1].name,
    currentStageType: "ASSESSMENT",
    assessmentScore: 88,
    interviewScore: 85,
    finalScore: 87,
    rank: 2,
    notes: "Strong backend experience with PostgreSQL and Docker.",
    appliedAt: "2026-03-02T16:00:00.000Z",
    updatedAt: "2026-03-06T12:00:00.000Z",
  };
  applications.set(app2.id, app2);

  // Candidate 3: Marcus Chen
  const candMarcus = {
    id: "student_03",
    name: "Marcus Chen",
    email: "marcus.chen@mit.edu",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    university: "MIT",
    degree: "B.Tech",
    branch: "Information Technology",
    graduationYear: 2026,
    cgpa: "3.75",
    backlogs: 0,
    skills: ["TypeScript", "React", "Node.js", "GraphQL"],
    location: "Seattle, WA",
  };
  const marcusEligibility = evaluateCandidateEligibility(candMarcus as any, defaultCriteria);

  const app3: RecruitmentApplication = {
    id: "app_rec_003",
    driveId: drive1Id,
    driveTitle: drive1.title,
    company: drive1.company,
    studentId: candMarcus.id,
    studentName: candMarcus.name,
    studentEmail: candMarcus.email,
    studentAvatar: candMarcus.avatar,
    university: candMarcus.university,
    degree: candMarcus.degree,
    branch: candMarcus.branch,
    graduationYear: candMarcus.graduationYear,
    cgpa: candMarcus.cgpa,
    backlogs: 0,
    skills: candMarcus.skills,
    resumeUrl: "#",
    status: "ELIGIBLE",
    eligibility: marcusEligibility,
    currentStageId: drive1Stages[0].id,
    currentStageName: drive1Stages[0].name,
    currentStageType: "SCREENING",
    appliedAt: "2026-03-03T10:30:00.000Z",
    updatedAt: "2026-03-03T10:30:00.000Z",
  };
  applications.set(app3.id, app3);

  // Candidate 4: Elena Rostova (Failed criteria - Backlogs exceeded)
  const candElena = {
    id: "student_04",
    name: "Elena Rostova",
    email: "elena.rostova@cmu.edu",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    university: "Carnegie Mellon University",
    degree: "B.Tech",
    branch: "Computer Science & Engineering",
    graduationYear: 2026,
    cgpa: "3.20",
    backlogs: 2, // Exceeds max 1 backlog
    skills: ["TypeScript", "Python"],
    location: "Pittsburgh, PA",
  };
  const elenaEligibility = evaluateCandidateEligibility(candElena as any, defaultCriteria);

  const app4: RecruitmentApplication = {
    id: "app_rec_004",
    driveId: drive1Id,
    driveTitle: drive1.title,
    company: drive1.company,
    studentId: candElena.id,
    studentName: candElena.name,
    studentEmail: candElena.email,
    studentAvatar: candElena.avatar,
    university: candElena.university,
    degree: candElena.degree,
    branch: candElena.branch,
    graduationYear: candElena.graduationYear,
    cgpa: candElena.cgpa,
    backlogs: 2,
    skills: candElena.skills,
    resumeUrl: "#",
    status: "ELIGIBILITY_FAILED",
    eligibility: elenaEligibility,
    currentStageId: drive1Stages[0].id,
    currentStageName: drive1Stages[0].name,
    currentStageType: "SCREENING",
    notes: "Failed minimum CGPA (3.20 < 3.50) and Backlog limit (2 > 1).",
    appliedAt: "2026-03-04T09:15:00.000Z",
    updatedAt: "2026-03-04T09:15:00.000Z",
  };
  applications.set(app4.id, app4);

  // Candidate 5: Jordan Lee
  const candJordan = {
    id: "student_05",
    name: "Jordan Lee",
    email: "jordan.lee@austin.utexas.edu",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    university: "UT Austin",
    degree: "B.S. in Computer Science",
    branch: "Computer Science & Engineering",
    graduationYear: 2026,
    cgpa: "3.80",
    backlogs: 0,
    skills: ["TypeScript", "React", "Node.js", "Python"],
    location: "Austin, TX",
  };
  const jordanEligibility = evaluateCandidateEligibility(candJordan as any, defaultCriteria);

  const app5: RecruitmentApplication = {
    id: "app_rec_005",
    driveId: drive1Id,
    driveTitle: drive1.title,
    company: drive1.company,
    studentId: candJordan.id,
    studentName: candJordan.name,
    studentEmail: candJordan.email,
    studentAvatar: candJordan.avatar,
    university: candJordan.university,
    degree: candJordan.degree,
    branch: candJordan.branch,
    graduationYear: candJordan.graduationYear,
    cgpa: candJordan.cgpa,
    backlogs: 0,
    skills: candJordan.skills,
    resumeUrl: "#",
    status: "SUBMITTED",
    eligibility: jordanEligibility,
    currentStageId: drive1Stages[0].id,
    currentStageName: drive1Stages[0].name,
    currentStageType: "SCREENING",
    appliedAt: "2026-03-08T08:00:00.000Z",
    updatedAt: "2026-03-08T08:00:00.000Z",
  };
  applications.set(app5.id, app5);

  // Seed Assessments for Drive 1
  assessments.set(drive1Id, [
    {
      id: `assess_${drive1Id}_tcs`,
      driveId: drive1Id,
      applicationId: app1.id,
      studentId: app1.studentId,
      studentName: app1.studentName,
      stageId: drive1Stages[1].id,
      assessmentName: "Coding Assessment",
      instructions: "60-minute online coding & aptitude challenge. Camera and screen sharing must remain enabled throughout the test window.",
      date: "2026-09-17",
      time: "07:00 PM",
      duration: "60 mins",
      maxScore: 100,
      passingScore: 70,
    },
    {
      id: `assess_${drive1Id}_1`,
      driveId: drive1Id,
      applicationId: app1.id,
      studentId: app1.studentId,
      studentName: app1.studentName,
      stageId: drive1Stages[1].id,
      assessmentName: "Core Algorithms & System Design Test",
      instructions: "90-minute timed coding exam covering Graph algorithms, Concurrency, and REST API design.",
      date: "2026-03-05",
      time: "14:00 PST",
      duration: "90 mins",
      maxScore: 100,
      passingScore: 75,
      candidateScore: 94,
      passed: true,
      evaluatedBy: "Automated Evaluation Engine",
      evaluatedAt: "2026-03-05T15:35:00.000Z",
    },
    {
      id: `assess_${drive1Id}_2`,
      driveId: drive1Id,
      applicationId: app2.id,
      studentId: app2.studentId,
      studentName: app2.studentName,
      stageId: drive1Stages[1].id,
      assessmentName: "Core Algorithms & System Design Test",
      instructions: "90-minute timed coding exam covering Graph algorithms, Concurrency, and REST API design.",
      date: "2026-03-05",
      time: "14:00 PST",
      duration: "90 mins",
      maxScore: 100,
      passingScore: 75,
      candidateScore: 88,
      passed: true,
      evaluatedBy: "Automated Evaluation Engine",
      evaluatedAt: "2026-03-05T15:35:00.000Z",
    },
  ]);

  // Seed Interviews for Drive 1
  interviews.set(drive1Id, [
    {
      id: "int_alex_google_tech",
      driveId: drive1Id,
      applicationId: app1.id,
      studentId: app1.studentId,
      candidateName: app1.studentName,
      candidateAvatar: app1.studentAvatar,
      candidateUniversity: app1.university,
      driveTitle: "Software Engineer Intern",
      company: "Google",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
      stageId: drive1Stages[2].id,
      roundType: "TECHNICAL",
      roundName: "Technical Round",
      roundNumber: 1,
      instructions: "Live coding evaluation covering Algorithms, Complexity, and System Architecture with Google Engineering.",
      type: "VIDEO",
      date: "2026-09-18",
      time: "11:00 AM",
      duration: "45 mins",
      meetingLink: "https://meet.google.com/goog-tech-round",
      interviewerName: "John Smith (Senior Tech Lead)",
      interviewerRole: "Senior Tech Lead",
      status: "SCHEDULED",
      createdAt: "2026-09-16T10:00:00.000Z",
    },
    {
      id: "int_alex_msft_final",
      driveId: drive1Id,
      applicationId: app1.id,
      studentId: app1.studentId,
      candidateName: app1.studentName,
      candidateAvatar: app1.studentAvatar,
      candidateUniversity: app1.university,
      driveTitle: "Software Engineer Intern",
      company: "Microsoft",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
      stageId: drive1Stages[3].id,
      roundType: "FINAL",
      roundName: "Final Round",
      roundNumber: 2,
      instructions: "Executive leadership & culture round. Prepare to discuss distributed systems impact.",
      type: "VIDEO",
      date: "2026-09-28",
      time: "03:00 PM",
      duration: "60 mins",
      meetingLink: "https://meet.google.com/msft-final-round",
      interviewerName: "Satya M. (Partner Director)",
      interviewerRole: "Partner Director",
      status: "SCHEDULED",
      createdAt: "2026-09-16T14:00:00.000Z",
    },
    {
      id: "int_rec_today_rahul",
      driveId: drive1Id,
      applicationId: "app_rec_rahul",
      studentId: "student_rahul",
      candidateName: "Rahul Sharma",
      candidateAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      candidateUniversity: "IIT Delhi",
      driveTitle: "Software Engineer Intern",
      company: "Stripe",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      stageId: drive1Stages[2].id,
      roundType: "TECHNICAL",
      roundName: "Technical Round",
      roundNumber: 1,
      type: "VIDEO",
      date: "2026-09-17",
      time: "10:00 AM",
      duration: "45 mins",
      meetingLink: "https://meet.google.com/stripe-tech-rahul",
      interviewerName: "Barun",
      interviewerRole: "Director of Engineering",
      status: "SCHEDULED",
      createdAt: "2026-09-16T08:00:00.000Z",
    },
    {
      id: "int_rec_today_priya",
      driveId: drive1Id,
      applicationId: app2.id,
      studentId: app2.studentId,
      candidateName: "Priya Patel",
      candidateAvatar: app2.studentAvatar,
      candidateUniversity: "Stanford University",
      driveTitle: "Software Engineer Intern",
      company: "Stripe",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      stageId: drive1Stages[3].id,
      roundType: "FINAL",
      roundName: "Final Round",
      roundNumber: 2,
      type: "VIDEO",
      date: "2026-09-17",
      time: "11:30 AM",
      duration: "45 mins",
      meetingLink: "https://meet.google.com/stripe-final-priya",
      interviewerName: "Barun",
      interviewerRole: "Director of Engineering",
      status: "SCHEDULED",
      createdAt: "2026-09-16T09:00:00.000Z",
    },
    {
      id: "int_rec_today_aman",
      driveId: drive1Id,
      applicationId: "app_rec_aman",
      studentId: "student_aman",
      candidateName: "Aman Kumar",
      candidateAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      candidateUniversity: "BITS Pilani",
      driveTitle: "Frontend Intern",
      company: "Stripe",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      stageId: drive1Stages[2].id,
      roundType: "HR",
      roundName: "HR Round",
      roundNumber: 1,
      type: "VIDEO",
      date: "2026-09-17",
      time: "02:00 PM",
      duration: "30 mins",
      meetingLink: "https://meet.google.com/stripe-hr-aman",
      interviewerName: "Barun",
      interviewerRole: "Director of Engineering",
      status: "SCHEDULED",
      createdAt: "2026-09-16T11:00:00.000Z",
    },
    {
      id: `int_${drive1Id}_1`,
      driveId: drive1Id,
      applicationId: app1.id,
      studentId: app1.studentId,
      candidateName: app1.studentName,
      candidateAvatar: app1.studentAvatar,
      candidateUniversity: app1.university,
      driveTitle: drive1.title,
      company: drive1.company,
      companyLogo: drive1.companyLogo,
      stageId: drive1Stages[2].id,
      roundType: "TECHNICAL",
      roundName: "Technical Deep-Dive Round",
      roundNumber: 1,
      type: "VIDEO",
      date: "2026-03-07",
      time: "10:30 AM PST",
      duration: "45 mins",
      meetingLink: "https://meet.google.com/stripe-sde-round3",
      interviewerName: "David K. (Staff Infrastructure Engineer)",
      interviewerRole: "Staff Infrastructure Engineer",
      status: "COMPLETED",
      notes: "Candidate demonstrated exceptional depth in concurrency and distributed state synchronization.",
      evaluation: {
        technicalScore: 95,
        communicationScore: 90,
        overallScore: 93,
        feedback: "Superb problem-solving and clear explanation of distributed trade-offs. Fast hire recommendation.",
        recommendation: "RECOMMEND",
        evaluatedAt: "2026-03-07T11:25:00.000Z",
        evaluatorName: "David K.",
      },
      createdAt: "2026-03-06T11:00:00.000Z",
    },
    {
      id: `int_${drive1Id}_3`,
      driveId: drive1Id,
      applicationId: app2.id,
      studentId: app2.studentId,
      candidateName: app2.studentName,
      candidateAvatar: app2.studentAvatar,
      candidateUniversity: app2.university,
      driveTitle: drive1.title,
      company: drive1.company,
      companyLogo: drive1.companyLogo,
      stageId: drive1Stages[2].id,
      roundType: "TECHNICAL",
      roundName: "Technical Architecture Round",
      roundNumber: 1,
      type: "VIDEO",
      date: "2026-09-25",
      time: "11:00 AM PST",
      duration: "45 mins",
      meetingLink: "https://meet.google.com/stripe-tech-round",
      interviewerName: "Marcus Vance (Principal Architect)",
      interviewerRole: "Principal Architect",
      status: "SCHEDULED",
      notes: "Focus on API design, idempotency, and Postgres schema partitioning.",
      createdAt: "2026-09-21T09:00:00.000Z",
    },
  ]);

  // Seed Initial Audit Logs
  auditLogs.push(
    {
      id: `audit_rec_${Date.now() - 500000}`,
      driveId: drive1Id,
      driveTitle: drive1.title,
      actorId: "recruiter_01",
      actorName: "Barun",
      actorRole: "RECRUITER",
      action: "DRIVE_CREATED",
      targetType: "DRIVE",
      targetId: drive1Id,
      targetName: drive1.title,
      newState: "DRAFT",
      details: "Created new structured recruitment drive with 4 selection stages.",
      timestamp: "2026-03-01T09:00:00.000Z",
      ipSessionRef: "192.168.1.45 (Chrome / macOS)",
    },
    {
      id: `audit_rec_${Date.now() - 400000}`,
      driveId: drive1Id,
      driveTitle: drive1.title,
      actorId: "recruiter_01",
      actorName: "Barun",
      actorRole: "RECRUITER",
      action: "DRIVE_PUBLISHED",
      targetType: "DRIVE",
      targetId: drive1Id,
      targetName: drive1.title,
      previousState: "DRAFT",
      newState: "APPLICATIONS_OPEN",
      details: "Published recruitment drive to CommandSkill talent network.",
      timestamp: "2026-03-01T09:15:00.000Z",
      ipSessionRef: "192.168.1.45 (Chrome / macOS)",
    },
    {
      id: `audit_rec_${Date.now() - 300000}`,
      driveId: drive1Id,
      driveTitle: drive1.title,
      actorId: "recruiter_01",
      actorName: "Barun",
      actorRole: "RECRUITER",
      action: "CANDIDATE_SHORTLISTED",
      targetType: "APPLICATION",
      targetId: app1.id,
      targetName: app1.studentName,
      previousState: "ELIGIBLE",
      newState: "SHORTLISTED",
      details: "Candidate shortlisted for Round 2 Assessment based on 100% criteria match and top Career DNA.",
      timestamp: "2026-03-03T10:00:00.000Z",
      ipSessionRef: "192.168.1.45 (Chrome / macOS)",
    },
    {
      id: `audit_rec_${Date.now() - 200000}`,
      driveId: drive1Id,
      driveTitle: drive1.title,
      actorId: "recruiter_01",
      actorName: "Barun",
      actorRole: "RECRUITER",
      action: "INTERVIEW_EVALUATION_RECORDED",
      targetType: "EVALUATION",
      targetId: `int_${drive1Id}_1`,
      targetName: app1.studentName,
      newState: "RECOMMEND",
      details: "Recorded Technical Score (95), Communication (90), Overall (93) with recommendation: RECOMMEND.",
      timestamp: "2026-03-07T11:30:00.000Z",
      ipSessionRef: "192.168.1.45 (Chrome / macOS)",
    }
  );

  const initialStore: RecruitmentStoreState = {
    drives,
    stages,
    applications,
    assessments,
    interviews,
    results,
    auditLogs,
  };

  loadRecruitmentStoreFromDisk(initialStore);
  return initialStore;
}

function loadRecruitmentStoreFromDisk(storeObj: RecruitmentStoreState): void {
  try {
    if (!fs.existsSync(RECRUITMENT_DB_FILE)) return;
    const raw = fs.readFileSync(RECRUITMENT_DB_FILE, "utf-8");
    if (!raw.trim()) return;
    const data = JSON.parse(raw);

    if (data.drives && Array.isArray(data.drives)) {
      data.drives.forEach(([id, drive]: [string, RecruitmentDrive]) => {
        storeObj.drives.set(id, drive);
      });
    }
    if (data.stages && Array.isArray(data.stages)) {
      data.stages.forEach(([id, stagesList]: [string, RecruitmentStage[]]) => {
        storeObj.stages.set(id, stagesList);
      });
    }
    if (data.applications && Array.isArray(data.applications)) {
      data.applications.forEach(([id, app]: [string, RecruitmentApplication]) => {
        storeObj.applications.set(id, app);
      });
    }
    if (data.assessments && Array.isArray(data.assessments)) {
      data.assessments.forEach(([id, records]: [string, CandidateAssessmentRecord[]]) => {
        const existing = storeObj.assessments.get(id) || [];
        const existingIds = new Set(existing.map((e) => e.id));
        records.forEach((r) => {
          if (!existingIds.has(r.id)) existing.push(r);
        });
        storeObj.assessments.set(id, existing);
      });
    }
    if (data.interviews && Array.isArray(data.interviews)) {
      data.interviews.forEach(([id, records]: [string, CandidateInterviewRecord[]]) => {
        const existing = storeObj.interviews.get(id) || [];
        const existingIds = new Set(existing.map((e) => e.id));
        records.forEach((r) => {
          if (!existingIds.has(r.id)) existing.push(r);
        });
        storeObj.interviews.set(id, existing);
      });
    }
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach(([id, res]: [string, RecruitmentResultRecord]) => {
        storeObj.results.set(id, res);
      });
    }
    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      storeObj.auditLogs = data.auditLogs;
    }
  } catch (err) {
    console.warn("[Recruitment Store] Failed loading from disk:", err);
  }
}

function persistRecruitmentStoreToDisk(): void {
  try {
    const dir = path.dirname(RECRUITMENT_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const payload = {
      drives: Array.from(recruitmentStore.drives.entries()),
      stages: Array.from(recruitmentStore.stages.entries()),
      applications: Array.from(recruitmentStore.applications.entries()),
      assessments: Array.from(recruitmentStore.assessments.entries()),
      interviews: Array.from(recruitmentStore.interviews.entries()),
      results: Array.from(recruitmentStore.results.entries()),
      auditLogs: recruitmentStore.auditLogs,
    };

    fs.writeFileSync(RECRUITMENT_DB_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.error("[Recruitment Store] Error persisting to disk:", err);
  }
}

export const recruitmentStore: RecruitmentStoreState =
  globalThis.__COMMANDSKILL_RECRUITMENT_STORE__ ?? initializeRecruitmentStore();

function ensureCalendarSeedRecords(store: RecruitmentStoreState) {
  const drive1Id = "drive_swe_2026";
  const requiredAssessments: CandidateAssessmentRecord[] = [
    {
      id: `assess_${drive1Id}_tcs`,
      driveId: drive1Id,
      applicationId: "app_rec_001",
      studentId: "student_01",
      studentName: "Alex Rivera",
      stageId: `stage_${drive1Id}_2`,
      assessmentName: "TCS — Coding Assessment",
      instructions: "60-minute online coding & aptitude challenge. Camera and screen sharing must remain enabled.",
      date: "2026-09-17",
      time: "07:00 PM",
      duration: "60 mins",
      maxScore: 100,
      passingScore: 70,
    },
  ];

  const requiredInterviews: CandidateInterviewRecord[] = [
    {
      id: "int_alex_google_tech",
      driveId: drive1Id,
      applicationId: "app_rec_001",
      studentId: "student_01",
      candidateName: "Alex Rivera",
      candidateAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      candidateUniversity: "Stanford University",
      driveTitle: "Software Engineer Intern",
      company: "Google",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
      stageId: `stage_${drive1Id}_3`,
      roundType: "TECHNICAL",
      roundName: "Technical Round",
      roundNumber: 1,
      instructions: "Live coding evaluation covering Algorithms, Complexity, and System Architecture.",
      type: "VIDEO",
      date: "2026-09-18",
      time: "11:00 AM",
      duration: "45 mins",
      meetingLink: "https://meet.google.com/goog-tech-round",
      interviewerName: "John Smith (Senior Tech Lead)",
      interviewerRole: "Senior Tech Lead",
      status: "SCHEDULED",
      createdAt: "2026-09-16T10:00:00.000Z",
    },
    {
      id: "int_alex_msft_final",
      driveId: drive1Id,
      applicationId: "app_rec_001",
      studentId: "student_01",
      candidateName: "Alex Rivera",
      candidateAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      candidateUniversity: "Stanford University",
      driveTitle: "Software Engineer Intern",
      company: "Microsoft",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
      stageId: `stage_${drive1Id}_4`,
      roundType: "FINAL",
      roundName: "Final Round",
      roundNumber: 2,
      instructions: "Executive leadership & culture round. Prepare to discuss distributed systems impact.",
      type: "VIDEO",
      date: "2026-09-28",
      time: "03:00 PM",
      duration: "60 mins",
      meetingLink: "https://meet.google.com/msft-final-round",
      interviewerName: "Satya M. (Partner Director)",
      interviewerRole: "Partner Director",
      status: "SCHEDULED",
      createdAt: "2026-09-16T14:00:00.000Z",
    },
    {
      id: "int_rec_today_rahul",
      driveId: drive1Id,
      applicationId: "app_rec_rahul",
      studentId: "student_rahul",
      candidateName: "Rahul Sharma",
      candidateAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      candidateUniversity: "IIT Delhi",
      driveTitle: "Software Engineer Intern",
      company: "Stripe",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      stageId: `stage_${drive1Id}_3`,
      roundType: "TECHNICAL",
      roundName: "Technical Round",
      roundNumber: 1,
      type: "VIDEO",
      date: "2026-09-17",
      time: "10:00 AM",
      duration: "45 mins",
      meetingLink: "https://meet.google.com/stripe-tech-rahul",
      interviewerName: "Barun",
      interviewerRole: "Director of Engineering",
      status: "SCHEDULED",
      createdAt: "2026-09-16T08:00:00.000Z",
    },
    {
      id: "int_rec_today_priya",
      driveId: drive1Id,
      applicationId: "app_rec_002",
      studentId: "student_02",
      candidateName: "Priya Patel",
      candidateAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      candidateUniversity: "Stanford University",
      driveTitle: "Software Engineer Intern",
      company: "Stripe",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      stageId: `stage_${drive1Id}_4`,
      roundType: "FINAL",
      roundName: "Final Round",
      roundNumber: 2,
      type: "VIDEO",
      date: "2026-09-17",
      time: "11:30 AM",
      duration: "45 mins",
      meetingLink: "https://meet.google.com/stripe-final-priya",
      interviewerName: "Barun",
      interviewerRole: "Director of Engineering",
      status: "SCHEDULED",
      createdAt: "2026-09-16T09:00:00.000Z",
    },
    {
      id: "int_rec_today_aman",
      driveId: drive1Id,
      applicationId: "app_rec_aman",
      studentId: "student_aman",
      candidateName: "Aman Kumar",
      candidateAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      candidateUniversity: "BITS Pilani",
      driveTitle: "Frontend Intern",
      company: "Stripe",
      companyLogo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
      stageId: `stage_${drive1Id}_3`,
      roundType: "HR",
      roundName: "HR Round",
      roundNumber: 1,
      type: "VIDEO",
      date: "2026-09-17",
      time: "02:00 PM",
      duration: "30 mins",
      meetingLink: "https://meet.google.com/stripe-hr-aman",
      interviewerName: "Barun",
      interviewerRole: "Director of Engineering",
      status: "SCHEDULED",
      createdAt: "2026-09-16T11:00:00.000Z",
    },
  ];

  const curAssessments = store.assessments.get(drive1Id) || [];
  const assessIds = new Set(curAssessments.map((a) => a.id));
  requiredAssessments.forEach((a) => {
    if (!assessIds.has(a.id)) {
      curAssessments.unshift(a);
    }
  });
  store.assessments.set(drive1Id, curAssessments);

  const curInterviews = store.interviews.get(drive1Id) || [];
  const interviewIds = new Set(curInterviews.map((i) => i.id));
  requiredInterviews.forEach((i) => {
    if (!interviewIds.has(i.id)) {
      curInterviews.unshift(i);
    }
  });
  store.interviews.set(drive1Id, curInterviews);
}

ensureCalendarSeedRecords(recruitmentStore);
ensureApplicationIndexes(recruitmentStore);

if (process.env.NODE_ENV !== "production") {
  globalThis.__COMMANDSKILL_RECRUITMENT_STORE__ = recruitmentStore;
}

// ============================================================================
// Public Recruitment Store Accessors & Mutators
// ============================================================================

export function getRecruitmentDrives(): RecruitmentDrive[] {
  // Synchronize counts
  const allDrives = Array.from(recruitmentStore.drives.values());
  allDrives.forEach((d) => {
    const driveApps = Array.from(recruitmentStore.applications.values()).filter(
      (a) => a.driveId === d.id
    );
    d.applicantsCount = driveApps.length;
    d.eligibleCount = driveApps.filter((a) => a.eligibility?.status === "ELIGIBLE").length;
    d.shortlistedCount = driveApps.filter(
      (a) => a.status === "SHORTLISTED" || a.status === "IN_SELECTION" || a.status === "SELECTED"
    ).length;
    d.interviewsCount = (recruitmentStore.interviews.get(d.id) || []).length;
    d.selectedCount = driveApps.filter((a) => a.status === "SELECTED").length;
  });
  return allDrives.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getRecruitmentDriveById(id: string): RecruitmentDrive | null {
  return recruitmentStore.drives.get(id) || null;
}

export function saveRecruitmentDrive(drive: RecruitmentDrive): RecruitmentDrive {
  recruitmentStore.drives.set(drive.id, drive);
  if (drive.stages && drive.stages.length > 0) {
    recruitmentStore.stages.set(drive.id, drive.stages);
  }
  persistRecruitmentStoreToDisk();
  return drive;
}

export function deleteRecruitmentDrive(id: string): boolean {
  const existed = recruitmentStore.drives.delete(id);
  recruitmentStore.stages.delete(id);
  persistRecruitmentStoreToDisk();
  return existed;
}

export function getStagesForDrive(driveId: string): RecruitmentStage[] {
  let list = recruitmentStore.stages.get(driveId);
  if (!list || list.length === 0) {
    list = defaultStages(driveId);
    recruitmentStore.stages.set(driveId, list);
    persistRecruitmentStoreToDisk();
  }
  return list.sort((a, b) => a.order - b.order);
}

export function saveStagesForDrive(driveId: string, stages: RecruitmentStage[]): RecruitmentStage[] {
  recruitmentStore.stages.set(driveId, stages);
  const drive = recruitmentStore.drives.get(driveId);
  if (drive) {
    drive.stages = stages;
    drive.updatedAt = new Date().toISOString();
  }
  persistRecruitmentStoreToDisk();
  return stages;
}

export interface GetApplicationsOptions {
  driveId?: string;
  stageId?: string;
  status?: string;
  eligibilityStatus?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  sortBy?: "appliedAt" | "studentName" | "cgpa" | "assessmentScore" | "interviewScore" | "finalScore" | "rank";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedApplicationsResult {
  applications: RecruitmentApplication[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stageCounts?: Record<string, number>;
}

export function ensureApplicationIndexes(storeObj?: RecruitmentStoreState): void {
  const store = storeObj || recruitmentStore;
  if (!store.driveAppIndex) store.driveAppIndex = new Map();
  if (!store.driveStageAppIndex) store.driveStageAppIndex = new Map();
  store.driveAppIndex.clear();
  store.driveStageAppIndex.clear();

  store.applications.forEach((app) => {
    if (app.driveId) {
      let dSet = store.driveAppIndex!.get(app.driveId);
      if (!dSet) {
        dSet = new Set();
        store.driveAppIndex!.set(app.driveId, dSet);
      }
      dSet.add(app.id);

      const stageKey = `${app.driveId}:${app.currentStageId || "stage_0"}`;
      let sSet = store.driveStageAppIndex!.get(stageKey);
      if (!sSet) {
        sSet = new Set();
        store.driveStageAppIndex!.set(stageKey, sSet);
      }
      sSet.add(app.id);
    }
  });
}

export function getDriveStageCounts(driveId: string): Record<string, number> {
  if (!recruitmentStore.driveAppIndex) {
    ensureApplicationIndexes();
  }
  const stages = getStagesForDrive(driveId);
  const counts: Record<string, number> = {};
  stages.forEach((s) => {
    counts[s.id] = 0;
  });

  const appIds = recruitmentStore.driveAppIndex?.get(driveId);
  if (appIds) {
    appIds.forEach((id) => {
      const app = recruitmentStore.applications.get(id);
      if (app) {
        const stageId = app.currentStageId || stages[0]?.id;
        if (stageId && counts[stageId] !== undefined) {
          counts[stageId]++;
        } else if (stageId) {
          counts[stageId] = (counts[stageId] || 0) + 1;
        }
      }
    });
  } else {
    recruitmentStore.applications.forEach((app) => {
      if (app.driveId === driveId) {
        const stageId = app.currentStageId || stages[0]?.id;
        if (stageId && counts[stageId] !== undefined) {
          counts[stageId]++;
        } else if (stageId) {
          counts[stageId] = (counts[stageId] || 0) + 1;
        }
      }
    });
  }
  return counts;
}

export function getPaginatedApplications(options: GetApplicationsOptions = {}): PaginatedApplicationsResult {
  if (!recruitmentStore.driveAppIndex) {
    ensureApplicationIndexes();
  }

  const {
    driveId,
    stageId,
    status,
    eligibilityStatus,
    search,
    sortBy = "appliedAt",
    sortOrder = "desc",
  } = options;

  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize || options.limit) || 20));

  let candidatePool: RecruitmentApplication[] = [];

  // Optimized index lookup when driveId or stageId is specified
  if (driveId && driveId !== "all") {
    if (stageId && stageId !== "all") {
      const stageKey = `${driveId}:${stageId}`;
      const ids = recruitmentStore.driveStageAppIndex?.get(stageKey);
      if (ids && ids.size > 0) {
        ids.forEach((id) => {
          const a = recruitmentStore.applications.get(id);
          if (a) candidatePool.push(a);
        });
      } else {
        candidatePool = Array.from(recruitmentStore.applications.values()).filter(
          (a) =>
            a.driveId === driveId &&
            (a.currentStageId === stageId || (!a.currentStageId && stageId.includes("_1")))
        );
      }
    } else {
      const ids = recruitmentStore.driveAppIndex?.get(driveId);
      if (ids && ids.size > 0) {
        ids.forEach((id) => {
          const a = recruitmentStore.applications.get(id);
          if (a) candidatePool.push(a);
        });
      } else {
        candidatePool = Array.from(recruitmentStore.applications.values()).filter(
          (a) => a.driveId === driveId
        );
      }
    }
  } else {
    candidatePool = Array.from(recruitmentStore.applications.values());
  }

  // Filter criteria
  if (status && status !== "all") {
    candidatePool = candidatePool.filter((a) => a.status === status);
  }
  if (eligibilityStatus && eligibilityStatus !== "all") {
    candidatePool = candidatePool.filter((a) => a.eligibility?.status === eligibilityStatus);
  }
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    candidatePool = candidatePool.filter(
      (a) =>
        a.studentName.toLowerCase().includes(q) ||
        a.university.toLowerCase().includes(q) ||
        a.branch.toLowerCase().includes(q) ||
        (a.skills && a.skills.some((s) => s.toLowerCase().includes(q)))
    );
  }

  // Sorting
  candidatePool.sort((a, b) => {
    let comparison = 0;
    if (sortBy === "studentName") {
      comparison = a.studentName.localeCompare(b.studentName);
    } else if (sortBy === "assessmentScore") {
      comparison = (a.assessmentScore || 0) - (b.assessmentScore || 0);
    } else if (sortBy === "interviewScore") {
      comparison = (a.interviewScore || 0) - (b.interviewScore || 0);
    } else if (sortBy === "finalScore") {
      comparison = (a.finalScore || 0) - (b.finalScore || 0);
    } else if (sortBy === "rank") {
      comparison = (a.rank || 9999) - (b.rank || 9999);
    } else {
      comparison = new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
    }
    return sortOrder === "desc" ? -comparison : comparison;
  });

  const totalCount = candidatePool.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const offset = options.offset !== undefined ? Number(options.offset) : (page - 1) * pageSize;
  const paginatedSlice = candidatePool.slice(offset, offset + pageSize);
  const stageCounts = driveId && driveId !== "all" ? getDriveStageCounts(driveId) : undefined;

  return {
    applications: paginatedSlice,
    totalCount,
    page,
    pageSize,
    totalPages,
    stageCounts,
  };
}

export function getApplications(filters?: {
  driveId?: string;
  status?: string;
  eligibilityStatus?: string;
  search?: string;
  stageId?: string;
}): RecruitmentApplication[] {
  return getPaginatedApplications({
    ...filters,
    page: 1,
    pageSize: 10000,
  }).applications;
}

export function getApplicationById(id: string): RecruitmentApplication | null {
  return recruitmentStore.applications.get(id) || null;
}

export function saveApplication(app: RecruitmentApplication): RecruitmentApplication {
  if (app.version === undefined) {
    app.version = 1;
  }
  recruitmentStore.applications.set(app.id, app);

  if (!recruitmentStore.driveAppIndex) {
    ensureApplicationIndexes();
  } else if (app.driveId) {
    let dSet = recruitmentStore.driveAppIndex.get(app.driveId);
    if (!dSet) {
      dSet = new Set();
      recruitmentStore.driveAppIndex.set(app.driveId, dSet);
    }
    dSet.add(app.id);

    const stageKey = `${app.driveId}:${app.currentStageId || "stage_0"}`;
    let sSet = recruitmentStore.driveStageAppIndex?.get(stageKey);
    if (!sSet) {
      sSet = new Set();
      recruitmentStore.driveStageAppIndex?.set(stageKey, sSet);
    }
    sSet.add(app.id);
  }

  persistRecruitmentStoreToDisk();
  return app;
}

export interface StageTransitionResult {
  success: boolean;
  application?: RecruitmentApplication;
  error?: string;
  errorCode?: "NOT_FOUND" | "CONFLICT" | "INVALID_TRANSITION" | "PREREQUISITE_FAILED" | "UNAUTHORIZED";
}

export function updateApplicationStatusAtomic(
  id: string,
  newStatus: RecruitmentApplication["status"],
  options?: {
    actorId?: string;
    actorName?: string;
    notes?: string;
    nextStageId?: string;
    expectedVersion?: number;
    idempotencyKey?: string;
    enforceRules?: boolean;
    isOverride?: boolean;
    overrideReason?: string;
  }
): StageTransitionResult {
  const app = recruitmentStore.applications.get(id);
  if (!app) {
    return {
      success: false,
      errorCode: "NOT_FOUND",
      error: `Application ${id} not found.`,
    };
  }

  // 1. Idempotency Check: if request was already executed with this key, return without duplicate audit/history
  if (options?.idempotencyKey && app.lastIdempotencyKey === options.idempotencyKey) {
    return {
      success: true,
      application: app,
    };
  }

  // 2. Optimistic Concurrency Control (OCC)
  if (
    options?.expectedVersion !== undefined &&
    app.version !== undefined &&
    app.version !== options.expectedVersion
  ) {
    return {
      success: false,
      errorCode: "CONFLICT",
      error: "Application was modified by another reviewer. Please refresh to load latest data before making changes.",
    };
  }

  const previousStatus = app.status;
  const previousStageId = app.currentStageId;
  const previousStageName = app.currentStageName;
  const driveStages = getStagesForDrive(app.driveId);
  const currentStage = driveStages.find((s) => s.id === app.currentStageId) || driveStages[0];

  // 3. Stage Transition Validation Rules (if transitioning to another stage)
  if (options?.nextStageId && options.nextStageId !== app.currentStageId) {
    const targetStage = driveStages.find((s) => s.id === options.nextStageId);
    if (!targetStage) {
      return {
        success: false,
        errorCode: "INVALID_TRANSITION",
        error: `Target stage '${options.nextStageId}' does not belong to recruitment drive '${app.driveId}'.`,
      };
    }

    const enforce = options.enforceRules !== false && !options.isOverride;

    if (enforce) {
      // Rule 1: Moving to Stage 2 (Technical Assessment)
      if (targetStage.type === "ASSESSMENT" || targetStage.order === 2) {
        const isEligible = app.eligibility?.status === "ELIGIBLE" || !!app.manualOverride;
        if (!isEligible) {
          return {
            success: false,
            errorCode: "PREREQUISITE_FAILED",
            error: `Candidate ${app.studentName} did not satisfy mandatory eligibility screening (${app.eligibility?.status || "INCOMPLETE"}) and cannot be advanced to Technical Assessment without an approved override.`,
          };
        }
      }

      // Rule 2: Moving to Stage 3 (Engineering & System Interview)
      if (targetStage.type === "INTERVIEW" || targetStage.order === 3) {
        const driveAssessments = recruitmentStore.assessments.get(app.driveId) || [];
        const candAssessment = driveAssessments.find((a) => a.applicationId === app.id);
        const assessmentScore = app.assessmentScore ?? candAssessment?.candidateScore;
        const passingBenchmark = currentStage?.passingScore || 75;

        if (assessmentScore === undefined || assessmentScore === null) {
          return {
            success: false,
            errorCode: "PREREQUISITE_FAILED",
            error: `Candidate ${app.studentName} has not completed the Technical Assessment. Test marks must be recorded before advancing to Interview round.`,
          };
        }

        if (assessmentScore < passingBenchmark) {
          return {
            success: false,
            errorCode: "PREREQUISITE_FAILED",
            error: `Candidate ${app.studentName} scored ${assessmentScore}/100, which is below the required passing benchmark (${passingBenchmark}/100) for ${currentStage.name}.`,
          };
        }
      }

      // Rule 3: Moving to Stage 4 (Final Merit Selection & Offer)
      if (targetStage.type === "FINAL_SELECTION" || targetStage.order === 4) {
        const driveInterviews = recruitmentStore.interviews.get(app.driveId) || [];
        const candInterview = driveInterviews.find((i) => i.applicationId === app.id);
        const interviewScore = app.interviewScore ?? candInterview?.evaluation?.overallScore;
        const recommendation = candInterview?.evaluation?.recommendation;

        if (!interviewScore || !recommendation) {
          return {
            success: false,
            errorCode: "PREREQUISITE_FAILED",
            error: `Candidate ${app.studentName} has no completed interview evaluation. Interview scores and recommendation must be logged before final selection.`,
          };
        }

        if (recommendation === "NOT_RECOMMEND") {
          return {
            success: false,
            errorCode: "PREREQUISITE_FAILED",
            error: `Candidate ${app.studentName} received a 'NOT_RECOMMEND' recommendation from the interview panel and cannot advance to Final Selection.`,
          };
        }
      }
    }

    // Update Stage
    app.currentStageId = targetStage.id;
    app.currentStageName = targetStage.name;
    app.currentStageType = targetStage.type;
  }

  // 4. Update Application State & Version
  app.status = newStatus;
  app.version = (app.version || 1) + 1;
  app.lastIdempotencyKey = options?.idempotencyKey;
  app.updatedAt = new Date().toISOString();
  if (options?.notes) app.notes = options.notes;

  if (options?.isOverride && options.overrideReason) {
    app.manualOverride = {
      overriddenBy: options.actorName || "Recruiter",
      previousStatus,
      newStatus,
      reason: options.overrideReason,
      timestamp: new Date().toISOString(),
    };
  }

  // 5. Append History Entry (De-duplicated)
  if (!app.history) app.history = [];
  app.history.push({
    stageId: app.currentStageId,
    stageName: app.currentStageName,
    status: newStatus,
    timestamp: new Date().toISOString(),
    actor: options?.actorName || "Recruiter",
    note: options?.notes || (options?.isOverride ? `Manual Override: ${options.overrideReason}` : undefined),
  });

  // 6. Update Stage Indexes
  if (previousStageId !== app.currentStageId) {
    const oldKey = `${app.driveId}:${previousStageId}`;
    const newKey = `${app.driveId}:${app.currentStageId}`;
    recruitmentStore.driveStageAppIndex?.get(oldKey)?.delete(app.id);
    let newSet = recruitmentStore.driveStageAppIndex?.get(newKey);
    if (!newSet) {
      newSet = new Set();
      recruitmentStore.driveStageAppIndex?.set(newKey, newSet);
    }
    newSet.add(app.id);
  }

  // 7. Write Structured Audit Log Entry
  logRecruiterAction({
    driveId: app.driveId,
    driveTitle: app.driveTitle,
    actorId: options?.actorId || "recruiter_01",
    actorName: options?.actorName || "Recruiter",
    actorRole: "RECRUITER",
    action: `STATUS_CHANGED_${newStatus}`,
    targetType: "APPLICATION",
    targetId: app.id,
    targetName: app.studentName,
    previousState: previousStatus,
    newState: newStatus,
    details: `Updated application from ${previousStatus} (Stage: ${previousStageName}) to ${newStatus} (Stage: ${app.currentStageName}). Notes: ${options?.notes || "N/A"}`,
  });

  // 8. Persist
  persistRecruitmentStoreToDisk();

  return {
    success: true,
    application: app,
  };
}

export function updateApplicationStatus(
  id: string,
  newStatus: RecruitmentApplication["status"],
  actorName = "Recruiter",
  notes?: string,
  nextStageId?: string
): RecruitmentApplication | null {
  const result = updateApplicationStatusAtomic(id, newStatus, {
    actorName,
    notes,
    nextStageId,
  });
  return result.application || null;
}

export function recordManualEligibilityOverride(
  applicationId: string,
  newStatus: RecruitmentApplication["status"],
  reason: string,
  overriddenBy: string
): RecruitmentApplication | null {
  const app = recruitmentStore.applications.get(applicationId);
  if (!app) return null;

  const previousStatus = app.status;
  app.status = newStatus;
  app.manualOverride = {
    overriddenBy,
    previousStatus,
    newStatus,
    reason,
    timestamp: new Date().toISOString(),
  };
  app.updatedAt = new Date().toISOString();

  if (!app.history) app.history = [];
  app.history.push({
    stageId: app.currentStageId,
    stageName: app.currentStageName,
    status: newStatus,
    timestamp: new Date().toISOString(),
    actor: overriddenBy,
    note: `Manual Eligibility Override: ${reason}`,
  });

  logRecruiterAction({
    driveId: app.driveId,
    driveTitle: app.driveTitle,
    actorId: "recruiter_01",
    actorName: overriddenBy,
    actorRole: "RECRUITER",
    action: "ELIGIBILITY_OVERRIDDEN",
    targetType: "APPLICATION",
    targetId: app.id,
    targetName: app.studentName,
    previousState: previousStatus,
    newState: newStatus,
    reason,
    details: `Manual eligibility override applied by ${overriddenBy}. Reason: ${reason}`,
  });

  persistRecruitmentStoreToDisk();
  return app;
}

export function getAssessments(driveId?: string): CandidateAssessmentRecord[] {
  if (driveId && driveId !== "all") {
    return recruitmentStore.assessments.get(driveId) || [];
  }
  const all: CandidateAssessmentRecord[] = [];
  recruitmentStore.assessments.forEach((list) => all.push(...list));
  return all;
}

export function saveAssessmentRecord(record: CandidateAssessmentRecord): CandidateAssessmentRecord {
  const list = recruitmentStore.assessments.get(record.driveId) || [];
  const existingIdx = list.findIndex((a) => a.id === record.id);
  if (existingIdx >= 0) {
    list[existingIdx] = record;
  } else {
    list.push(record);
  }
  recruitmentStore.assessments.set(record.driveId, list);

  // Update application score if available
  const app = recruitmentStore.applications.get(record.applicationId);
  if (app && record.candidateScore !== undefined) {
    app.assessmentScore = record.candidateScore;
    app.updatedAt = new Date().toISOString();
  }

  logRecruiterAction({
    driveId: record.driveId,
    actorId: "recruiter_01",
    actorName: record.evaluatedBy || "Evaluator",
    actorRole: "RECRUITER",
    action: "ASSESSMENT_SCORE_RECORDED",
    targetType: "ASSESSMENT",
    targetId: record.id,
    targetName: record.studentName,
    newState: `${record.candidateScore}/${record.maxScore}`,
    details: `Recorded assessment score (${record.candidateScore}/${record.maxScore}) for ${record.studentName}. Passed: ${record.passed ? "YES" : "NO"}`,
  });

  persistRecruitmentStoreToDisk();
  return record;
}

export function getInterviews(driveId?: string, status?: string): CandidateInterviewRecord[] {
  let list: CandidateInterviewRecord[] = [];
  if (driveId && driveId !== "all") {
    list = recruitmentStore.interviews.get(driveId) || [];
  } else {
    recruitmentStore.interviews.forEach((items) => list.push(...items));
  }
  if (status && status !== "all") {
    list = list.filter((i) => i.status === status);
  }
  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function saveInterviewRecord(record: CandidateInterviewRecord): CandidateInterviewRecord {
  const list = recruitmentStore.interviews.get(record.driveId) || [];
  const idx = list.findIndex((i) => i.id === record.id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.unshift(record);
  }
  recruitmentStore.interviews.set(record.driveId, list);

  logRecruiterAction({
    driveId: record.driveId,
    actorId: "recruiter_01",
    actorName: "Barun",
    actorRole: "RECRUITER",
    action: "INTERVIEW_SCHEDULED",
    targetType: "INTERVIEW",
    targetId: record.id,
    targetName: record.candidateName,
    newState: record.status,
    details: `Scheduled ${record.type} interview on ${record.date} at ${record.time} with ${record.candidateName}.`,
  });

  persistRecruitmentStoreToDisk();
  return record;
}

export function recordInterviewEvaluation(
  interviewId: string,
  evaluation: InterviewEvaluation
): CandidateInterviewRecord | null {
  let foundRecord: CandidateInterviewRecord | null = null;
  let targetDriveId: string | null = null;

  for (const [driveId, list] of recruitmentStore.interviews.entries()) {
    const match = list.find((i) => i.id === interviewId);
    if (match) {
      match.evaluation = evaluation;
      match.status = "COMPLETED";
      foundRecord = match;
      targetDriveId = driveId;
      break;
    }
  }

  if (foundRecord && targetDriveId) {
    // Update application interviewScore
    const app = recruitmentStore.applications.get(foundRecord.applicationId);
    if (app) {
      app.interviewScore = evaluation.overallScore;
      app.updatedAt = new Date().toISOString();
    }

    logRecruiterAction({
      driveId: targetDriveId,
      actorId: "recruiter_01",
      actorName: evaluation.evaluatorName,
      actorRole: "RECRUITER",
      action: "INTERVIEW_EVALUATION_RECORDED",
      targetType: "EVALUATION",
      targetId: interviewId,
      targetName: foundRecord.candidateName,
      newState: evaluation.recommendation,
      details: `Recorded evaluation: Technical (${evaluation.technicalScore}), Communication (${evaluation.communicationScore}), Overall (${evaluation.overallScore}). Recommendation: ${evaluation.recommendation}.`,
    });

    persistRecruitmentStoreToDisk();
  }

  return foundRecord;
}

export function getRecruitmentResults(driveId: string): RecruitmentResultRecord | null {
  const existing = recruitmentStore.results.get(driveId);
  if (existing) return existing;

  const drive = recruitmentStore.drives.get(driveId);
  if (!drive) return null;

  // Calculate live ranking preview
  const driveApps = getApplications({ driveId });
  const ranked = calculateMeritRanking(
    driveApps.map((a) => ({
      applicationId: a.id,
      studentId: a.studentId,
      studentName: a.studentName,
      studentAvatar: a.studentAvatar,
      university: a.university,
      degree: a.degree,
      branch: a.branch,
      assessmentScore: a.assessmentScore || 0,
      interviewScore: a.interviewScore || 0,
      cgpa: a.cgpa,
      selectionStatus: a.status === "SELECTED" ? "SELECTED" : a.status === "REJECTED" ? "REJECTED" : "WAITLISTED",
      notes: a.notes,
    })),
    drive.stageWeights
  );

  return {
    id: `res_${driveId}`,
    driveId,
    driveTitle: drive.title,
    company: drive.company,
    publishedAt: "",
    publishedBy: "",
    isLocked: false,
    totalSelected: ranked.filter((r) => r.selectionStatus === "SELECTED").length,
    totalWaitlisted: ranked.filter((r) => r.selectionStatus === "WAITLISTED").length,
    totalRejected: ranked.filter((r) => r.selectionStatus === "REJECTED").length,
    candidates: ranked,
  };
}

export function publishRecruitmentResults(
  driveId: string,
  publisherName: string,
  finalRoster: { applicationId: string; selectionStatus: 'SELECTED' | 'WAITLISTED' | 'REJECTED'; notes?: string }[]
): RecruitmentResultRecord | null {
  const drive = recruitmentStore.drives.get(driveId);
  if (!drive) return null;

  // Update drive status
  drive.status = "RESULTS_PUBLISHED";
  drive.updatedAt = new Date().toISOString();

  // Update applications
  finalRoster.forEach((item) => {
    const app = recruitmentStore.applications.get(item.applicationId);
    if (app) {
      app.status = item.selectionStatus;
      app.notes = item.notes || app.notes;
      app.updatedAt = new Date().toISOString();
      if (!app.history) app.history = [];
      app.history.push({
        stageId: app.currentStageId,
        stageName: "Final Selection & Results",
        status: item.selectionStatus,
        timestamp: new Date().toISOString(),
        actor: publisherName,
        note: `Results Published as ${item.selectionStatus}.`,
      });
    }
  });

  const driveApps = getApplications({ driveId });
  const ranked = calculateMeritRanking(
    driveApps.map((a) => {
      const rosterItem = finalRoster.find((r) => r.applicationId === a.id);
      return {
        applicationId: a.id,
        studentId: a.studentId,
        studentName: a.studentName,
        studentAvatar: a.studentAvatar,
        university: a.university,
        degree: a.degree,
        branch: a.branch,
        assessmentScore: a.assessmentScore || 0,
        interviewScore: a.interviewScore || 0,
        cgpa: a.cgpa,
        selectionStatus: rosterItem?.selectionStatus || (a.status === "SELECTED" ? "SELECTED" : a.status === "REJECTED" ? "REJECTED" : "WAITLISTED"),
        notes: rosterItem?.notes || a.notes,
      };
    }),
    drive.stageWeights
  );

  const resultRecord: RecruitmentResultRecord = {
    id: `result_${driveId}_${Date.now()}`,
    driveId,
    driveTitle: drive.title,
    company: drive.company,
    publishedAt: new Date().toISOString(),
    publishedBy: publisherName,
    isLocked: true,
    totalSelected: ranked.filter((r) => r.selectionStatus === "SELECTED").length,
    totalWaitlisted: ranked.filter((r) => r.selectionStatus === "WAITLISTED").length,
    totalRejected: ranked.filter((r) => r.selectionStatus === "REJECTED").length,
    candidates: ranked,
  };

  recruitmentStore.results.set(driveId, resultRecord);

  logRecruiterAction({
    driveId,
    driveTitle: drive.title,
    actorId: "recruiter_01",
    actorName: publisherName,
    actorRole: "RECRUITER",
    action: "RESULTS_PUBLISHED",
    targetType: "RESULT",
    targetId: resultRecord.id,
    targetName: drive.title,
    previousState: "SELECTION_IN_PROGRESS",
    newState: "RESULTS_PUBLISHED",
    details: `Official merit list and final results published for ${drive.title}. Selected: ${resultRecord.totalSelected}, Waitlisted: ${resultRecord.totalWaitlisted}, Rejected: ${resultRecord.totalRejected}. Results are now locked.`,
  });

  persistRecruitmentStoreToDisk();
  return resultRecord;
}

export function logRecruiterAction(
  entry: Omit<RecruiterAuditLogEntry, "id" | "timestamp">
): RecruiterAuditLogEntry {
  const fullEntry: RecruiterAuditLogEntry = {
    ...entry,
    id: `audit_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ipSessionRef: entry.ipSessionRef || "127.0.0.1 (Secure Session)",
  };

  recruitmentStore.auditLogs.unshift(fullEntry);
  persistRecruitmentStoreToDisk();
  return fullEntry;
}

export function getRecruiterAuditLogs(driveId?: string, limit = 100): RecruiterAuditLogEntry[] {
  let logs = recruitmentStore.auditLogs;
  if (driveId && driveId !== "all") {
    logs = logs.filter((l) => l.driveId === driveId);
  }
  return logs.slice(0, limit);
}

export function getRecruiterOverviewMetrics() {
  const drives = getRecruitmentDrives();
  const applications = getApplications();
  const allInterviews = getInterviews();

  const activeDrives = drives.filter(
    (d) =>
      d.status === "APPLICATIONS_OPEN" ||
      d.status === "SCREENING" ||
      d.status === "SELECTION_IN_PROGRESS" ||
      d.status === "PUBLISHED"
  );

  const totalApplications = applications.length;
  const eligibleCandidates = applications.filter((a) => a.eligibility?.status === "ELIGIBLE").length;
  const shortlistedCandidates = applications.filter(
    (a) => a.status === "SHORTLISTED" || a.status === "IN_SELECTION" || a.status === "SELECTED"
  ).length;
  const scheduledInterviews = allInterviews.filter((i) => i.status === "SCHEDULED").length;
  const selectedCandidates = applications.filter((a) => a.status === "SELECTED").length;

  return {
    kpis: {
      activeDrivesCount: activeDrives.length,
      totalApplicationsCount: totalApplications,
      eligibleCandidatesCount: eligibleCandidates,
      shortlistedCandidatesCount: shortlistedCandidates,
      interviewsCount: scheduledInterviews,
      selectedCandidatesCount: selectedCandidates,
    },
    activeDrives: activeDrives.slice(0, 4),
    recentApplications: applications.slice(0, 6),
    upcomingInterviews: allInterviews
      .filter((i) => i.status === "SCHEDULED" && i.date >= "2026-09-17")
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      })
      .slice(0, 5),
    recentAuditLogs: recruitmentStore.auditLogs.slice(0, 6),
  };
}

// ============================================================================
// Student-Facing Recruitment Store Accessors & Mutators
// ============================================================================

export function getStudentApplications(studentId: string): RecruitmentApplication[] {
  const all = Array.from(recruitmentStore.applications.values());
  return all
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}

export function getStudentApplicationForDrive(
  studentId: string,
  driveId: string
): RecruitmentApplication | null {
  const all = Array.from(recruitmentStore.applications.values());
  return all.find((a) => a.studentId === studentId && a.driveId === driveId) || null;
}

export function getStudentAssessments(studentId: string): CandidateAssessmentRecord[] {
  const allAssessments: CandidateAssessmentRecord[] = [];
  recruitmentStore.assessments.forEach((list) => {
    list.forEach((item) => {
      if (item.studentId === studentId) {
        allAssessments.push(item);
      }
    });
  });
  return allAssessments.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getStudentInterviews(studentId: string): CandidateInterviewRecord[] {
  const allInterviews: CandidateInterviewRecord[] = [];
  recruitmentStore.interviews.forEach((list) => {
    list.forEach((item) => {
      if (item.studentId === studentId) {
        allInterviews.push(item);
      }
    });
  });
  return allInterviews.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export interface StudentResultSummary {
  resultId: string;
  driveId: string;
  driveTitle: string;
  company: string;
  publishedAt: string;
  selectionStatus: "SELECTED" | "WAITLISTED" | "REJECTED";
  rank: number;
  finalScore: number;
  assessmentScore: number;
  interviewScore: number;
  notes?: string;
}

export function getStudentResults(studentId: string): StudentResultSummary[] {
  const studentResults: StudentResultSummary[] = [];

  recruitmentStore.results.forEach((resultRecord) => {
    if (!resultRecord.isLocked) return;
    const candidateItem = resultRecord.candidates.find((c) => c.studentId === studentId);
    if (candidateItem) {
      studentResults.push({
        resultId: resultRecord.id,
        driveId: resultRecord.driveId,
        driveTitle: resultRecord.driveTitle,
        company: resultRecord.company,
        publishedAt: resultRecord.publishedAt,
        selectionStatus: candidateItem.selectionStatus,
        rank: candidateItem.rank,
        finalScore: candidateItem.finalScore,
        assessmentScore: candidateItem.assessmentScore,
        interviewScore: candidateItem.interviewScore,
        notes: candidateItem.notes,
      });
    }
  });

  return studentResults.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getStudentOverviewMetrics(studentId: string) {
  const studentApps = getStudentApplications(studentId);
  const assessments = getStudentAssessments(studentId);
  const interviews = getStudentInterviews(studentId);
  const results = getStudentResults(studentId);
  const allDrives = getRecruitmentDrives();

  const activeDrives = allDrives.filter(
    (d) =>
      d.status === "APPLICATIONS_OPEN" ||
      d.status === "PUBLISHED" ||
      d.status === "SCREENING" ||
      d.status === "SELECTION_IN_PROGRESS"
  );

  const activeApplications = studentApps.filter(
    (a) =>
      a.status === "SUBMITTED" ||
      a.status === "UNDER_REVIEW" ||
      a.status === "ELIGIBLE" ||
      a.status === "SHORTLISTED" ||
      a.status === "IN_SELECTION"
  );

  const upcomingInterviews = interviews.filter((i) => i.status === "SCHEDULED");
  const completedInterviews = interviews.filter((i) => i.status === "COMPLETED");
  const selectedApplications = studentApps.filter((a) => a.status === "SELECTED");

  // Calculate upcoming events strictly filtered to upcoming schedule
  const upcomingEvents: Array<{
    id: string;
    type: "ASSESSMENT" | "INTERVIEW" | "MEETING";
    title: string;
    subtitle: string;
    date: string;
    time?: string;
    badge: string;
    isFinalRound?: boolean;
    meetingUrl?: string;
    link: string;
  }> = [];

  const todayStr = "2026-09-17";

  assessments
    .filter((ass) => ass.passed === undefined && ass.date >= todayStr)
    .forEach((ass) => {
      upcomingEvents.push({
        id: ass.id,
        type: "ASSESSMENT",
        title: `TCS — ${ass.assessmentName}`,
        subtitle: `Drive Assessment • Duration: ${ass.duration || "60 mins"}`,
        date: ass.date,
        time: ass.time,
        badge: "Assessment",
        link: "/dashboard/assessments",
      });
    });

  upcomingInterviews
    .filter((int) => int.date >= todayStr)
    .forEach((int) => {
      const isFinal = int.roundType === "FINAL" || (int.roundName || "").toLowerCase().includes("final");
      upcomingEvents.push({
        id: int.id,
        type: "INTERVIEW",
        title: `${int.company || "Company"} — ${int.roundName || "Interview Round"}`,
        subtitle: `${int.driveTitle} • ${int.interviewerName || "Interviewer"}`,
        date: int.date,
        time: int.time,
        badge: isFinal ? "Final Round" : (int.roundName || "Interview"),
        isFinalRound: isFinal,
        meetingUrl: int.meetingLink,
        link: "/dashboard/calendar",
      });
    });

  upcomingEvents.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.time || "").localeCompare(b.time || "");
  });

  return {
    kpis: {
      activeApplicationsCount: activeApplications.length,
      totalApplicationsCount: studentApps.length,
      upcomingAssessmentsCount: assessments.filter((a) => a.candidateScore === undefined).length,
      upcomingInterviewsCount: upcomingInterviews.length,
      completedInterviewsCount: completedInterviews.length,
      selectedCount: selectedApplications.length,
      publishedResultsCount: results.length,
      openDrivesCount: activeDrives.length,
    },
    activeApplications: studentApps.slice(0, 5),
    upcomingEvents: upcomingEvents.slice(0, 5),
    recentResults: results.slice(0, 3),
    recommendedDrives: activeDrives.slice(0, 4),
  };
}

export function submitStudentApplication(params: {
  driveId: string;
  student: any;
  resumeUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  notes?: string;
}): { success: boolean; application?: RecruitmentApplication; error?: string; status?: number } {
  const drive = recruitmentStore.drives.get(params.driveId);
  if (!drive) {
    return { success: false, error: "Recruitment drive not found.", status: 404 };
  }

  // 1. Check drive status
  const acceptingStatuses = ["APPLICATIONS_OPEN", "PUBLISHED", "SCREENING", "SELECTION_IN_PROGRESS"];
  if (!acceptingStatuses.includes(drive.status)) {
    return {
      success: false,
      error: `Drive is not accepting applications. Current status: ${drive.status.replace("_", " ")}.`,
      status: 400,
    };
  }

  // 2. Check application deadline
  if (drive.endDate) {
    const deadline = new Date(drive.endDate).getTime();
    if (Date.now() > deadline + 24 * 3600 * 1000) {
      return {
        success: false,
        error: "The application deadline for this recruitment drive has passed.",
        status: 400,
      };
    }
  }

  // 3. Prevent duplicate application (Atomic uniqueness: studentId + driveId)
  const existing = getStudentApplicationForDrive(params.student.id, params.driveId);
  if (existing) {
    return {
      success: false,
      error: `You have already submitted an application for "${drive.title}". Application ID: ${existing.id}.`,
      status: 409,
    };
  }

  // 4. Server-Side Eligibility Validation
  const eligibilityResult = evaluateCandidateEligibility(params.student, drive.eligibilityCriteria);

  // 5. Profile Readiness Validation (Degree, CGPA, graduation year)
  if (!params.student.degree || !params.student.graduationYear) {
    return {
      success: false,
      error: "Profile incomplete. Please ensure Degree and Graduation Year are filled in your profile before applying.",
      status: 400,
    };
  }

  // 6. Generate structured Application ID
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const currentYear = new Date().getFullYear();
  const applicationId = `APP-${currentYear}-${randomSuffix}`;

  const driveStages = getStagesForDrive(drive.id);
  const initialStage = driveStages[0] || {
    id: `stage_${drive.id}_1`,
    name: "Screening & Eligibility",
    type: "SCREENING",
  };

  const initialStatus =
    eligibilityResult.status === "NOT_ELIGIBLE" ? "ELIGIBILITY_FAILED" : "SUBMITTED";

  const newApp: RecruitmentApplication = {
    id: applicationId,
    driveId: drive.id,
    driveTitle: drive.title,
    company: drive.company,
    studentId: params.student.id,
    studentName: params.student.name || "Student Candidate",
    studentEmail: params.student.email || "",
    studentAvatar:
      params.student.avatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    university: params.student.university || "University",
    degree: params.student.degree || "",
    branch: params.student.branch || params.student.specialization || "",
    graduationYear: Number(params.student.graduationYear) || currentYear,
    cgpa: String(params.student.cgpa || "N/A"),
    backlogs: Number(params.student.backlogs) || 0,
    skills: params.student.skills || [],
    resumeUrl: params.resumeUrl || params.student.resume?.url || "#",
    portfolioUrl: params.portfolioUrl || params.student.socialLinks?.portfolio,
    githubUrl: params.githubUrl || params.student.socialLinks?.github,
    linkedinUrl: params.linkedinUrl || params.student.socialLinks?.linkedin,
    status: initialStatus,
    eligibility: eligibilityResult,
    currentStageId: initialStage.id,
    currentStageName: initialStage.name,
    currentStageType: initialStage.type,
    notes: params.notes,
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [
      {
        stageId: initialStage.id,
        stageName: initialStage.name,
        status: "APPLICATION_SUBMITTED",
        timestamp: new Date().toISOString(),
        actor: params.student.name || "Candidate",
        note: `Application submitted successfully with Application ID ${applicationId}.`,
      },
      {
        stageId: initialStage.id,
        stageName: initialStage.name,
        status: eligibilityResult.status === "ELIGIBLE" ? "ELIGIBLE" : "ELIGIBILITY_FAILED",
        timestamp: new Date().toISOString(),
        actor: "Automated Eligibility Engine",
        note:
          eligibilityResult.status === "ELIGIBLE"
            ? `Passed all academic and skill criteria with a match score of ${eligibilityResult.score}%.`
            : `Failed criteria: ${eligibilityResult.criteria.filter((c) => !c.passed).map((c) => c.name).join(", ")}.`,
      },
    ],
  };

  recruitmentStore.applications.set(newApp.id, newApp);
  persistRecruitmentStoreToDisk();

  // Log recruiter audit trail
  logRecruiterAction({
    driveId: drive.id,
    driveTitle: drive.title,
    actorId: params.student.id,
    actorName: params.student.name || "Candidate",
    actorRole: "STUDENT",
    action: "APPLICATION_SUBMITTED",
    targetType: "APPLICATION",
    targetId: newApp.id,
    targetName: newApp.studentName,
    newState: newApp.status,
    details: `Candidate submitted application for ${drive.title}. Eligibility: ${eligibilityResult.status} (${eligibilityResult.score}%).`,
  });

  return { success: true, application: newApp, status: 201 };
}

