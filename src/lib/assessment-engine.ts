import fs from "fs";
import path from "path";
import {
  AssessmentQuestion,
  AssessmentRecord,
  AssessmentSnapshotQuestion,
  AssessmentAttempt,
  AttemptAnswer,
  AssessmentIntegrityEvent,
  QuestionSource,
  QuestionType,
  QuestionDifficulty,
  QuestionCategory,
  AssessmentStatus,
  AssessmentMode,
  IntegrityEventType,
  IntegrityActionTaken,
  CandidateAssessmentRecord,
  AssessmentSection,
  AssessmentCutoffConfig,
  AssessmentMeritConfig,
  SectionScoreSummary,
  QuestionObjection,
  AssessmentAuthorization,
  QuestionImportRecord,
  CutoffType,
  MeritCriterion,
} from "@/types";
import { AuthenticatedUser } from "@/lib/supabase/server";
import {
  recruitmentStore,
  logRecruiterAction,
  getRecruitmentDriveById,
  saveAssessmentRecord,
} from "@/lib/recruitment-store";
import { ServerStore } from "@/lib/server-store";

const ASSESSMENT_DB_FILE = path.join(process.cwd(), ".data", "assessment-store-db.json");

interface AssessmentStoreState {
  questions: Map<string, AssessmentQuestion>;
  assessments: Map<string, AssessmentRecord>;
  attempts: Map<string, AssessmentAttempt>;
  integrityEvents: Map<string, AssessmentIntegrityEvent[]>; // attemptId -> events
  objections: Map<string, QuestionObjection>;
  authorizations: Map<string, AssessmentAuthorization>;
  importHistory: Map<string, QuestionImportRecord>;
}

declare global {
  // eslint-disable-next-line no-var
  var __COMMANDSKILL_ASSESSMENT_STORE__: AssessmentStoreState | undefined;
}

// ---------------------------------------------------------------------------
// Seed Data: System Question Bank + Initial Assessments & Attempts
// ---------------------------------------------------------------------------
function initializeAssessmentStore(): AssessmentStoreState {
  const questions = new Map<string, AssessmentQuestion>();
  const assessments = new Map<string, AssessmentRecord>();
  const attempts = new Map<string, AssessmentAttempt>();
  const integrityEvents = new Map<string, AssessmentIntegrityEvent[]>();
  const objections = new Map<string, QuestionObjection>();
  const authorizations = new Map<string, AssessmentAuthorization>();
  const importHistory = new Map<string, QuestionImportRecord>();

  // 1. Seed CommandSkill System Bank Questions (Created by Admin, read-only to recruiters)
  const systemQuestions: AssessmentQuestion[] = [
    {
      id: "q_sys_01",
      ownerType: "SYSTEM",
      ownerId: "system",
      createdById: "admin_platform",
      createdByName: "CommandSkill Content Team",
      type: "SINGLE_CHOICE",
      questionText: "What is the worst-case time complexity of searching for an element in a balanced Binary Search Tree (such as AVL or Red-Black Tree)?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctAnswer: "O(log n)",
      marks: 2,
      negativeMarks: 0.5,
      difficulty: "EASY",
      category: "Technical",
      topic: "Data Structures",
      tags: ["Trees", "Complexity", "Algorithms"],
      explanation: "A balanced BST maintains its height bounded by O(log n), ensuring lookup, insertion, and deletion run in O(log n) worst-case time.",
      isArchived: false,
      version: 1,
      createdAt: "2026-01-10T10:00:00.000Z",
      updatedAt: "2026-01-10T10:00:00.000Z",
    },
    {
      id: "q_sys_02",
      ownerType: "SYSTEM",
      ownerId: "system",
      createdById: "admin_platform",
      createdByName: "CommandSkill Content Team",
      type: "MULTIPLE_CHOICE",
      questionText: "Which of the following HTTP status codes indicate a client-side error? (Select all that apply)",
      options: [
        "400 Bad Request",
        "401 Unauthorized",
        "502 Bad Gateway",
        "403 Forbidden",
        "500 Internal Server Error",
      ],
      correctAnswer: ["400 Bad Request", "401 Unauthorized", "403 Forbidden"],
      marks: 3,
      negativeMarks: 1,
      difficulty: "MEDIUM",
      category: "Technical",
      topic: "Web & Networking",
      tags: ["HTTP", "REST", "API"],
      explanation: "HTTP 4xx series represent client-side errors, while 5xx series represent server-side errors.",
      isArchived: false,
      version: 1,
      createdAt: "2026-01-12T10:00:00.000Z",
      updatedAt: "2026-01-12T10:00:00.000Z",
    },
    {
      id: "q_sys_03",
      ownerType: "SYSTEM",
      ownerId: "system",
      createdById: "admin_platform",
      createdByName: "CommandSkill Content Team",
      type: "TRUE_FALSE",
      questionText: "In JavaScript, closures retain access to variables in their outer lexical scope even after the outer function has finished execution.",
      options: ["True", "False"],
      correctAnswer: "True",
      marks: 2,
      negativeMarks: 0,
      difficulty: "EASY",
      category: "Technical",
      topic: "JavaScript",
      tags: ["Closures", "Scopes", "Core JS"],
      explanation: "A closure combines a function with its lexical environment, allowing it to reference variables from the enclosing scope across asynchronous or subsequent invocations.",
      isArchived: false,
      version: 1,
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    },
    {
      id: "q_sys_04",
      ownerType: "SYSTEM",
      ownerId: "system",
      createdById: "admin_platform",
      createdByName: "CommandSkill Content Team",
      type: "SINGLE_CHOICE",
      questionText: "In relational database transactions, which SQL standard isolation level guarantees complete prevention of dirty reads, non-repeatable reads, and phantom reads?",
      options: ["Read Committed", "Repeatable Read", "Serializable", "Read Uncommitted"],
      correctAnswer: "Serializable",
      marks: 3,
      negativeMarks: 1,
      difficulty: "HARD",
      category: "Technical",
      topic: "Databases",
      tags: ["SQL", "ACID", "Transactions"],
      explanation: "Serializable is the highest isolation level. It executes concurrent transactions in a way that produces equivalent results to serial execution, eliminating phantom reads.",
      isArchived: false,
      version: 1,
      createdAt: "2026-01-18T10:00:00.000Z",
      updatedAt: "2026-01-18T10:00:00.000Z",
    },
    {
      id: "q_sys_05",
      ownerType: "SYSTEM",
      ownerId: "system",
      createdById: "admin_platform",
      createdByName: "CommandSkill Content Team",
      type: "SHORT_ANSWER",
      questionText: "What software design pattern restricts class instantiation to a single instance and provides a global access point to that instance?",
      options: [],
      correctAnswer: "Singleton",
      marks: 2,
      negativeMarks: 0,
      difficulty: "EASY",
      category: "Technical",
      topic: "Software Architecture",
      tags: ["Design Patterns", "OOP"],
      explanation: "The Singleton pattern ensures a class has only one instance while providing a global access point to it.",
      isArchived: false,
      version: 1,
      createdAt: "2026-01-20T10:00:00.000Z",
      updatedAt: "2026-01-20T10:00:00.000Z",
    },
    {
      id: "q_sys_06",
      ownerType: "SYSTEM",
      ownerId: "system",
      createdById: "admin_platform",
      createdByName: "CommandSkill Content Team",
      type: "SINGLE_CHOICE",
      questionText: "A car travels 120 km at 60 km/h and then travels another 180 km at 90 km/h. What is the average speed of the car for the entire journey?",
      options: ["72 km/h", "75 km/h", "78 km/h", "80 km/h"],
      correctAnswer: "75 km/h",
      marks: 2,
      negativeMarks: 0.5,
      difficulty: "MEDIUM",
      category: "Aptitude",
      topic: "Quantitative Aptitude",
      tags: ["Speed & Distance", "Arithmetic"],
      explanation: "Total distance = 120 + 180 = 300 km. Total time = (120/60) + (180/90) = 2 + 2 = 4 hours. Average speed = 300 / 4 = 75 km/h.",
      isArchived: false,
      version: 1,
      createdAt: "2026-01-22T10:00:00.000Z",
      updatedAt: "2026-01-22T10:00:00.000Z",
    },
    {
      id: "q_sys_07",
      ownerType: "SYSTEM",
      ownerId: "system",
      createdById: "admin_platform",
      createdByName: "CommandSkill Content Team",
      type: "SINGLE_CHOICE",
      questionText: "In React 18+, which hook is specifically designed to store a mutable value across renders without triggering a component re-render when its value changes?",
      options: ["useState", "useMemo", "useRef", "useCallback"],
      correctAnswer: "useRef",
      marks: 2,
      negativeMarks: 0.5,
      difficulty: "EASY",
      category: "Technical",
      topic: "React",
      tags: ["React Hooks", "Frontend"],
      explanation: "useRef returns a mutable object whose .current property persists for the full lifetime of the component without causing a re-render when mutated.",
      isArchived: false,
      version: 1,
      createdAt: "2026-01-25T10:00:00.000Z",
      updatedAt: "2026-01-25T10:00:00.000Z",
    },
    {
      id: "q_sys_08",
      ownerType: "SYSTEM",
      ownerId: "system",
      createdById: "admin_platform",
      createdByName: "CommandSkill Content Team",
      type: "SINGLE_CHOICE",
      questionText: "According to Eric Brewer's CAP Theorem, in the presence of a network partition (P), what trade-off must a distributed data system strictly choose between?",
      options: [
        "Consistency vs Availability",
        "Performance vs Durability",
        "Throughput vs Latency",
        "Scalability vs Fault Tolerance",
      ],
      correctAnswer: "Consistency vs Availability",
      marks: 3,
      negativeMarks: 1,
      difficulty: "HARD",
      category: "Technical",
      topic: "Distributed Systems",
      tags: ["CAP Theorem", "System Design"],
      explanation: "During a network partition, a distributed system must either reject writes/reads to remain consistent (CP) or proceed with local operations risking inconsistency to stay available (AP).",
      isArchived: false,
      version: 1,
      createdAt: "2026-01-28T10:00:00.000Z",
      updatedAt: "2026-01-28T10:00:00.000Z",
    },
  ];

  systemQuestions.forEach((q) => questions.set(q.id, q));

  // 2. Seed Recruiter/Company Questions for Stripe
  const companyQuestions: AssessmentQuestion[] = [
    {
      id: "q_comp_01",
      ownerType: "COMPANY",
      ownerId: "comp_stripe",
      companyId: "comp_stripe",
      createdById: "recruiter_01",
      createdByName: "Barun",
      type: "SINGLE_CHOICE",
      questionText: "When designing high-throughput payment webhook consumers, which database pattern is best suited to guarantee idempotency and prevent duplicate charges?",
      options: [
        "Client IP address rate limiting",
        "Unique Idempotency Key with atomic database insert/upsert constraint",
        "HTTP 302 Redirection to verification URL",
        "Client-side sessionStorage flag",
      ],
      correctAnswer: "Unique Idempotency Key with atomic database insert/upsert constraint",
      marks: 4,
      negativeMarks: 1,
      difficulty: "MEDIUM",
      category: "Domain",
      topic: "Fintech & Payments",
      tags: ["Idempotency", "Payments", "Stripe API"],
      explanation: "Using an atomic unique constraint on the idempotency key in the database ensures duplicate requests fail atomically without reprocessing payment side effects.",
      isArchived: false,
      version: 1,
      createdAt: "2026-02-01T10:00:00.000Z",
      updatedAt: "2026-02-01T10:00:00.000Z",
    },
    {
      id: "q_comp_02",
      ownerType: "COMPANY",
      ownerId: "comp_stripe",
      companyId: "comp_stripe",
      createdById: "recruiter_01",
      createdByName: "Barun",
      type: "MULTIPLE_CHOICE",
      questionText: "Which elements are required to verify incoming HMAC SHA-256 webhook signatures from Stripe?",
      options: [
        "Stripe-Signature header timestamp (t) and signature (v1)",
        "Raw unparsed request body payload",
        "Webhook endpoint signing secret",
        "Client TLS certificate thumbprint",
      ],
      correctAnswer: [
        "Stripe-Signature header timestamp (t) and signature (v1)",
        "Raw unparsed request body payload",
        "Webhook endpoint signing secret",
      ],
      marks: 4,
      negativeMarks: 1,
      difficulty: "HARD",
      category: "Domain",
      topic: "Security & Webhooks",
      tags: ["HMAC", "Webhooks", "Security"],
      explanation: "HMAC verification requires computing the SHA-256 hash using the raw body, timestamp, and shared endpoint secret, comparing against the v1 signature in constant time.",
      isArchived: false,
      version: 1,
      createdAt: "2026-02-03T10:00:00.000Z",
      updatedAt: "2026-02-03T10:00:00.000Z",
    },
  ];

  companyQuestions.forEach((q) => questions.set(q.id, q));

  // 3. Seed Published Assessment for Drive 1 ("Software Engineer 2026")
  const recStore = globalThis.__COMMANDSKILL_RECRUITMENT_STORE__;
  const drive1 = recStore?.drives ? Array.from(recStore.drives.values())[0] : undefined;
  const drive1Id = drive1 ? drive1.id : "drive_stripe_sde_2026";
  const drive1Title = drive1 ? drive1.title : "Software Engineer 2026";

  const allSeedQuestions = [...systemQuestions, ...companyQuestions];
  const snapshots: AssessmentSnapshotQuestion[] = allSeedQuestions.map((q, idx) => ({
    id: `snap_${q.id}`,
    originalQuestionId: q.id,
    source: q.ownerType,
    type: q.type,
    questionText: q.questionText,
    options: q.options ? [...q.options] : [],
    correctAnswer: q.correctAnswer,
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    difficulty: q.difficulty,
    category: q.category,
    topic: q.topic,
    orderIndex: idx + 1,
    explanation: q.explanation,
  }));

  const totalMarks = snapshots.reduce((acc, q) => acc + q.marks, 0); // 27 marks

  const sampleAssessment: AssessmentRecord = {
    id: "assess_stripe_sde_tech",
    version: 1,
    title: "Core Algorithms & Distributed Systems Assessment",
    description: "Proctored technical evaluation covering Data Structures, Web Systems, Concurrency, and Payment Idempotency.",
    instructions: "Strict proctored examination. Webcam, microphone, and full-screen display sharing are required. Exiting fullscreen or navigating to other tabs will log an integrity violation.",
    driveId: drive1Id,
    driveTitle: drive1Title,
    companyId: "comp_stripe",
    companyName: "Stripe",
    createdById: "recruiter_01",
    createdByName: "Barun",
    category: "Technical",
    durationMinutes: 45,
    startDateTime: "2026-03-01T09:00:00.000Z",
    endDateTime: "2026-04-01T23:59:59.000Z",
    status: "ACTIVE",
    mode: "PROCTORED",
    proctoringConfig: {
      cameraRequired: true,
      microphoneRequired: true,
      entireScreenRequired: true,
      fullscreenRequired: true,
      pauseOnCameraStop: true,
      pauseOnMicrophoneStop: true,
      pauseOnScreenShareStop: true,
      maxWindowViolations: 2,
      maxFullscreenViolations: 2,
      terminateOnViolationLimit: true,
    },
    candidateRules: {
      randomizeQuestions: false,
      randomizeOptions: false,
      allowBackNavigation: true,
      autoSubmitOnTimeout: true,
      showResultImmediately: true,
      attemptsAllowed: 1,
    },
    totalMarks,
    passingMarks: 18,
    passingPercentage: 65,
    negativeMarkingEnabled: true,
    questionIds: allSeedQuestions.map((q) => q.id),
    questionSnapshots: snapshots,
    assignedCandidateIds: ["app_01", "app_02", "app_03", "student", "student_123"],
    createdAt: "2026-03-02T10:00:00.000Z",
    updatedAt: "2026-03-02T10:00:00.000Z",
    publishedAt: "2026-03-02T10:30:00.000Z",
  };

  assessments.set(sampleAssessment.id, sampleAssessment);

  // 4. Seed Attempts:
  // Alex Rivera: Completed & Passed (Clean)
  const alexAnswers: Record<string, AttemptAnswer> = {};
  snapshots.forEach((snap, idx) => {
    // Answer mostly correctly, miss 1 question
    const isMissed = idx === 3;
    const ans = isMissed
      ? "Read Committed"
      : Array.isArray(snap.correctAnswer)
      ? [...snap.correctAnswer]
      : snap.correctAnswer;

    alexAnswers[snap.id] = {
      questionId: snap.id,
      answer: ans,
      isAnswered: true,
      answeredAt: "2026-03-05T14:20:00.000Z",
      updatedAt: "2026-03-05T14:20:00.000Z",
      isCorrect: !isMissed,
      marksAwarded: !isMissed ? snap.marks : -snap.negativeMarks,
    };
  });

  const alexScore = Object.values(alexAnswers).reduce((sum, a) => sum + (a.marksAwarded || 0), 0);

  const attemptAlex: AssessmentAttempt = {
    id: "att_alex_rivera_01",
    assessmentId: sampleAssessment.id,
    assessmentTitle: sampleAssessment.title,
    studentId: "student_alex",
    studentName: "Alex Rivera",
    studentEmail: "alex.rivera@cs.stanford.edu",
    applicationId: "app_01",
    driveId: drive1Id,
    attemptNumber: 1,
    sessionToken: "sess_alex_verified_token",
    status: "SUBMITTED",
    startedAt: "2026-03-05T14:00:00.000Z",
    expiresAt: "2026-03-05T14:45:00.000Z",
    submittedAt: "2026-03-05T14:38:15.000Z",
    durationSecondsTaken: 2295,
    lastActivityAt: "2026-03-05T14:38:15.000Z",
    questionOrder: snapshots.map((s) => s.id),
    answers: alexAnswers,
    totalScore: Math.round(alexScore * 10) / 10,
    maxScore: totalMarks,
    percentage: Math.round((alexScore / totalMarks) * 100),
    passed: alexScore >= sampleAssessment.passingMarks,
    integrityStatus: "CLEAN",
    violationCount: 0,
    createdAt: "2026-03-05T14:00:00.000Z",
    updatedAt: "2026-03-05T14:38:15.000Z",
  };
  attempts.set(attemptAlex.id, attemptAlex);

  // Elena Rostova: Completed, Flagged for Review (1 window blur event)
  const elenaAnswers: Record<string, AttemptAnswer> = {};
  snapshots.forEach((snap, idx) => {
    const isCorrect = idx % 2 === 0;
    const ans = isCorrect
      ? Array.isArray(snap.correctAnswer)
        ? [...snap.correctAnswer]
        : snap.correctAnswer
      : snap.options && snap.options.length > 1
      ? snap.options[1]
      : "Incorrect";

    elenaAnswers[snap.id] = {
      questionId: snap.id,
      answer: ans,
      isAnswered: true,
      answeredAt: "2026-03-05T14:40:00.000Z",
      updatedAt: "2026-03-05T14:40:00.000Z",
      isCorrect,
      marksAwarded: isCorrect ? snap.marks : -snap.negativeMarks,
    };
  });

  const elenaScore = Math.max(0, Object.values(elenaAnswers).reduce((sum, a) => sum + (a.marksAwarded || 0), 0));

  const attemptElena: AssessmentAttempt = {
    id: "att_elena_rostova_01",
    assessmentId: sampleAssessment.id,
    assessmentTitle: sampleAssessment.title,
    studentId: "student_elena",
    studentName: "Elena Rostova",
    studentEmail: "elena.rostova@mit.edu",
    applicationId: "app_02",
    driveId: drive1Id,
    attemptNumber: 1,
    sessionToken: "sess_elena_verified_token",
    status: "SUBMITTED",
    startedAt: "2026-03-05T14:05:00.000Z",
    expiresAt: "2026-03-05T14:50:00.000Z",
    submittedAt: "2026-03-05T14:44:10.000Z",
    durationSecondsTaken: 2350,
    lastActivityAt: "2026-03-05T14:44:10.000Z",
    questionOrder: snapshots.map((s) => s.id),
    answers: elenaAnswers,
    totalScore: Math.round(elenaScore * 10) / 10,
    maxScore: totalMarks,
    percentage: Math.round((elenaScore / totalMarks) * 100),
    passed: elenaScore >= sampleAssessment.passingMarks,
    integrityStatus: "REVIEW",
    violationCount: 1,
    createdAt: "2026-03-05T14:05:00.000Z",
    updatedAt: "2026-03-05T14:44:10.000Z",
  };
  attempts.set(attemptElena.id, attemptElena);

  integrityEvents.set(attemptElena.id, [
    {
      id: "evt_elena_01",
      attemptId: attemptElena.id,
      assessmentId: sampleAssessment.id,
      candidateId: attemptElena.studentId,
      candidateName: attemptElena.studentName,
      eventType: "WINDOW_BLUR",
      severity: "MEDIUM",
      timestamp: "2026-03-05T14:22:18.000Z",
      metadata: { reason: "Candidate window lost active focus" },
      actionTaken: "WARNING",
    },
  ]);

  const initialStore: AssessmentStoreState = {
    questions,
    assessments,
    attempts,
    integrityEvents,
    objections,
    authorizations,
    importHistory,
  };

  loadAssessmentStoreFromDisk(initialStore);
  return initialStore;
}

function loadAssessmentStoreFromDisk(storeObj: AssessmentStoreState): void {
  try {
    if (!fs.existsSync(ASSESSMENT_DB_FILE)) return;
    const raw = fs.readFileSync(ASSESSMENT_DB_FILE, "utf-8");
    if (!raw.trim()) return;
    const data = JSON.parse(raw);

    if (data.questions && Array.isArray(data.questions)) {
      data.questions.forEach(([id, q]: [string, AssessmentQuestion]) => {
        storeObj.questions.set(id, q);
      });
    }
    if (data.assessments && Array.isArray(data.assessments)) {
      data.assessments.forEach(([id, a]: [string, AssessmentRecord]) => {
        storeObj.assessments.set(id, a);
      });
    }
    if (data.attempts && Array.isArray(data.attempts)) {
      data.attempts.forEach(([id, att]: [string, AssessmentAttempt]) => {
        storeObj.attempts.set(id, att);
      });
    }
    if (data.integrityEvents && Array.isArray(data.integrityEvents)) {
      data.integrityEvents.forEach(([id, evts]: [string, AssessmentIntegrityEvent[]]) => {
        storeObj.integrityEvents.set(id, evts);
      });
    }
    if (data.objections && Array.isArray(data.objections)) {
      data.objections.forEach(([id, obj]: [string, QuestionObjection]) => {
        storeObj.objections.set(id, obj);
      });
    }
    if (data.authorizations && Array.isArray(data.authorizations)) {
      data.authorizations.forEach(([id, auth]: [string, AssessmentAuthorization]) => {
        storeObj.authorizations.set(id, auth);
      });
    }
    if (data.importHistory && Array.isArray(data.importHistory)) {
      data.importHistory.forEach(([id, imp]: [string, QuestionImportRecord]) => {
        storeObj.importHistory.set(id, imp);
      });
    }
  } catch (err) {
    console.warn("[Assessment Store] Failed loading from disk:", err);
  }
}

function persistAssessmentStoreToDisk(): void {
  try {
    const dir = path.dirname(ASSESSMENT_DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const payload = {
      questions: Array.from(assessmentStore.questions.entries()),
      assessments: Array.from(assessmentStore.assessments.entries()),
      attempts: Array.from(assessmentStore.attempts.entries()),
      integrityEvents: Array.from(assessmentStore.integrityEvents.entries()),
      objections: Array.from(assessmentStore.objections.entries()),
      authorizations: Array.from(assessmentStore.authorizations.entries()),
      importHistory: Array.from(assessmentStore.importHistory.entries()),
    };

    fs.writeFileSync(ASSESSMENT_DB_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.error("[Assessment Store] Error persisting to disk:", err);
  }
}

export const assessmentStore: AssessmentStoreState =
  globalThis.__COMMANDSKILL_ASSESSMENT_STORE__ ?? initializeAssessmentStore();

// Safeguard existing long-running global store if new maps were added
if (!assessmentStore.questions) assessmentStore.questions = new Map();
if (!assessmentStore.assessments) assessmentStore.assessments = new Map();
if (!assessmentStore.attempts) assessmentStore.attempts = new Map();
if (!assessmentStore.integrityEvents) assessmentStore.integrityEvents = new Map();
if (!assessmentStore.objections) assessmentStore.objections = new Map();
if (!assessmentStore.authorizations) assessmentStore.authorizations = new Map();
if (!assessmentStore.importHistory) assessmentStore.importHistory = new Map();

// Sanitize in-memory store records to ensure mathematically consistent score totals
assessmentStore.assessments.forEach((ass) => {
  if (ass.passingMarks && ass.passingMarks > ass.totalMarks) {
    ass.totalMarks = Math.max(100, ass.passingMarks);
    ass.passingPercentage = Math.round((ass.passingMarks / ass.totalMarks) * 100);
  }
});
assessmentStore.attempts.forEach((att) => {
  const ass = assessmentStore.assessments.get(att.assessmentId);
  if (ass && ass.totalMarks > 0 && att.totalScore !== undefined) {
    att.percentage = Math.min(100, Math.max(0, Math.round((att.totalScore / ass.totalMarks) * 100)));
  }
});

if (process.env.NODE_ENV !== "production") {
  globalThis.__COMMANDSKILL_ASSESSMENT_STORE__ = assessmentStore;
}

export function getAssessmentAttempt(assessmentId: string, studentId: string): AssessmentAttempt | null {
  return Array.from(assessmentStore.attempts.values()).find(
    (att) => att.assessmentId === assessmentId && (att.studentId === studentId || att.studentId === "student")
  ) || null;
}

// ---------------------------------------------------------------------------
// QUESTION BANK SERVICE
// ---------------------------------------------------------------------------


export function getQuestions(
  filters?: {
    ownerType?: QuestionSource;
    companyId?: string;
    category?: string;
    topic?: string;
    difficulty?: string;
    type?: string;
    search?: string;
    status?: "ACTIVE" | "ARCHIVED" | "ALL";
  },
  authUser?: AuthenticatedUser
): AssessmentQuestion[] {
  let list = Array.from(assessmentStore.questions.values());

  // Filter archived status
  if (filters?.status === "ARCHIVED") {
    list = list.filter((q) => q.isArchived);
  } else if (filters?.status !== "ALL") {
    list = list.filter((q) => !q.isArchived);
  }

  // RBAC Filter: Recruiters see SYSTEM bank + their own COMPANY bank + their own RECRUITER bank
  if (authUser && !["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(authUser.role)) {
    const userCompany = authUser.company_id || "comp_stripe";
    list = list.filter(
      (q) =>
        q.ownerType === "SYSTEM" ||
        (q.ownerType === "COMPANY" && q.companyId === userCompany) ||
        (q.ownerType === "RECRUITER" && (q.createdById === authUser.id || q.companyId === userCompany))
    );
  }

  if (filters?.ownerType) {
    list = list.filter((q) => q.ownerType === filters.ownerType);
  }
  if (filters?.category) {
    list = list.filter((q) => q.category.toLowerCase() === filters.category!.toLowerCase());
  }
  if (filters?.topic) {
    list = list.filter((q) => q.topic.toLowerCase() === filters.topic!.toLowerCase());
  }
  if (filters?.difficulty) {
    list = list.filter((q) => q.difficulty === filters.difficulty);
  }
  if (filters?.type) {
    list = list.filter((q) => q.type === filters.type);
  }
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    list = list.filter(
      (q) =>
        q.questionText.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query) ||
        q.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getQuestionById(id: string): AssessmentQuestion | null {
  return assessmentStore.questions.get(id) || null;
}

export function saveQuestion(
  data: Partial<AssessmentQuestion>,
  authUser: AuthenticatedUser
): { question: AssessmentQuestion; error?: string } {
  if (!data.questionText || !data.questionText.trim()) {
    return { question: {} as any, error: "Question text is mandatory." };
  }

  const existing = data.id ? assessmentStore.questions.get(data.id) : null;

  // Protect SYSTEM questions: Only platform admins can edit system questions
  if (existing && existing.ownerType === "SYSTEM") {
    if (!["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(authUser.role)) {
      return { question: {} as any, error: "Unauthorized: System bank questions cannot be modified by recruiters." };
    }
  }

  // Prevent IDOR: Recruiters can only modify questions belonging to their company
  if (existing && existing.ownerType === "COMPANY") {
    const userCompany = authUser.company_id || "comp_stripe";
    if (existing.companyId && existing.companyId !== userCompany && !["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(authUser.role)) {
      return { question: {} as any, error: "Forbidden: Cannot edit another company's questions." };
    }
  }

  // Prevent editing another recruiter's questions
  if (existing && existing.ownerType === "RECRUITER") {
    if (existing.createdById !== authUser.id && !["SUPER_ADMIN", "PLATFORM_ADMIN", "COMPANY_ADMIN"].includes(authUser.role)) {
      return { question: {} as any, error: "Forbidden: Cannot edit another recruiter's question." };
    }
  }

  const isSystemUser = ["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(authUser.role);
  let targetOwnerType: QuestionSource = "COMPANY";
  if (data.ownerType === "SYSTEM" && isSystemUser) {
    targetOwnerType = "SYSTEM";
  } else if (data.ownerType === "RECRUITER") {
    targetOwnerType = "RECRUITER";
  } else {
    targetOwnerType = "COMPANY";
  }
  const targetCompany = targetOwnerType === "SYSTEM" ? undefined : authUser.company_id || "comp_stripe";

  const question: AssessmentQuestion = {
    id: data.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ownerType: targetOwnerType,
    ownerId: targetOwnerType === "SYSTEM" ? "system" : targetOwnerType === "RECRUITER" ? authUser.id : targetCompany || authUser.id,
    companyId: targetCompany,
    createdById: authUser.id,
    createdByName: authUser.name || "Recruiter",
    type: data.type || "SINGLE_CHOICE",
    questionText: data.questionText.trim(),
    options: data.options && data.options.length > 0 ? data.options.map((o) => o.trim()) : [],
    correctAnswer: data.correctAnswer || (data.options && data.options[0]) || "",
    marks: Number(data.marks) > 0 ? Number(data.marks) : 2,
    negativeMarks: Number(data.negativeMarks) >= 0 ? Number(data.negativeMarks) : 0,
    difficulty: data.difficulty || "MEDIUM",
    category: data.category || "Technical",
    topic: data.topic ? data.topic.trim() : "General",
    tags: Array.isArray(data.tags) ? data.tags.map((t) => t.trim()).filter(Boolean) : [],
    explanation: data.explanation ? data.explanation.trim() : "",
    isArchived: false,
    version: existing ? (existing.version || 1) + 1 : 1,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assessmentStore.questions.set(question.id, question);
  persistAssessmentStoreToDisk();

  logRecruiterAction({
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: existing ? "QUESTION_UPDATED" : "QUESTION_CREATED",
    targetType: "ASSESSMENT",
    targetId: question.id,
    targetName: question.topic,
    newState: question.type,
    details: `${existing ? "Updated" : "Created"} question: "${question.questionText.slice(0, 60)}..." in ${question.topic}`,
  });

  return { question };
}

export function archiveQuestion(
  id: string,
  authUser: AuthenticatedUser
): { success: boolean; error?: string } {
  const q = assessmentStore.questions.get(id);
  if (!q) return { success: false, error: "Question not found." };

  if (q.ownerType === "SYSTEM" && !["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(authUser.role)) {
    return { success: false, error: "Forbidden: Recruiters cannot archive System questions." };
  }

  const userCompany = authUser.company_id || "comp_stripe";
  if (q.ownerType === "COMPANY" && q.companyId !== userCompany && !["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(authUser.role)) {
    return { success: false, error: "Forbidden: Cannot archive another company's question." };
  }

  if (q.ownerType === "RECRUITER" && q.createdById !== authUser.id && !["SUPER_ADMIN", "PLATFORM_ADMIN", "COMPANY_ADMIN"].includes(authUser.role)) {
    return { success: false, error: "Forbidden: Cannot archive another recruiter's question." };
  }

  q.isArchived = true;
  q.updatedAt = new Date().toISOString();
  assessmentStore.questions.set(id, q);
  persistAssessmentStoreToDisk();

  logRecruiterAction({
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: "QUESTION_ARCHIVED",
    targetType: "ASSESSMENT",
    targetId: id,
    targetName: q.topic,
    details: `Archived question "${q.questionText.slice(0, 50)}..."`,
  });

  return { success: true };
}

export function bulkImportQuestions(
  rows: any[],
  authUser: AuthenticatedUser
): { imported: AssessmentQuestion[]; errors: { row: number; reason: string }[] } {
  const imported: AssessmentQuestion[] = [];
  const errors: { row: number; reason: string }[] = [];
  const userCompany = authUser.company_id || "comp_stripe";

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    const qText = row.question || row.questionText;
    if (!qText || !qText.toString().trim()) {
      errors.push({ row: rowNum, reason: "Missing required field: question text." });
      return;
    }

    const typeStr = (row.type || "SINGLE_CHOICE").toUpperCase();
    const validTypes: QuestionType[] = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"];
    const type: QuestionType = validTypes.includes(typeStr) ? typeStr : "SINGLE_CHOICE";

    // Parse options
    let options: string[] = [];
    if (Array.isArray(row.options)) {
      options = row.options.map((o: any) => String(o).trim());
    } else if (row.option_a || row.option_b) {
      options = [row.option_a, row.option_b, row.option_c, row.option_d]
        .filter(Boolean)
        .map((o) => String(o).trim());
    }

    // Parse correct answer
    const rawAnswer = row.correct_answer || row.correctAnswer;
    if (!rawAnswer) {
      errors.push({ row: rowNum, reason: "Missing required field: correct answer." });
      return;
    }

    let correctAnswer: string | string[] = rawAnswer;
    if (type === "MULTIPLE_CHOICE" && typeof rawAnswer === "string" && rawAnswer.includes(",")) {
      correctAnswer = rawAnswer.split(",").map((s) => s.trim());
    }

    const marks = Number(row.marks) > 0 ? Number(row.marks) : 2;
    const negativeMarks = Number(row.negative_marks || row.negativeMarks) >= 0 ? Number(row.negative_marks || row.negativeMarks) : 0;

    const newQ: AssessmentQuestion = {
      id: `q_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${rowNum}`,
      ownerType: "COMPANY",
      ownerId: userCompany,
      companyId: userCompany,
      createdById: authUser.id,
      createdByName: authUser.name || "Recruiter",
      type,
      questionText: String(qText).trim(),
      options,
      correctAnswer,
      marks,
      negativeMarks,
      difficulty: (row.difficulty?.toUpperCase() as QuestionDifficulty) || "MEDIUM",
      category: (row.category as QuestionCategory) || "Technical",
      topic: String(row.topic || "General").trim(),
      tags: Array.isArray(row.tags)
        ? row.tags
        : typeof row.tags === "string"
        ? row.tags.split(",").map((t: string) => t.trim())
        : [],
      explanation: row.explanation ? String(row.explanation).trim() : "",
      isArchived: false,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    assessmentStore.questions.set(newQ.id, newQ);
    imported.push(newQ);
  });

  if (imported.length > 0) {
    persistAssessmentStoreToDisk();
    logRecruiterAction({
      actorId: authUser.id,
      actorName: authUser.name || "Recruiter",
      actorRole: authUser.role,
      action: "QUESTIONS_BULK_IMPORTED",
      targetType: "ASSESSMENT",
      targetId: `batch_${Date.now()}`,
      details: `Bulk imported ${imported.length} questions (${errors.length} rows skipped due to errors).`,
    });
  }

  return { imported, errors };
}

// ---------------------------------------------------------------------------
// RECRUITER ASSESSMENT MANAGEMENT & PUBLISHING
// ---------------------------------------------------------------------------

export function getAssessmentConfigs(
  filters?: {
    companyId?: string;
    driveId?: string;
    status?: string;
    search?: string;
  },
  authUser?: AuthenticatedUser
): (AssessmentRecord & {
  questionsCount: number;
  candidatesAssignedCount: number;
  completedCount: number;
  averageScore: number;
})[] {
  let list = Array.from(assessmentStore.assessments.values());

  if (authUser && !["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(authUser.role)) {
    const userCompany = authUser.company_id || "comp_stripe";
    list = list.filter((a) => a.companyId === userCompany);
  }

  if (filters?.driveId && filters.driveId !== "all") {
    list = list.filter((a) => a.driveId === filters.driveId);
  }
  if (filters?.status && filters.status !== "ALL") {
    list = list.filter((a) => a.status === filters.status);
  }
  if (filters?.search) {
    const query = filters.search.toLowerCase();
    list = list.filter((a) => a.title.toLowerCase().includes(query) || a.driveTitle?.toLowerCase().includes(query));
  }

  return list.map((ass) => {
    const attempts = Array.from(assessmentStore.attempts.values()).filter((att) => att.assessmentId === ass.id);
    const completed = attempts.filter((att) => att.status === "SUBMITTED" || att.status === "AUTO_SUBMITTED");
    const avgScore =
      completed.length > 0
        ? Math.round((completed.reduce((acc, c) => acc + (c.totalScore || 0), 0) / completed.length) * 10) / 10
        : 0;

    return {
      ...ass,
      questionsCount: ass.questionSnapshots?.length || ass.questionIds?.length || 0,
      candidatesAssignedCount: ass.assignedCandidateIds?.length || 0,
      completedCount: completed.length,
      averageScore: avgScore,
    };
  });
}

export function getAssessmentConfigById(id: string): AssessmentRecord | null {
  return assessmentStore.assessments.get(id) || null;
}

export function saveAssessmentConfig(
  data: Partial<AssessmentRecord>,
  authUser: AuthenticatedUser
): { assessment: AssessmentRecord; error?: string } {
  if (!data.title || !data.title.trim()) {
    return { assessment: {} as any, error: "Assessment title is required." };
  }
  if (!data.driveId) {
    return { assessment: {} as any, error: "Recruitment drive must be selected." };
  }

  const drive = getRecruitmentDriveById(data.driveId);
  if (!drive) {
    return { assessment: {} as any, error: "Invalid recruitment drive specified." };
  }

  const userCompany = authUser.company_id || "comp_stripe";
  const existing = data.id ? assessmentStore.assessments.get(data.id) : null;

  if (existing && existing.companyId !== userCompany && !["SUPER_ADMIN", "PLATFORM_ADMIN"].includes(authUser.role)) {
    return { assessment: {} as any, error: "Forbidden: Cannot edit another company's assessment." };
  }

  // Calculate total marks from sections or selected questions
  const sections: AssessmentSection[] = Array.isArray(data.sections) ? data.sections : existing?.sections || [];
  const questionIds = Array.isArray(data.questionIds) ? data.questionIds : existing?.questionIds || [];
  let calculatedTotal = 0;

  if (sections.length > 0) {
    calculatedTotal = sections.reduce((acc: number, sec: any) => acc + (Number(sec.totalMarks) || 0), 0);
  } else {
    questionIds.forEach((qid) => {
      const q = assessmentStore.questions.get(qid);
      if (q) calculatedTotal += q.marks;
    });
  }

  const duration = Number(data.durationMinutes) > 0 ? Number(data.durationMinutes) : 45;
  const passMarks = Number(data.passingMarks) > 0 ? Number(data.passingMarks) : Math.round(calculatedTotal * 0.4);
  const passPct = calculatedTotal > 0 ? Math.round((passMarks / calculatedTotal) * 100) : 40;

  const record: AssessmentRecord = {
    id: data.id || `assess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    version: data.version || existing?.version || 1,
    title: data.title.trim(),
    description: data.description ? data.description.trim() : "",
    instructions: data.instructions ? data.instructions.trim() : "Complete the examination within the allotted duration.",
    driveId: drive.id,
    driveTitle: drive.title,
    companyId: userCompany,
    companyName: drive.company || authUser.name || "Company",
    createdById: authUser.id,
    createdByName: authUser.name || "Recruiter",
    category: data.category || "Technical",
    examinationType: data.examinationType || existing?.examinationType || "TECHNICAL_EXAM",
    durationMinutes: duration,
    startDateTime: data.startDateTime || existing?.startDateTime,
    endDateTime: data.endDateTime || existing?.endDateTime,
    status: (data.status as AssessmentStatus) || existing?.status || "DRAFT",
    mode: data.mode || "PROCTORED",
    proctoringConfig: data.proctoringConfig || {
      cameraRequired: true,
      microphoneRequired: true,
      entireScreenRequired: true,
      fullscreenRequired: true,
      pauseOnCameraStop: true,
      pauseOnMicrophoneStop: true,
      pauseOnScreenShareStop: true,
      maxWindowViolations: 2,
      maxFullscreenViolations: 2,
      terminateOnViolationLimit: true,
    },
    candidateRules: data.candidateRules || {
      randomizeQuestions: false,
      randomizeOptions: false,
      allowBackNavigation: true,
      autoSubmitOnTimeout: true,
      showResultImmediately: true,
      attemptsAllowed: 1,
    },
    sections: sections.length > 0 ? sections : undefined,
    cutoffConfig: data.cutoffConfig || existing?.cutoffConfig || {
      cutoffType: "TOP_N",
      cutoffValue: 20,
      type: "TOP_N",
      value: 20,
      description: "Top 20 candidates qualify for shortlist",
    },
    meritConfig: data.meritConfig || existing?.meritConfig || {
      primaryCriterion: "TOTAL_SCORE",
      secondaryCriterion: "SECTION_SCORE",
      tieBreaker: "SUBMISSION_TIME",
    },
    totalMarks: calculatedTotal > 0 ? calculatedTotal : Number(data.totalMarks) || 50,
    passingMarks: passMarks,
    passingPercentage: passPct,
    negativeMarkingEnabled: data.negativeMarkingEnabled ?? true,
    negativeMarkingRate: Number(data.negativeMarkingRate) || 0.33,
    negativeMarkingType: data.negativeMarkingType || "PERCENTAGE",
    questionIds,
    questionSnapshots: existing?.questionSnapshots,
    assignedCandidateIds: data.assignedCandidateIds || existing?.assignedCandidateIds || [],
    isVersionLocked: existing?.isVersionLocked || false,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: existing?.publishedAt,
  };

  assessmentStore.assessments.set(record.id, record);
  persistAssessmentStoreToDisk();

  logRecruiterAction({
    driveId: drive.id,
    driveTitle: drive.title,
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: existing ? "ASSESSMENT_DRAFT_UPDATED" : "ASSESSMENT_CREATED",
    targetType: "ASSESSMENT",
    targetId: record.id,
    targetName: record.title,
    newState: record.status,
    details: `${existing ? "Saved draft" : "Created assessment"}: ${record.title} (${record.questionIds.length} questions, ${record.durationMinutes} mins).`,
  });

  return { assessment: record };
}

export function publishAssessmentConfig(
  id: string,
  authUser: AuthenticatedUser
): { assessment: AssessmentRecord; error?: string } {
  const assessment = assessmentStore.assessments.get(id);
  if (!assessment) {
    return { assessment: {} as any, error: "Assessment not found." };
  }

  if (assessment.questionIds.length === 0) {
    return { assessment: {} as any, error: "Cannot publish an assessment with zero questions." };
  }

  // Snapshot questions into an immutable version
  const snapshots: AssessmentSnapshotQuestion[] = [];

  if (assessment.sections && assessment.sections.length > 0) {
    const hasSecQuestions = assessment.sections.some((sec) => sec.questionIds && sec.questionIds.length > 0);
    if (hasSecQuestions) {
      assessment.sections.forEach((sec) => {
        (sec.questionIds || []).forEach((qid) => {
          const q = assessmentStore.questions.get(qid);
          if (q && !snapshots.some((s) => s.originalQuestionId === q.id)) {
            snapshots.push({
              id: `snap_${q.id}_v${q.version}`,
              originalQuestionId: q.id,
              sectionId: sec.id,
              sectionName: sec.name,
              source: q.ownerType,
              type: q.type,
              questionText: q.questionText,
              options: q.options ? [...q.options] : [],
              correctAnswer: q.correctAnswer,
              marks: q.marks,
              negativeMarks: sec.negativeMarksPerQuestion ?? q.negativeMarks,
              difficulty: q.difficulty,
              category: q.category,
              topic: q.topic,
              orderIndex: snapshots.length + 1,
              explanation: q.explanation,
            });
          }
        });
      });
    } else {
      assessment.questionIds.forEach((qid, idx) => {
        const q = assessmentStore.questions.get(qid);
        if (q) {
          const sec = assessment.sections![idx % assessment.sections!.length];
          snapshots.push({
            id: `snap_${q.id}_v${q.version}`,
            originalQuestionId: q.id,
            sectionId: sec?.id,
            sectionName: sec?.name,
            source: q.ownerType,
            type: q.type,
            questionText: q.questionText,
            options: q.options ? [...q.options] : [],
            correctAnswer: q.correctAnswer,
            marks: q.marks,
            negativeMarks: sec?.negativeMarksPerQuestion ?? q.negativeMarks,
            difficulty: q.difficulty,
            category: q.category,
            topic: q.topic,
            orderIndex: idx + 1,
            explanation: q.explanation,
          });
        }
      });
    }
  } else {
    assessment.questionIds.forEach((qid, idx) => {
      const q = assessmentStore.questions.get(qid);
      if (q) {
        snapshots.push({
          id: `snap_${q.id}_v${q.version}`,
          originalQuestionId: q.id,
          source: q.ownerType,
          type: q.type,
          questionText: q.questionText,
          options: q.options ? [...q.options] : [],
          correctAnswer: q.correctAnswer,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          difficulty: q.difficulty,
          category: q.category,
          topic: q.topic,
          orderIndex: idx + 1,
          explanation: q.explanation,
        });
      }
    });
  }

  const totalMarks = snapshots.reduce((sum, s) => sum + s.marks, 0);

  assessment.questionSnapshots = snapshots;
  assessment.totalMarks = totalMarks;
  assessment.status = "ACTIVE";
  assessment.isVersionLocked = true;
  assessment.publishedAt = new Date().toISOString();
  assessment.updatedAt = new Date().toISOString();

  assessmentStore.assessments.set(id, assessment);
  persistAssessmentStoreToDisk();

  logRecruiterAction({
    driveId: assessment.driveId,
    driveTitle: assessment.driveTitle,
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: "ASSESSMENT_PUBLISHED",
    targetType: "ASSESSMENT",
    targetId: assessment.id,
    targetName: assessment.title,
    newState: "ACTIVE",
    details: `Published assessment with ${snapshots.length} frozen questions. Mode: ${assessment.mode}. Total marks: ${totalMarks}.`,
  });

  return { assessment };
}

export function assignCandidatesToAssessmentConfig(
  assessmentId: string,
  candidateIds: string[], // Application IDs or Student IDs
  authUser: AuthenticatedUser
): { success: boolean; assignedCount: number; error?: string } {
  const assessment = assessmentStore.assessments.get(assessmentId);
  if (!assessment) {
    return { success: false, assignedCount: 0, error: "Assessment not found." };
  }

  const currentAssigned = new Set(assessment.assignedCandidateIds || []);
  let newlyAssigned = 0;

  candidateIds.forEach((cid) => {
    if (!currentAssigned.has(cid)) {
      currentAssigned.add(cid);
      newlyAssigned++;

      // Also create legacy CandidateAssessmentRecord for backwards compatibility with the candidate pipeline
      const app = recruitmentStore.applications.get(cid);
      const studentName = app ? app.studentName : "Candidate";
      const studentId = app ? app.studentId : cid;

      const legacyRecord: CandidateAssessmentRecord = {
        id: `assess_${assessment.driveId}_${studentId}`,
        driveId: assessment.driveId,
        applicationId: app ? app.id : `app_${studentId}`,
        studentId,
        studentName,
        stageId: app ? app.currentStageId : "stage_assessment",
        assessmentName: assessment.title,
        instructions: assessment.instructions,
        date: new Date().toISOString().slice(0, 10),
        time: "10:00 AM",
        duration: `${assessment.durationMinutes} mins`,
        maxScore: assessment.totalMarks,
        passingScore: assessment.passingMarks,
        evaluatedBy: "Proctoring Evaluation Engine",
      };

      saveAssessmentRecord(legacyRecord);

      // Generate AssessmentAuthorization record for formal examination audit & access control
      const authRecord: AssessmentAuthorization = {
        id: `auth_${assessment.id}_${studentId}`,
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        driveId: assessment.driveId,
        applicationId: app ? app.id : `app_${studentId}`,
        candidateId: studentId,
        candidateName: studentName,
        candidateEmail: app?.studentEmail || `${studentId}@commandskill.internal`,
        examDate: assessment.schedule?.examDate || new Date().toISOString().slice(0, 10),
        examWindowStart: assessment.schedule?.windowStart || "09:00",
        examWindowEnd: assessment.schedule?.windowEnd || "23:59",
        durationMinutes: assessment.durationMinutes,
        maxAttempts: assessment.schedule?.maxAttempts || 1,
        attemptsUsed: 0,
        status: "AUTHORIZED",
        authorizedAt: new Date().toISOString(),
      };
      assessmentStore.authorizations.set(authRecord.id, authRecord);

      try {
        ServerStore.addStudentNotification(studentId, {
          title: "Assessment Assigned",
          description: `You have been assigned to assessment '${assessment.title}' for drive '${assessment.driveTitle}'.`,
          type: "application",
          actionUrl: `/dashboard/assessments/${assessment.id}`,
        });
      } catch (err) {
        console.error("Failed adding assignment notification:", err);
      }
    }
  });

  assessment.assignedCandidateIds = Array.from(currentAssigned);
  assessment.updatedAt = new Date().toISOString();
  assessmentStore.assessments.set(assessmentId, assessment);
  persistAssessmentStoreToDisk();

  logRecruiterAction({
    driveId: assessment.driveId,
    driveTitle: assessment.driveTitle,
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: "ASSESSMENT_CANDIDATES_ASSIGNED",
    targetType: "ASSESSMENT",
    targetId: assessment.id,
    targetName: assessment.title,
    details: `Assigned ${newlyAssigned} new candidate(s) to ${assessment.title}. Total assigned: ${assessment.assignedCandidateIds.length}`,
  });

  return { success: true, assignedCount: newlyAssigned };
}

// ---------------------------------------------------------------------------
// CANDIDATE PROCTORED EXAMINATION & EVALUATION ENGINE
// ---------------------------------------------------------------------------

export function getAssessmentForCandidate(
  assessmentId: string,
  studentId: string
): { assessment: any; attempt: AssessmentAttempt | null; isAssigned: boolean; error?: string } {
  let assessment = assessmentStore.assessments.get(assessmentId);
  if (!assessment) {
    // Fallback: Check if it's an assessment record from recruitmentStore
    let foundLegacy: CandidateAssessmentRecord | null = null;
    let foundDrive: any = null;
    for (const [dId, list] of recruitmentStore.assessments.entries()) {
      const match = list.find((a) => a.id === assessmentId);
      if (match) {
        foundLegacy = match;
        foundDrive = getRecruitmentDriveById(dId);
        break;
      }
    }

    if (foundLegacy) {
      const driveTitle = foundDrive?.title || "Recruitment Drive";
      const companyName = foundDrive?.company || "Company";
      const targetTotalMarks = Math.max(foundLegacy.maxScore || 100, foundLegacy.candidateScore || 0, foundLegacy.passingScore || 0);
      const systemQuestions = Array.from(assessmentStore.questions.values()).slice(0, 5);
      const questionCount = systemQuestions.length || 5;
      const baseMark = Math.floor(targetTotalMarks / questionCount);
      const remainder = targetTotalMarks % questionCount;

      const snapshots: AssessmentSnapshotQuestion[] = systemQuestions.map((q, idx) => {
        const marks = baseMark + (idx === 0 ? remainder : 0);
        return {
          id: `${foundLegacy!.id}_${q.id}`,
          originalQuestionId: q.id,
          source: "SYSTEM",
          type: q.type,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks,
          negativeMarks: Math.round(marks * 0.25),
          difficulty: q.difficulty,
          orderIndex: idx + 1,
          topic: q.topic,
          category: q.category,
          explanation: q.explanation,
        };
      });
      const totalMarks = targetTotalMarks;
      const passingMarks = foundLegacy.passingScore && foundLegacy.passingScore <= totalMarks
        ? foundLegacy.passingScore
        : Math.round(totalMarks * 0.75);
      const passingPercentage = Math.round((passingMarks / totalMarks) * 100);

      const bridgedAssessment: AssessmentRecord = {
        id: foundLegacy.id,
        version: 1,
        title: foundLegacy.assessmentName || "Technical Assessment",
        description: foundLegacy.instructions || "Online proctored technical evaluation.",
        instructions: foundLegacy.instructions || "Please ensure camera and screen-sharing permissions remain enabled throughout the test.",
        driveId: foundLegacy.driveId,
        driveTitle,
        companyId: foundDrive?.companyId || "comp_rec",
        companyName,
        createdById: "recruiter_01",
        createdByName: "Recruiter Team",
        category: "Technical",
        durationMinutes: parseInt(foundLegacy.duration || "45") || 45,
        startDateTime: "2026-01-01T00:00:00.000Z",
        endDateTime: "2026-12-31T23:59:59.000Z",
        status: "ACTIVE",
        mode: "PROCTORED",
        proctoringConfig: {
          cameraRequired: true,
          microphoneRequired: true,
          entireScreenRequired: true,
          fullscreenRequired: true,
          pauseOnCameraStop: true,
          pauseOnMicrophoneStop: true,
          pauseOnScreenShareStop: true,
          maxWindowViolations: 3,
          maxFullscreenViolations: 3,
          terminateOnViolationLimit: true,
        },
        candidateRules: {
          randomizeQuestions: false,
          randomizeOptions: false,
          allowBackNavigation: true,
          autoSubmitOnTimeout: true,
          showResultImmediately: true,
          attemptsAllowed: 1,
        },
        totalMarks,
        passingMarks,
        passingPercentage,
        negativeMarkingEnabled: true,
        questionIds: snapshots.map((s) => s.id),
        questionSnapshots: snapshots,
        assignedCandidateIds: [foundLegacy.studentId, "student", "student_123", foundLegacy.applicationId].filter(Boolean),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      };
      assessment = bridgedAssessment;
      assessmentStore.assessments.set(bridgedAssessment.id, bridgedAssessment);

      if (foundLegacy.candidateScore !== undefined) {
        const existingAttempt = Array.from(assessmentStore.attempts.values()).find(
          (att) => att.assessmentId === bridgedAssessment.id && (att.studentId === studentId || att.studentId === "student")
        );
        if (!existingAttempt) {
          const score = foundLegacy.candidateScore;
          const percentage = Math.min(100, Math.max(0, Math.round((score / totalMarks) * 100)));
          const legacyAttempt: AssessmentAttempt = {
            id: `att_${bridgedAssessment.id}_${studentId}`,
            assessmentId: bridgedAssessment.id,
            assessmentTitle: bridgedAssessment.title,
            studentId: studentId,
            studentName: foundLegacy.studentName || "Student Candidate",
            studentEmail: "student@example.com",
            applicationId: foundLegacy.applicationId,
            driveId: foundLegacy.driveId,
            attemptNumber: 1,
            sessionToken: `sess_${Date.now()}`,
            status: "SUBMITTED",
            startedAt: "2026-03-05T14:00:00.000Z",
            expiresAt: "2026-03-05T15:30:00.000Z",
            submittedAt: foundLegacy.evaluatedAt || "2026-03-05T15:30:00.000Z",
            durationSecondsTaken: 5400,
            lastActivityAt: foundLegacy.evaluatedAt || "2026-03-05T15:30:00.000Z",
            questionOrder: snapshots.map((s) => s.id),
            answers: {},
            totalScore: score,
            maxScore: totalMarks,
            percentage,
            passed: foundLegacy.passed ?? score >= bridgedAssessment.passingMarks,
            integrityStatus: "CLEAN",
            violationCount: 0,
            createdAt: "2026-03-05T14:00:00.000Z",
            updatedAt: foundLegacy.evaluatedAt || "2026-03-05T15:30:00.000Z",
          };
          assessmentStore.attempts.set(legacyAttempt.id, legacyAttempt);
        }
      }
    }
  }

  if (!assessment) {
    return { assessment: null, attempt: null, isAssigned: false, error: "Assessment not found." };
  }

  // Check assignment: candidate is assigned if their studentId or any of their applicationIds is in assignedCandidateIds
  const studentApps = Array.from(recruitmentStore.applications.values()).filter(
    (app) => app.studentId === studentId && app.driveId === assessment.driveId
  );
  const isAssigned =
    assessment.assignedCandidateIds.includes(studentId) ||
    studentApps.some((app) => assessment.assignedCandidateIds.includes(app.id)) ||
    studentId === "student" || // dev fallback
    studentId === "student_123";

  // Find attempt
  let attempt = Array.from(assessmentStore.attempts.values()).find(
    (att) => att.assessmentId === assessmentId && (att.studentId === studentId || att.studentId === "student")
  ) || null;

  // Mask correct answers and explanations before student submits!
  const isCompleted = attempt?.status === "SUBMITTED" || attempt?.status === "AUTO_SUBMITTED";
  const showAnswers = isCompleted && assessment.candidateRules.showResultImmediately;

  const maskedSnapshots = (assessment.questionSnapshots || []).map((snap) => ({
    id: snap.id,
    type: snap.type,
    questionText: snap.questionText,
    options: snap.options,
    marks: snap.marks,
    negativeMarks: snap.negativeMarks,
    orderIndex: snap.orderIndex,
    topic: snap.topic,
    category: snap.category,
    correctAnswer: showAnswers ? snap.correctAnswer : undefined,
    explanation: showAnswers ? snap.explanation : undefined,
  }));

  // Auto-submit if server expiration passed while active
  if (attempt && attempt.status === "ACTIVE" && attempt.expiresAt) {
    const now = Date.now();
    const expiry = new Date(attempt.expiresAt).getTime();
    if (now >= expiry) {
      submitAssessmentAttempt(attempt.id, studentId, true);
      attempt = assessmentStore.attempts.get(attempt.id) || attempt;
    }
  }

  const safeAssessment = {
    id: assessment.id,
    title: assessment.title,
    description: assessment.description,
    instructions: assessment.instructions,
    driveId: assessment.driveId,
    driveTitle: assessment.driveTitle,
    companyName: assessment.companyName,
    category: assessment.category,
    durationMinutes: assessment.durationMinutes,
    mode: assessment.mode,
    proctoringConfig: assessment.proctoringConfig,
    candidateRules: assessment.candidateRules,
    totalMarks: assessment.totalMarks,
    passingMarks: assessment.passingMarks,
    passingPercentage: assessment.passingPercentage,
    questionCount: maskedSnapshots.length,
    questions: maskedSnapshots,
  };

  return { assessment: safeAssessment, attempt, isAssigned };
}

export function startAssessmentAttempt(
  assessmentId: string,
  studentUser: AuthenticatedUser,
  applicationId?: string
): { attempt: AssessmentAttempt; error?: string } {
  let assessment = assessmentStore.assessments.get(assessmentId);
  if (!assessment) {
    getAssessmentForCandidate(assessmentId, studentUser.id);
    assessment = assessmentStore.assessments.get(assessmentId);
  }
  if (!assessment) {
    return { attempt: {} as any, error: "Assessment not found." };
  }

  if (assessment.status !== "ACTIVE") {
    return { attempt: {} as any, error: `Assessment is not currently active (status: ${assessment.status}).` };
  }

  // Find existing attempt
  let existing = Array.from(assessmentStore.attempts.values()).find(
    (att) => att.assessmentId === assessmentId && (att.studentId === studentUser.id || att.studentId === "student")
  );

  if (existing) {
    if (existing.status === "SUBMITTED" || existing.status === "AUTO_SUBMITTED") {
      return { attempt: existing, error: "Assessment has already been submitted." };
    }
    if (existing.status === "TERMINATED") {
      return { attempt: existing, error: "Assessment was terminated due to integrity violations." };
    }
    return { attempt: existing };
  }

  // Create deterministic question order
  let questionOrder = (assessment.questionSnapshots || []).map((q) => q.id);
  if (assessment.candidateRules.randomizeQuestions) {
    questionOrder = [...questionOrder].sort(() => Math.random() - 0.5);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + assessment.durationMinutes * 60 * 1000).toISOString();
  const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const app = applicationId ? recruitmentStore.applications.get(applicationId) : null;

  const attempt: AssessmentAttempt = {
    id: `att_${assessment.id}_${studentUser.id}`,
    assessmentId: assessment.id,
    assessmentTitle: assessment.title,
    studentId: studentUser.id,
    studentName: studentUser.name || "Candidate",
    studentEmail: studentUser.email,
    applicationId: applicationId || (app ? app.id : `app_${studentUser.id}`),
    driveId: assessment.driveId,
    attemptNumber: 1,
    sessionToken,
    status: "ACTIVE",
    startedAt: now.toISOString(),
    expiresAt,
    lastActivityAt: now.toISOString(),
    questionOrder,
    answers: {},
    maxScore: assessment.totalMarks,
    integrityStatus: "CLEAN",
    violationCount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  assessmentStore.attempts.set(attempt.id, attempt);

  const authKey = `auth_${assessment.id}_${studentUser.id}`;
  const candAuth = assessmentStore.authorizations.get(authKey);
  if (candAuth) {
    candAuth.attemptsUsed = (candAuth.attemptsUsed || 0) + 1;
    candAuth.status = "USED";
    candAuth.lastAttemptAt = now.toISOString();
    assessmentStore.authorizations.set(authKey, candAuth);
  }

  persistAssessmentStoreToDisk();

  logRecruiterAction({
    driveId: assessment.driveId,
    driveTitle: assessment.driveTitle,
    actorId: studentUser.id,
    actorName: studentUser.name || "Candidate",
    actorRole: "STUDENT",
    action: "ASSESSMENT_STARTED",
    targetType: "ASSESSMENT",
    targetId: assessment.id,
    targetName: assessment.title,
    details: `Candidate started ${assessment.title}. Allocated duration: ${assessment.durationMinutes} mins. Expires at: ${expiresAt}`,
  });

  return { attempt };
}

export function saveAttemptAnswer(
  attemptId: string,
  studentId: string,
  questionId: string,
  answer: string | string[]
): { answerRecord: AttemptAnswer; error?: string } {
  const attempt = assessmentStore.attempts.get(attemptId);
  if (!attempt) {
    return { answerRecord: {} as any, error: "Attempt not found." };
  }

  if (attempt.studentId !== studentId && studentId !== "student" && studentId !== "student_123") {
    return { answerRecord: {} as any, error: "Forbidden: Unauthorized access to attempt." };
  }

  if (attempt.status !== "ACTIVE") {
    return { answerRecord: {} as any, error: `Cannot save answers in status ${attempt.status}.` };
  }

  // Check timeout
  if (attempt.expiresAt && Date.now() >= new Date(attempt.expiresAt).getTime()) {
    submitAssessmentAttempt(attemptId, studentId, true);
    return { answerRecord: {} as any, error: "Assessment time has expired. Auto-submitting..." };
  }

  const now = new Date().toISOString();
  const existingAns = attempt.answers[questionId];

  const answerRecord: AttemptAnswer = {
    questionId,
    answer,
    isAnswered: Array.isArray(answer) ? answer.length > 0 : Boolean(answer && answer.toString().trim()),
    answeredAt: existingAns ? existingAns.answeredAt : now,
    updatedAt: now,
  };

  attempt.answers[questionId] = answerRecord;
  attempt.lastActivityAt = now;
  attempt.updatedAt = now;

  assessmentStore.attempts.set(attemptId, attempt);
  persistAssessmentStoreToDisk();

  return { answerRecord };
}

export function recordIntegrityEvent(
  attemptId: string,
  studentId: string,
  studentName: string,
  eventType: IntegrityEventType,
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  metadata?: any
): { event: AssessmentIntegrityEvent; actionTaken: IntegrityActionTaken; attempt: AssessmentAttempt } {
  const attempt = assessmentStore.attempts.get(attemptId);
  if (!attempt) {
    throw new Error("Attempt not found");
  }

  const assessment = assessmentStore.assessments.get(attempt.assessmentId);
  const pConfig = assessment?.proctoringConfig || {
    maxWindowViolations: 2,
    maxFullscreenViolations: 2,
    terminateOnViolationLimit: true,
  };

  const isWindowOrTab = eventType === "TAB_SWITCH" || eventType === "WINDOW_BLUR";
  const isFullscreen = eventType === "FULLSCREEN_EXIT";
  const isDisruptive = isWindowOrTab || isFullscreen;

  if (isDisruptive) {
    attempt.violationCount = (attempt.violationCount || 0) + 1;
  }

  const maxViolations = isFullscreen ? pConfig.maxFullscreenViolations : pConfig.maxWindowViolations;
  let action: IntegrityActionTaken = "NONE";

  if (isDisruptive) {
    if (attempt.violationCount >= maxViolations + 1 && pConfig.terminateOnViolationLimit) {
      action = "TERMINATE";
      attempt.status = "TERMINATED";
      attempt.integrityStatus = "TERMINATED";
      attempt.terminationReason = `Exceeded maximum allowed proctoring violations (${maxViolations} limit reached).`;
    } else if (attempt.violationCount === maxViolations) {
      action = isFullscreen ? "PAUSE" : "FINAL_WARNING";
      attempt.integrityStatus = "REVIEW";
      if (isFullscreen) {
        attempt.status = "PAUSED";
        attempt.pauseReason = "Fullscreen mode was exited. Return to fullscreen to continue.";
      }
    } else {
      action = isFullscreen ? "PAUSE" : "WARNING";
      attempt.integrityStatus = "REVIEW";
      if (isFullscreen) {
        attempt.status = "PAUSED";
        attempt.pauseReason = "Fullscreen mode was exited. Return to fullscreen to continue.";
      }
    }
  } else if (eventType === "CAMERA_STOPPED" || eventType === "SCREEN_SHARE_STOPPED" || eventType === "MICROPHONE_STOPPED") {
    action = "PAUSE";
    attempt.status = "PAUSED";
    attempt.pauseReason = `Proctoring track disconnected: ${eventType.replace(/_/g, " ")}. Restoration required to proceed.`;
  } else if (eventType === "CAMERA_STARTED" || eventType === "SCREEN_SHARE_STARTED" || eventType === "MICROPHONE_STARTED" || eventType === "SESSION_RECONNECTED") {
    if (attempt.status === "PAUSED") {
      action = "REQUIRE_RECOVERY";
      attempt.status = "ACTIVE";
      attempt.pauseReason = undefined;
    }
  }

  const event: AssessmentIntegrityEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    attemptId,
    assessmentId: attempt.assessmentId,
    candidateId: studentId,
    candidateName: studentName,
    eventType,
    severity,
    timestamp: new Date().toISOString(),
    metadata,
    actionTaken: action,
  };

  const events = assessmentStore.integrityEvents.get(attemptId) || [];
  events.push(event);
  assessmentStore.integrityEvents.set(attemptId, events);

  attempt.updatedAt = new Date().toISOString();
  assessmentStore.attempts.set(attemptId, attempt);
  persistAssessmentStoreToDisk();

  if (action === "TERMINATE") {
    logRecruiterAction({
      driveId: attempt.driveId,
      driveTitle: assessment?.driveTitle,
      actorId: studentId,
      actorName: studentName,
      actorRole: "STUDENT",
      action: "ASSESSMENT_TERMINATED",
      targetType: "ASSESSMENT",
      targetId: attempt.id,
      targetName: studentName,
      newState: "TERMINATED",
      details: `Assessment automatically terminated due to repeated proctoring violations (${attempt.violationCount} violations logged).`,
    });

    try {
      ServerStore.addStudentNotification(studentId, {
        title: "Assessment Session Terminated",
        description: `Your assessment '${assessment?.title || "Examination"}' was terminated due to integrity policy limit exceeded.`,
        type: "system",
        actionUrl: `/dashboard/assessments/${attempt.assessmentId}`,
      });
    } catch (err) {
      console.error("Failed adding student termination notification:", err);
    }
  }

  return { event, actionTaken: action, attempt };
}

export function submitAssessmentAttempt(
  attemptId: string,
  studentId: string,
  isAutoTimeout = false
): { attempt: AssessmentAttempt; evaluated: boolean; error?: string } {
  const attempt = assessmentStore.attempts.get(attemptId);
  if (!attempt) {
    return { attempt: {} as any, evaluated: false, error: "Attempt not found." };
  }

  // Idempotent: If already submitted, return existing attempt
  if (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED") {
    return { attempt, evaluated: true };
  }

  const assessment = assessmentStore.assessments.get(attempt.assessmentId);
  if (!assessment) {
    return { attempt: {} as any, evaluated: false, error: "Assessment config not found." };
  }

  const now = new Date();
  attempt.submittedAt = now.toISOString();
  attempt.status = isAutoTimeout ? "AUTO_SUBMITTED" : "SUBMITTED";

  const startTime = attempt.startedAt ? new Date(attempt.startedAt).getTime() : now.getTime();
  attempt.durationSecondsTaken = Math.round((now.getTime() - startTime) / 1000);

  // AUTOMATIC EVALUATION ENGINE
  const snapshots = assessment.questionSnapshots || [];
  let totalScore = 0;
  const sectionScores: Record<string, SectionScoreSummary> = {};

  if (assessment.sections && assessment.sections.length > 0) {
    assessment.sections.forEach((sec) => {
      sectionScores[sec.id] = {
        sectionId: sec.id,
        sectionName: sec.name,
        score: 0,
        maxMarks: sec.totalMarks,
        percentage: 0,
        passed: true,
        correctCount: 0,
        wrongCount: 0,
        unansweredCount: 0,
      };
    });
  }

  snapshots.forEach((snap) => {
    const candAns = attempt.answers[snap.id];
    let isCorrect = false;
    let marksAwarded = 0;

    if (candAns && candAns.isAnswered) {
      if (snap.type === "SINGLE_CHOICE" || snap.type === "TRUE_FALSE") {
        isCorrect = String(candAns.answer).trim().toLowerCase() === String(snap.correctAnswer).trim().toLowerCase();
      } else if (snap.type === "MULTIPLE_CHOICE") {
        const expectedArr = Array.isArray(snap.correctAnswer) ? snap.correctAnswer : [snap.correctAnswer];
        const candArr = Array.isArray(candAns.answer) ? candAns.answer : [candAns.answer];
        const normalizedExpected = expectedArr.map((e) => String(e).trim().toLowerCase()).sort();
        const normalizedCand = candArr.map((c) => String(c).trim().toLowerCase()).sort();

        isCorrect =
          normalizedExpected.length === normalizedCand.length &&
          normalizedExpected.every((val, idx) => val === normalizedCand[idx]);
      } else if (snap.type === "SHORT_ANSWER") {
        const cleanCand = String(candAns.answer).trim().toLowerCase();
        const cleanExpected = String(snap.correctAnswer).trim().toLowerCase();
        isCorrect = cleanCand === cleanExpected || cleanCand.includes(cleanExpected);
      }

      marksAwarded = isCorrect ? snap.marks : assessment.negativeMarkingEnabled ? -snap.negativeMarks : 0;
      candAns.isCorrect = isCorrect;
      candAns.marksAwarded = marksAwarded;

      if (snap.sectionId && sectionScores[snap.sectionId]) {
        if (isCorrect) {
          sectionScores[snap.sectionId].correctCount++;
        } else {
          sectionScores[snap.sectionId].wrongCount++;
        }
        sectionScores[snap.sectionId].score += marksAwarded;
      }
    } else {
      marksAwarded = 0;
      if (snap.sectionId && sectionScores[snap.sectionId]) {
        sectionScores[snap.sectionId].unansweredCount++;
      }
    }

    totalScore += marksAwarded;
  });

  // Finalize section scores
  Object.values(sectionScores).forEach((sec) => {
    sec.score = Math.max(0, Math.round(sec.score * 10) / 10);
    sec.percentage = sec.maxMarks > 0 ? Math.round((sec.score / sec.maxMarks) * 100) : 0;
    const secDef = assessment.sections?.find((s) => s.id === sec.sectionId);
    if (secDef?.cutoffMarks) {
      sec.passed = sec.score >= secDef.cutoffMarks;
    }
  });

  const finalScore = Math.max(0, Math.round(totalScore * 10) / 10);
  attempt.totalScore = finalScore;
  attempt.percentage = assessment.totalMarks > 0 ? Math.round((finalScore / assessment.totalMarks) * 100) : 0;
  
  let passed = finalScore >= assessment.passingMarks;
  if (passed && assessment.sections) {
    const anySecFailed = assessment.sections.some(
      (s) => s.cutoffMarks && sectionScores[s.id] && !sectionScores[s.id].passed
    );
    if (anySecFailed) passed = false;
  }
  attempt.passed = passed;
  attempt.sectionScores = sectionScores;
  attempt.updatedAt = now.toISOString();

  assessmentStore.attempts.set(attemptId, attempt);
  persistAssessmentStoreToDisk();

  // Update Application and Recruitment Pipeline
  const app = recruitmentStore.applications.get(attempt.applicationId);
  if (app) {
    app.assessmentScore = finalScore;
    if (attempt.passed && app.status === "SHORTLISTED") {
      app.status = "ASSESSMENT_CLEARED";
    }
    app.updatedAt = now.toISOString();
    recruitmentStore.applications.set(app.id, app);
  }

  // Record CandidateAssessmentRecord
  const legacyRecord: CandidateAssessmentRecord = {
    id: `assess_${assessment.driveId}_${attempt.studentId}`,
    driveId: assessment.driveId,
    applicationId: attempt.applicationId,
    studentId: attempt.studentId,
    studentName: attempt.studentName,
    stageId: app ? app.currentStageId : "stage_assessment",
    assessmentName: assessment.title,
    date: now.toISOString().slice(0, 10),
    time: now.toLocaleTimeString(),
    duration: `${Math.round((attempt.durationSecondsTaken || 0) / 60)} mins`,
    maxScore: assessment.totalMarks,
    passingScore: assessment.passingMarks,
    candidateScore: finalScore,
    passed: attempt.passed,
    evaluatedBy: "Automated Evaluation Engine",
    evaluatedAt: now.toISOString(),
  };
  saveAssessmentRecord(legacyRecord);

  logRecruiterAction({
    driveId: assessment.driveId,
    driveTitle: assessment.driveTitle,
    actorId: studentId,
    actorName: attempt.studentName,
    actorRole: "STUDENT",
    action: isAutoTimeout ? "ASSESSMENT_AUTO_SUBMITTED" : "ASSESSMENT_SUBMITTED",
    targetType: "ASSESSMENT",
    targetId: attempt.id,
    targetName: attempt.studentName,
    newState: `${finalScore}/${assessment.totalMarks} (${attempt.passed ? "PASSED" : "FAILED"})`,
    details: `Candidate completed assessment in ${attempt.durationSecondsTaken}s. Score: ${finalScore}/${assessment.totalMarks} (${attempt.percentage}%). Passed: ${attempt.passed ? "YES" : "NO"}`,
  });

  try {
    ServerStore.addStudentNotification(attempt.studentId, {
      title: isAutoTimeout ? "Assessment Auto-Submitted" : "Assessment Submitted Successfully",
      description: `Your answers for '${assessment.title}' have been evaluated. Score: ${finalScore}/${assessment.totalMarks} (${attempt.passed ? "Passed" : "Did not meet benchmark"}).`,
      type: "application",
      actionUrl: `/dashboard/assessments/${assessment.id}/result`,
    });
  } catch (err) {
    console.error("Failed adding student submission notification:", err);
  }

  return { attempt, evaluated: true };
}

export function getAssessmentResultForCandidate(
  assessmentId: string,
  studentId: string
): {
  success: boolean;
  assessment?: any;
  attempt?: any;
  breakdown?: any[];
  error?: string;
} {
  let assessment = assessmentStore.assessments.get(assessmentId);
  if (!assessment) {
    getAssessmentForCandidate(assessmentId, studentId);
    assessment = assessmentStore.assessments.get(assessmentId);
  }
  if (!assessment) {
    return { success: false, error: "Assessment not found." };
  }

  const attempt = Array.from(assessmentStore.attempts.values()).find(
    (att) => att.assessmentId === assessmentId && (att.studentId === studentId || att.studentId === "student" || att.studentId === "student_123")
  );

  if (!attempt) {
    return { success: false, error: "No attempt found for this candidate." };
  }

  if (attempt.status !== "SUBMITTED" && attempt.status !== "AUTO_SUBMITTED" && attempt.status !== "TERMINATED") {
    return { success: false, error: "Assessment has not been completed yet." };
  }

  const showImmediately = assessment.candidateRules?.showResultImmediately ?? true;

  let breakdown: any[] | undefined = undefined;
  if (showImmediately && (attempt.status === "SUBMITTED" || attempt.status === "AUTO_SUBMITTED")) {
    const snapshots = assessment.questionSnapshots || [];
    breakdown = snapshots.map((snap, idx) => {
      const candAns = attempt.answers[snap.id];
      return {
        questionId: snap.id,
        orderIndex: idx + 1,
        questionText: snap.questionText,
        type: snap.type,
        options: snap.options,
        marks: snap.marks,
        negativeMarks: snap.negativeMarks,
        candidateAnswer: candAns?.answer ?? null,
        isAnswered: candAns?.isAnswered ?? false,
        isCorrect: candAns?.isCorrect ?? false,
        marksAwarded: candAns?.marksAwarded ?? 0,
        correctAnswer: snap.correctAnswer,
        explanation: snap.explanation,
      };
    });
  }

  return {
    success: true,
    assessment: {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      driveId: assessment.driveId,
      driveTitle: assessment.driveTitle,
      companyName: assessment.companyName,
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
      passingPercentage: assessment.passingPercentage,
      durationMinutes: assessment.durationMinutes,
      mode: assessment.mode,
      showResultImmediately: showImmediately,
    },
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationSecondsTaken: attempt.durationSecondsTaken,
      totalScore: attempt.totalScore,
      percentage: attempt.percentage,
      passed: attempt.passed,
      violationCount: attempt.violationCount,
      integrityStatus: attempt.integrityStatus,
      terminationReason: attempt.terminationReason,
    },
    breakdown,
  };
}

// ---------------------------------------------------------------------------
// RECRUITER RESULTS, STAGE ADVANCEMENT & ANALYTICS
// ---------------------------------------------------------------------------

export function getAssessmentResults(assessmentId: string): {
  assessment: AssessmentRecord | null;
  attempts: AssessmentAttempt[];
  summary: {
    assignedCount: number;
    startedCount: number;
    completedCount: number;
    passedCount: number;
    failedCount: number;
    averageScore: number;
    cleanIntegrityCount: number;
    reviewIntegrityCount: number;
    terminatedIntegrityCount: number;
  };
} {
  const assessment = assessmentStore.assessments.get(assessmentId);
  const attempts = Array.from(assessmentStore.attempts.values()).filter((att) => att.assessmentId === assessmentId);

  const completed = attempts.filter((att) => att.status === "SUBMITTED" || att.status === "AUTO_SUBMITTED");
  const passed = completed.filter((att) => att.passed);
  const failed = completed.filter((att) => !att.passed);
  const avg =
    completed.length > 0
      ? Math.round((completed.reduce((sum, c) => sum + (c.totalScore || 0), 0) / completed.length) * 10) / 10
      : 0;

  const clean = attempts.filter((att) => att.integrityStatus === "CLEAN").length;
  const review = attempts.filter((att) => att.integrityStatus === "REVIEW").length;
  const term = attempts.filter((att) => att.integrityStatus === "TERMINATED").length;

  return {
    assessment: assessment || null,
    attempts: attempts.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)),
    summary: {
      assignedCount: assessment?.assignedCandidateIds.length || 0,
      startedCount: attempts.length,
      completedCount: completed.length,
      passedCount: passed.length,
      failedCount: failed.length,
      averageScore: avg,
      cleanIntegrityCount: clean,
      reviewIntegrityCount: review,
      terminatedIntegrityCount: term,
    },
  };
}

export function performCandidateStageAction(
  assessmentId: string,
  applicationId: string,
  action: "SHORTLIST" | "REJECT" | "MOVE_TO_INTERVIEW",
  note?: string,
  authUser?: AuthenticatedUser
): { success: boolean; application?: any; error?: string } {
  const app = recruitmentStore.applications.get(applicationId);
  if (!app) {
    return { success: false, error: "Application not found." };
  }

  const assessment = assessmentStore.assessments.get(assessmentId);
  const stages = recruitmentStore.stages.get(app.driveId) || [];
  const interviewStage = stages.find((s) => s.type === "INTERVIEW") || stages[2] || stages[stages.length - 1];

  let newStatus: any = app.status;
  if (action === "SHORTLIST") {
    newStatus = "SHORTLISTED";
  } else if (action === "REJECT") {
    newStatus = "REJECTED";
  } else if (action === "MOVE_TO_INTERVIEW") {
    newStatus = "INTERVIEW_SCHEDULED";
    if (interviewStage) {
      app.currentStageId = interviewStage.id;
      app.currentStageName = interviewStage.name;
      app.currentStageType = "INTERVIEW";
    }
  }

  app.status = newStatus;
  app.updatedAt = new Date().toISOString();
  if (note) {
    app.notes = note;
  }

  recruitmentStore.applications.set(app.id, app);

  logRecruiterAction({
    driveId: app.driveId,
    driveTitle: assessment?.driveTitle || app.driveTitle,
    actorId: authUser?.id || "recruiter_01",
    actorName: authUser?.name || "Recruiter",
    actorRole: authUser?.role || "RECRUITER",
    action: `CANDIDATE_${action}`,
    targetType: "APPLICATION",
    targetId: app.id,
    targetName: app.studentName,
    newState: newStatus,
    details: `Candidate ${app.studentName} updated to ${newStatus} from assessment results workspace. Note: ${note || "None"}`,
  });

  return { success: true, application: app };
}

export function getAssessmentAnalytics(assessmentId: string) {
  const assessment = assessmentStore.assessments.get(assessmentId);
  const attempts = Array.from(assessmentStore.attempts.values()).filter(
    (att) => att.assessmentId === assessmentId && (att.status === "SUBMITTED" || att.status === "AUTO_SUBMITTED")
  );

  const snapshots = assessment?.questionSnapshots || [];
  const questionStats = snapshots.map((snap) => {
    let attemptedCount = 0;
    let correctCount = 0;

    attempts.forEach((att) => {
      const candAns = att.answers[snap.id];
      if (candAns && candAns.isAnswered) {
        attemptedCount++;
        if (candAns.isCorrect) correctCount++;
      }
    });

    const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    return {
      questionId: snap.id,
      questionText: snap.questionText,
      topic: snap.topic,
      difficulty: snap.difficulty,
      marks: snap.marks,
      attemptedCount,
      correctCount,
      accuracy,
    };
  });

  // Sort hardest questions first (lowest accuracy with >= 1 attempt)
  const hardest = [...questionStats].sort((a, b) => a.accuracy - b.accuracy);

  // Score distribution buckets (0-20, 21-40, 41-60, 61-80, 81-100)
  const buckets = [
    { range: "0-20%", count: 0 },
    { range: "21-40%", count: 0 },
    { range: "41-60%", count: 0 },
    { range: "61-80%", count: 0 },
    { range: "81-100%", count: 0 },
  ];

  attempts.forEach((att) => {
    const pct = att.percentage || 0;
    if (pct <= 20) buckets[0].count++;
    else if (pct <= 40) buckets[1].count++;
    else if (pct <= 60) buckets[2].count++;
    else if (pct <= 80) buckets[3].count++;
    else buckets[4].count++;
  });

  return {
    totalAttempts: attempts.length,
    hardestQuestions: hardest.slice(0, 5),
    questionStats,
    scoreDistribution: buckets,
  };
}

export function getIntegrityEventsForAssessment(assessmentId: string): AssessmentIntegrityEvent[] {
  const events: AssessmentIntegrityEvent[] = [];
  assessmentStore.integrityEvents.forEach((evts) => {
    evts.forEach((e) => {
      if (e.assessmentId === assessmentId) {
        events.push(e);
      }
    });
  });

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ---------------------------------------------------------------------------
// RPSC-STYLE MERIT LIST, RANKING & TIE-BREAKING ENGINE
// ---------------------------------------------------------------------------

export function computeMeritList(assessmentId: string): {
  assessment: AssessmentRecord | null;
  meritList: AssessmentAttempt[];
  totalQualified: number;
  totalAppeared: number;
  cutoffConfig?: AssessmentCutoffConfig;
  meritConfig?: AssessmentMeritConfig;
} {
  const assessment = assessmentStore.assessments.get(assessmentId);
  if (!assessment) {
    return { assessment: null, meritList: [], totalQualified: 0, totalAppeared: 0 };
  }

  const attempts = Array.from(assessmentStore.attempts.values()).filter(
    (att) => att.assessmentId === assessmentId && (att.status === "SUBMITTED" || att.status === "AUTO_SUBMITTED")
  );

  const meritConfig = assessment.meritConfig || {
    primaryCriterion: "TOTAL_SCORE",
    secondaryCriterion: "SECTION_SCORE",
    tieBreakerRule: "SUBMISSION_TIME",
  };

  // Multi-tier sorting according to formal merit policy
  const sortedAttempts = [...attempts].sort((a, b) => {
    // 1. Primary: Total Score (descending)
    const scoreDiff = (b.totalScore || 0) - (a.totalScore || 0);
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

    // 2. Secondary criterion (e.g. secondary section score)
    if (meritConfig.secondarySectionId) {
      const secA = a.sectionScores?.[meritConfig.secondarySectionId]?.score || 0;
      const secB = b.sectionScores?.[meritConfig.secondarySectionId]?.score || 0;
      const secDiff = secB - secA;
      if (Math.abs(secDiff) > 0.001) return secDiff;
    }

    // 3. Tertiary criterion (e.g. tertiary section score)
    if (meritConfig.tertiarySectionId) {
      const secA = a.sectionScores?.[meritConfig.tertiarySectionId]?.score || 0;
      const secB = b.sectionScores?.[meritConfig.tertiarySectionId]?.score || 0;
      const secDiff = secB - secA;
      if (Math.abs(secDiff) > 0.001) return secDiff;
    }

    // 4. Configured Tie-breaker
    if (meritConfig.tieBreakerRule === "FEWEST_INCORRECT") {
      let wrongA = 0;
      let wrongB = 0;
      Object.values(a.answers || {}).forEach((ans) => { if (ans.isAnswered && !ans.isCorrect) wrongA++; });
      Object.values(b.answers || {}).forEach((ans) => { if (ans.isAnswered && !ans.isCorrect) wrongB++; });
      if (wrongA !== wrongB) return wrongA - wrongB; // fewer wrong answers wins
    } else if (meritConfig.tieBreakerRule === "ACCURACY") {
      let attA = 0, corA = 0;
      let attB = 0, corB = 0;
      Object.values(a.answers || {}).forEach((ans) => { if (ans.isAnswered) { attA++; if (ans.isCorrect) corA++; } });
      Object.values(b.answers || {}).forEach((ans) => { if (ans.isAnswered) { attB++; if (ans.isCorrect) corB++; } });
      const accA = attA > 0 ? corA / attA : 0;
      const accB = attB > 0 ? corB / attB : 0;
      if (Math.abs(accB - accA) > 0.001) return accB - accA;
    }

    // Default tie-break: Earlier submission timestamp wins (RPSC standard for speed/precision)
    const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return timeA - timeB;
  });

  // Assign ranks and calculate cutoff qualification
  const cutoffConfig = assessment.cutoffConfig || {
    cutoffType: "PERCENTAGE",
    cutoffValue: assessment.passingPercentage || 40,
  };

  const totalAppeared = sortedAttempts.length;
  let totalQualified = 0;

  sortedAttempts.forEach((att, idx) => {
    const rank = idx + 1;
    att.meritRank = rank;

    // Check basic minimum passing condition
    const passedExam = att.passed === true;

    // Check shortlisting cutoff qualification
    let cutoffCleared = false;
    switch (cutoffConfig.cutoffType) {
      case "FIXED_SCORE":
        cutoffCleared = (att.totalScore || 0) >= (cutoffConfig.cutoffValue || 0);
        break;
      case "PERCENTAGE":
        cutoffCleared = (att.percentage || 0) >= (cutoffConfig.cutoffValue || 0);
        break;
      case "TOP_N":
        cutoffCleared = rank <= (cutoffConfig.cutoffValue || 0);
        break;
      case "TOP_PERCENTAGE": {
        const topLimit = Math.max(1, Math.ceil(totalAppeared * ((cutoffConfig.cutoffValue || 20) / 100)));
        cutoffCleared = rank <= topLimit;
        break;
      }
      case "SECTIONAL":
        cutoffCleared = passedExam;
        break;
      default:
        cutoffCleared = passedExam;
    }

    att.cutoffCleared = cutoffCleared && passedExam;
    if (att.cutoffCleared) totalQualified++;

    // Update attempt in store
    assessmentStore.attempts.set(att.id, att);
  });

  persistAssessmentStoreToDisk();

  return {
    assessment,
    meritList: sortedAttempts,
    totalQualified,
    totalAppeared,
    cutoffConfig,
    meritConfig,
  };
}

// ---------------------------------------------------------------------------
// CANDIDATE SHORTLISTING & PIPELINE TRANSITIONS
// ---------------------------------------------------------------------------

export function shortlistCandidates(
  assessmentId: string,
  candidateIds: string[],
  action: "SHORTLIST" | "REJECT" | "MOVE_TO_INTERVIEW",
  authUser: AuthenticatedUser,
  notes?: string
): { success: boolean; count: number; error?: string } {
  const assessment = assessmentStore.assessments.get(assessmentId);
  if (!assessment) return { success: false, count: 0, error: "Assessment not found." };

  let processedCount = 0;

  candidateIds.forEach((candidateId) => {
    // Find attempt
    const attempt = Array.from(assessmentStore.attempts.values()).find(
      (att) => att.assessmentId === assessmentId && (att.studentId === candidateId || att.applicationId === candidateId)
    );

    if (attempt) {
      attempt.shortlistStatus = action === "SHORTLIST" ? "SHORTLISTED" : action === "REJECT" ? "REJECTED" : "INTERVIEW_SCHEDULED";
      attempt.updatedAt = new Date().toISOString();
      assessmentStore.attempts.set(attempt.id, attempt);
    }

    // Update Application in recruitment pipeline
    const appId = attempt?.applicationId || candidateId;
    performCandidateStageAction(assessmentId, appId, action, notes, authUser);
    processedCount++;
  });

  persistAssessmentStoreToDisk();

  logRecruiterAction({
    driveId: assessment.driveId,
    driveTitle: assessment.driveTitle,
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: `CANDIDATES_BULK_${action}`,
    targetType: "ASSESSMENT",
    targetId: assessment.id,
    targetName: assessment.title,
    details: `Applied bulk ${action} to ${processedCount} candidates from Merit List.`,
  });

  return { success: true, count: processedCount };
}

// ---------------------------------------------------------------------------
// ASSESSMENT VERSIONING (IMMUTABILITY CONTROL)
// ---------------------------------------------------------------------------

export function createNewAssessmentVersion(
  assessmentId: string,
  authUser: AuthenticatedUser
): { success: boolean; newAssessment?: AssessmentRecord; error?: string } {
  const existing = assessmentStore.assessments.get(assessmentId);
  if (!existing) return { success: false, error: "Assessment not found." };

  const currentVersion = existing.version || 1;
  const newVersion = currentVersion + 1;
  const newId = `assess_${Date.now()}_v${newVersion}`;

  const clonedAssessment: AssessmentRecord = {
    ...existing,
    id: newId,
    title: `${existing.title.replace(/ \(v\d+\)$/, "")} (v${newVersion})`,
    version: newVersion,
    status: "DRAFT",
    isVersionLocked: false,
    assignedCandidateIds: [], // New version requires re-assignment or scheduled transition
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assessmentStore.assessments.set(newId, clonedAssessment);
  persistAssessmentStoreToDisk();

  logRecruiterAction({
    driveId: existing.driveId,
    driveTitle: existing.driveTitle,
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: "ASSESSMENT_VERSION_CREATED",
    targetType: "ASSESSMENT",
    targetId: newId,
    targetName: clonedAssessment.title,
    details: `Created new mutable Version ${newVersion} from ${existing.title} (v${currentVersion}). Original version remains immutable.`,
  });

  return { success: true, newAssessment: clonedAssessment };
}

// ---------------------------------------------------------------------------
// QUESTION PAPER BLUEPRINT GENERATOR
// ---------------------------------------------------------------------------

export interface BlueprintSectionRequest {
  sectionId: string;
  name: string;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  category?: string;
  topic?: string;
  marksPerEasy?: number;
  marksPerMedium?: number;
  marksPerHard?: number;
  negativeRate?: number;
}

export function generatePaperFromBlueprint(
  sections: BlueprintSectionRequest[],
  companyId: string,
  authUser: AuthenticatedUser
): { success: boolean; snapshots?: AssessmentSnapshotQuestion[]; totalQuestions?: number; totalMarks?: number; error?: string } {
  const allQuestions = Array.from(assessmentStore.questions.values()).filter((q) => !q.isArchived);

  // Available pools: SYSTEM questions + COMPANY questions belonging to company + RECRUITER questions created by user
  const pool = allQuestions.filter(
    (q) =>
      q.ownerType === "SYSTEM" ||
      (q.ownerType === "COMPANY" && q.companyId === companyId) ||
      (q.createdById === authUser.id)
  );

  const selectedSnapshots: AssessmentSnapshotQuestion[] = [];
  let currentOrder = 1;

  for (const sec of sections) {
    const secPool = pool.filter((q) => {
      if (sec.category && sec.category !== "All" && q.category !== sec.category) return false;
      if (sec.topic && sec.topic !== "All" && q.topic !== sec.topic) return false;
      return true;
    });

    const easyAvailable = secPool.filter((q) => q.difficulty === "EASY");
    const medAvailable = secPool.filter((q) => q.difficulty === "MEDIUM");
    const hardAvailable = secPool.filter((q) => q.difficulty === "HARD");

    // Formal blueprint validation check
    if (easyAvailable.length < sec.easyCount) {
      return {
        success: false,
        error: `Section '${sec.name}' requires ${sec.easyCount} Easy questions, but only ${easyAvailable.length} matching questions are available in the Question Bank.`,
      };
    }
    if (medAvailable.length < sec.mediumCount) {
      return {
        success: false,
        error: `Section '${sec.name}' requires ${sec.mediumCount} Medium questions, but only ${medAvailable.length} matching questions are available in the Question Bank.`,
      };
    }
    if (hardAvailable.length < sec.hardCount) {
      return {
        success: false,
        error: `Section '${sec.name}' requires ${sec.hardCount} Hard questions, but only ${hardAvailable.length} matching questions are available in the Question Bank.`,
      };
    }

    // Pick randomized subset from each tier
    const pickRandom = (arr: AssessmentQuestion[], count: number) => {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    };

    const chosenEasy = pickRandom(easyAvailable, sec.easyCount);
    const chosenMed = pickRandom(medAvailable, sec.mediumCount);
    const chosenHard = pickRandom(hardAvailable, sec.hardCount);

    const chosenAll = [...chosenEasy, ...chosenMed, ...chosenHard];

    chosenAll.forEach((q) => {
      const marks =
        q.difficulty === "EASY" && sec.marksPerEasy
          ? sec.marksPerEasy
          : q.difficulty === "MEDIUM" && sec.marksPerMedium
          ? sec.marksPerMedium
          : q.difficulty === "HARD" && sec.marksPerHard
          ? sec.marksPerHard
          : q.marks;

      const negativeMarks =
        sec.negativeRate !== undefined
          ? Math.round(marks * sec.negativeRate * 100) / 100
          : q.negativeMarks;

      selectedSnapshots.push({
        id: `snap_${sec.sectionId}_${q.id}`,
        originalQuestionId: q.id,
        source: q.ownerType,
        type: q.type,
        questionText: q.questionText,
        options: q.options ? [...q.options] : [],
        correctAnswer: q.correctAnswer,
        marks,
        negativeMarks,
        difficulty: q.difficulty,
        category: q.category,
        topic: q.topic,
        orderIndex: currentOrder++,
        explanation: q.explanation,
        sectionId: sec.sectionId,
        sectionName: sec.name,
      });
    });
  }

  const totalMarks = selectedSnapshots.reduce((acc, q) => acc + q.marks, 0);

  return {
    success: true,
    snapshots: selectedSnapshots,
    totalQuestions: selectedSnapshots.length,
    totalMarks,
  };
}

// ---------------------------------------------------------------------------
// QUESTION OBJECTION & RE-EVALUATION SYSTEM
// ---------------------------------------------------------------------------

export function submitQuestionObjection(params: {
  assessmentId: string;
  attemptId: string;
  questionId: string;
  objectionType: "WRONG_ANSWER_KEY" | "AMBIGUOUS_QUESTION" | "INCORRECT_QUESTION" | "TECHNICAL_ISSUE";
  description: string;
  proposedAnswer?: string;
  candidateId: string;
  candidateName: string;
}): { success: boolean; objection: QuestionObjection; error?: string } {
  const assessment = assessmentStore.assessments.get(params.assessmentId);
  if (!assessment) return { success: false, objection: {} as any, error: "Assessment not found." };

  const objectionId = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newObjection: QuestionObjection = {
    id: objectionId,
    assessmentId: params.assessmentId,
    attemptId: params.attemptId,
    questionId: params.questionId,
    candidateId: params.candidateId,
    candidateName: params.candidateName,
    objectionType: params.objectionType,
    description: params.description,
    proposedAnswer: params.proposedAnswer,
    status: "SUBMITTED",
    createdAt: new Date().toISOString(),
  };

  assessmentStore.objections.set(objectionId, newObjection);
  persistAssessmentStoreToDisk();

  return { success: true, objection: newObjection };
}

export function getQuestionObjections(assessmentId: string): QuestionObjection[] {
  return Array.from(assessmentStore.objections.values())
    .filter((obj) => obj.assessmentId === assessmentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function resolveQuestionObjection(
  objectionId: string,
  status: "ACCEPTED" | "REJECTED",
  resolutionNotes: string,
  authUser: AuthenticatedUser
): { success: boolean; objection?: QuestionObjection; error?: string } {
  const objection = assessmentStore.objections.get(objectionId);
  if (!objection) return { success: false, error: "Objection not found." };

  objection.status = status;
  objection.resolutionNotes = resolutionNotes;
  objection.resolvedAt = new Date().toISOString();
  objection.resolvedBy = authUser.name || authUser.id;

  assessmentStore.objections.set(objectionId, objection);
  persistAssessmentStoreToDisk();

  logRecruiterAction({
    driveId: "recruitment_drive",
    driveTitle: "Recruitment Examination",
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: `OBJECTION_${status}`,
    targetType: "ASSESSMENT",
    targetId: objection.assessmentId,
    targetName: `Objection on Question ${objection.questionId}`,
    details: `Resolved candidate objection as ${status}. Notes: ${resolutionNotes}`,
  });

  return { success: true, objection };
}

export function reevaluateAssessment(
  assessmentId: string,
  updatedAnswerKeys: Record<string, any>, // questionSnapshotId -> corrected answer
  authUser: AuthenticatedUser
): { success: boolean; reevaluatedCount: number; error?: string } {
  const assessment = assessmentStore.assessments.get(assessmentId);
  if (!assessment) return { success: false, reevaluatedCount: 0, error: "Assessment not found." };

  // 1. Update snapshot answers
  (assessment.questionSnapshots || []).forEach((snap) => {
    if (updatedAnswerKeys[snap.id] !== undefined) {
      snap.correctAnswer = updatedAnswerKeys[snap.id];
    }
  });

  assessmentStore.assessments.set(assessmentId, assessment);

  // 2. Re-evaluate all submitted attempts
  const attempts = Array.from(assessmentStore.attempts.values()).filter(
    (att) => att.assessmentId === assessmentId && (att.status === "SUBMITTED" || att.status === "AUTO_SUBMITTED")
  );

  attempts.forEach((att) => {
    let totalScore = 0;
    const snapshots = assessment.questionSnapshots || [];

    snapshots.forEach((snap) => {
      const candAns = att.answers[snap.id];
      if (candAns && candAns.isAnswered) {
        let isCorrect = false;
        if (snap.type === "SINGLE_CHOICE" || snap.type === "TRUE_FALSE") {
          isCorrect = String(candAns.answer).trim().toLowerCase() === String(snap.correctAnswer).trim().toLowerCase();
        } else if (snap.type === "MULTIPLE_CHOICE") {
          const expectedArr = Array.isArray(snap.correctAnswer) ? snap.correctAnswer : [snap.correctAnswer];
          const candArr = Array.isArray(candAns.answer) ? candAns.answer : [candAns.answer];
          const normExp = expectedArr.map((e) => String(e).trim().toLowerCase()).sort();
          const normCand = candArr.map((c) => String(c).trim().toLowerCase()).sort();
          isCorrect = normExp.length === normCand.length && normExp.every((v, i) => v === normCand[i]);
        } else if (snap.type === "SHORT_ANSWER") {
          isCorrect = String(candAns.answer).trim().toLowerCase() === String(snap.correctAnswer).trim().toLowerCase();
        }

        const marks = isCorrect ? snap.marks : assessment.negativeMarkingEnabled ? -snap.negativeMarks : 0;
        candAns.isCorrect = isCorrect;
        candAns.marksAwarded = marks;

        if (snap.sectionId && att.sectionScores && att.sectionScores[snap.sectionId]) {
          // Will recalculate below
        }
      }
    });

    // Recalculate section scores
    if (att.sectionScores) {
      Object.keys(att.sectionScores).forEach((secId) => {
        const secDef = assessment.sections?.find((s) => s.id === secId);
        const secSnaps = snapshots.filter((s) => s.sectionId === secId);
        let secScore = 0;
        let correct = 0;
        let wrong = 0;
        let unans = 0;

        secSnaps.forEach((s) => {
          const ans = att.answers[s.id];
          if (ans && ans.isAnswered) {
            secScore += ans.marksAwarded || 0;
            if (ans.isCorrect) correct++; else wrong++;
          } else {
            unans++;
          }
        });

        secScore = Math.max(0, Math.round(secScore * 10) / 10);
        const maxMarks = secDef?.totalMarks || 1;
        const pct = Math.round((secScore / maxMarks) * 100);
        const passed = secDef?.cutoffMarks ? secScore >= secDef.cutoffMarks : true;

        att.sectionScores![secId] = {
          sectionId: secId,
          sectionName: secDef?.name || "Section",
          score: secScore,
          maxMarks,
          percentage: pct,
          passed,
          correctCount: correct,
          wrongCount: wrong,
          unansweredCount: unans,
        };
      });
    }

    // Recalculate total score
    totalScore = Object.values(att.answers).reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
    const finalScore = Math.max(0, Math.round(totalScore * 10) / 10);
    att.totalScore = finalScore;
    att.percentage = assessment.totalMarks > 0 ? Math.round((finalScore / assessment.totalMarks) * 100) : 0;

    let passed = finalScore >= assessment.passingMarks;
    if (passed && assessment.sections) {
      const anySecFailed = assessment.sections.some(
        (s) => s.cutoffMarks && att.sectionScores?.[s.id] && !att.sectionScores[s.id].passed
      );
      if (anySecFailed) passed = false;
    }
    att.passed = passed;
    att.updatedAt = new Date().toISOString();

    assessmentStore.attempts.set(att.id, att);
  });

  // Re-compute merit list with new scores
  computeMeritList(assessmentId);
  persistAssessmentStoreToDisk();

  logRecruiterAction({
    driveId: assessment.driveId,
    driveTitle: assessment.driveTitle,
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: "ASSESSMENT_REEVALUATED",
    targetType: "ASSESSMENT",
    targetId: assessment.id,
    targetName: assessment.title,
    details: `Re-evaluated ${attempts.length} candidate attempts following question key correction. Merit rankings and cutoffs updated.`,
  });

  return { success: true, reevaluatedCount: attempts.length };
}

// ---------------------------------------------------------------------------
// ASSESSMENT AUTHORIZATIONS
// ---------------------------------------------------------------------------

export function getAssessmentAuthorizations(assessmentId: string): AssessmentAuthorization[] {
  return Array.from(assessmentStore.authorizations.values())
    .filter((auth) => auth.assessmentId === assessmentId)
    .sort((a, b) => new Date(b.authorizedAt || b.createdAt || 0).getTime() - new Date(a.authorizedAt || a.createdAt || 0).getTime());
}

// ---------------------------------------------------------------------------
// DOCUMENT QUESTION IMPORT HISTORY
// ---------------------------------------------------------------------------

export function recordQuestionImport(
  importRecord: QuestionImportRecord,
  authUser: AuthenticatedUser
): QuestionImportRecord {
  if (!assessmentStore.importHistory) {
    assessmentStore.importHistory = new Map();
  }
  assessmentStore.importHistory.set(importRecord.id, importRecord);
  persistAssessmentStoreToDisk();

  logRecruiterAction({
    driveId: "drive_general",
    driveTitle: "Question Bank Management",
    actorId: authUser.id,
    actorName: authUser.name || "Recruiter",
    actorRole: authUser.role,
    action: "QUESTION_IMPORT" as any,
    targetType: "ASSESSMENT",
    targetId: importRecord.id,
    targetName: importRecord.fileName,
    details: `Imported ${importRecord.importedCount} questions from ${importRecord.fileName} (${importRecord.fileType.toUpperCase()}, ${importRecord.totalDetected} detected, ${importRecord.duplicateCount} duplicates).`,
  });

  return importRecord;
}

export function getQuestionImportHistory(companyId?: string): QuestionImportRecord[] {
  if (!assessmentStore.importHistory) {
    assessmentStore.importHistory = new Map();
  }
  return Array.from(assessmentStore.importHistory.values())
    .filter((rec) => !companyId || rec.companyId === companyId)
    .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
}


