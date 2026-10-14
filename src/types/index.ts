export type UserRole = 
  | "student" | "recruiter" | "admin" // Legacy support
  | "STUDENT" | "RECRUITER" | "COMPANY_ADMIN" | "COLLEGE_ADMIN" | "COLLEGE_PLACEMENT_OFFICER" | "VERIFICATION_OFFICER" | "PLATFORM_ADMIN" | "SUPER_ADMIN";

export type AcademicStream =
  | 'Engineering & Technology'
  | 'Management & Business'
  | 'Sciences & Mathematics'
  | 'Healthcare & Medicine'
  | 'Pharmacy'
  | 'Law & Legal Studies'
  | 'Design & Architecture'
  | 'Commerce & Finance'
  | 'Humanities & Social Sciences'
  | 'Arts & Humanities'
  | 'Media & Communication'
  | 'Education'
  | 'Hospitality & Tourism'
  | 'Agriculture & Life Sciences'
  | 'Other';

export type AcademicLevel =
  | 'Undergraduate'
  | 'Postgraduate'
  | 'Doctorate'
  | 'Diploma'
  | 'Certificate'
  | 'Other';

export type AccountStatus =
  | 'account_created'
  | 'profile_incomplete'
  | 'profile_complete'
  | 'onboarding_complete';

export type AccountAccessStatus = 'ACTIVE' | 'RESTRICTED';

export type VerificationType = 'university_email' | 'payment_receipt' | 'student_id_card';

export type VerificationStatus =
  | 'not_submitted'
  | 'processing'
  | 'approved'
  | 'verification_failed'
  | 'manual_review_requested'
  | 'under_review'
  | 'pending'
  | 'rejected'
  | 'needs_information'
  | 'UNVERIFIED'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'VERIFICATION_FAILED'
  | 'MANUAL_REVIEW_REQUESTED'
  | 'UNDER_REVIEW'
  | 'REJECTED';

export interface VerificationAttempt {
  attemptNumber: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_information';
  documentName?: string;
  rejectionReason?: string;
  adminNotes?: string;
  reviewedBy?: string;
}

export interface StudentVerificationRequest {
  id: string;
  verificationId?: string;
  studentId: string;
  studentName: string;
  university: string;
  universityEmail: string;
  verificationType: VerificationType;
  status: VerificationStatus | VerificationQueueStatus;
  documentName: string;
  documentSize: string;
  documentUrl: string;
  personalEmail?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewerName?: string;
  rejectionReason?: string;
  adminNotes?: string;
  requiredInformation?: string[];
  attempts?: VerificationAttempt[];
}

export type DocumentType =
  | 'RESUME'
  | 'GOVERNMENT_ID'
  | 'COLLEGE_ID'
  | 'DEGREE_CERTIFICATE'
  | 'MARKSHEET'
  | 'INTERNSHIP_CERTIFICATE'
  | 'PROJECT_CERTIFICATE'
  | 'OTHER';

export type DocumentStatus =
  | 'PROCESSING'
  | 'AUTO_VERIFIED'
  | 'VERIFICATION_FAILED'
  | 'MANUAL_REVIEW_REQUESTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REUPLOAD_REQUIRED'
  | 'EXPIRED'
  | 'NEEDS_REVIEW'
  | 'UPLOADED';

export type DocumentVerificationMethod =
  | 'AUTOMATED'
  | 'ADMIN'
  | 'VERIFICATION_OFFICER';

export type DocumentExpiryStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';

export interface DocumentVerificationAttempt {
  id: string;
  documentId: string;
  userId: string;
  verificationMethod: DocumentVerificationMethod;
  status: DocumentStatus;
  confidenceScore: number;
  extractedData: Record<string, any>;
  matchedFields: string[];
  failedChecks: string[];
  warnings: string[];
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  studentName?: string;
  studentEmail?: string;
  collegeName?: string;
  institutionalId?: string | null;
  documentType: DocumentType;
  fileName: string;
  storageKey: string;
  fileUrl?: string;
  mimeType: string;
  fileSize: string;
  fileSizeBytes: number;
  uploadedAt: string;
  updatedAt: string;
  verificationStatus: DocumentStatus;
  verificationMethod?: DocumentVerificationMethod;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  reuploadReason?: string | null;
  failureReason?: string | null;
  manualReviewRequestedAt?: string | null;
  manualReviewRequestedBy?: string | null;
  manualReviewReason?: string | null;
  expiresAt?: string | null;
  expiryStatus?: DocumentExpiryStatus;
  isSensitive: boolean;
  isShareableWithRecruiters: boolean;
  latestAttemptId?: string | null;
  confidenceScore?: number | null;
  extractedData?: Record<string, any> | null;
  matchedFields?: string[];
  failedChecks?: string[];
  warnings?: string[];
  decisionReason?: string | null;
  attempts?: DocumentVerificationAttempt[];
}

export interface CandidateVerificationClaims {
  identityVerified: boolean;
  educationVerified: boolean;
  degreeVerified: boolean;
  internshipVerified: boolean;
  resumeVerified: boolean;
  verifiedCount: number;
  totalDocuments: number;
}


export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  googleId?: string;
  emailVerified?: boolean;
  authProvider?: 'credentials' | 'google';
  headline: string;
  university: string;
  collegeId?: string;
  studentId?: string;
  enrollmentNumber?: string;
  rollNumber?: string;
  registrationNumber?: string;
  institutionalId?: string;
  degree: string;
  branch: string; // Preserved for backward compatibility
  department?: string;
  academicStream?: AcademicStream | string;
  specialization?: string;
  academicLevel?: AcademicLevel;
  yearOfStudy?: string;
  graduationYear: number;
  cgpa: string;
  backlogs?: number;
  placementStatus?: 'PLACED' | 'UNPLACED' | 'OFFERED' | 'OPTED_OUT' | string;
  location: string;
  bio: string;
  phone?: string;
  hasUniversityEmail?: boolean;
  isUniversityEmail?: boolean;
  personalEmail?: string;
  accountStatus?: AccountStatus;
  accountAccessStatus?: AccountAccessStatus;
  verificationStatus?: VerificationStatus;
  rejectionReason?: string;
  onboardingCompleted?: boolean;
  verificationRequest?: StudentVerificationRequest | null;
  status: 'Open to Summer 2026 Internships' | 'Looking for Part-time' | 'Actively Interviewing' | 'Not Looking';
  skills: string[];
  resume: {
    fileName: string;
    fileSize: string;
    uploadedAt: string;
    url?: string;
  } | null;
  projects: Project[];
  certifications: Certification[];
  socialLinks: {
    github?: string;
    linkedin?: string;
    leetcode?: string;
    codeforces?: string;
    portfolio?: string;
    twitter?: string;
    behance?: string;
    researchgate?: string;
    ssrn?: string;
  };
  githubConnection?: GitHubConnection | null;
  stats: {
    profileViews: number;
    searchAppearances: number;
    applicationsCount: number;
    interviewsCount: number;
  };
}

export type GitHubSyncStatus = "CONNECTED" | "SYNCING" | "SYNCED" | "FAILED";

export interface GitHubConnection {
  id: string;
  userId: string;
  githubUserId: string;
  githubUsername: string;
  githubDisplayName: string | null;
  githubAvatarUrl: string | null;
  githubProfileUrl: string;
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

export interface GitHubRepository {
  id: string;
  githubRepositoryId: number;
  userId: string;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  languages: Record<string, number>; // language -> bytes
  topics: string[];
  starsCount: number;
  forksCount: number;
  isFork: boolean;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  readmeSnippet?: string | null;
}

export type EvidenceType =
  | "SKILL"
  | "PROJECT"
  | "ARCHITECTURE"
  | "TESTING"
  | "SECURITY"
  | "DATABASE"
  | "API"
  | "AI_ML"
  | "DEVOPS"
  | "DOCUMENTATION"
  | "PROBLEM_SOLVING"
  | "ACTIVITY";

export type EvidenceSource =
  | "SOURCE_CODE"
  | "DEPENDENCY"
  | "REPOSITORY_LANG"
  | "README"
  | "TOPIC"
  | "PROJECT_STRUCTURE";

export interface NormalizedEvidence {
  id: string;
  type: EvidenceType;
  skill?: string;
  repositoryId: string;
  repositoryName: string;
  source: EvidenceSource;
  files?: string[];
  reason: string;
  confidence: number; // 0.0 to 1.0
  weight: number; // multiplier
  detectedAt: string;
}

export interface SkillEvidence {
  id: string;
  skill: string; // Normalized skill name
  confidence: number; // 0 to 100
  source: "github" | "resume" | "profile" | "certification";
  sourceId: string;
  repoName?: string;
  languageBytes?: number;
  detectedAt: string;
}

export interface CareerDNAScoreDimensions {
  technicalDepth: number; // 0 - 100
  technicalBreadth: number; // 0 - 100
  projectComplexity: number; // 0 - 100
  engineeringQuality: number; // 0 - 100
  problemSolving: number; // 0 - 100
  projectCompleteness: number; // 0 - 100
  consistency: number; // 0 - 100
}

export interface CareerDNASnapshot {
  snapshotId: string;
  overallScore: number;
  analysisConfidence: number;
  dimensions: CareerDNAScoreDimensions;
  capturedAt: string;
}

export type ResumeStatus = "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED" | "SUPERSEDED";

export interface ResumeDNA {
  score: number; // 0 - 100
  confidence: number; // 0 - 100
  summary: string;
  primaryStrength: string;
  skills: Array<{ name: string; category: string; confidence: number; evidence: string }>;
  education: Array<{ institution: string; degree: string; year: string; gpa?: string }>;
  projects: Array<{ title: string; techStack: string[]; description: string; impact?: string }>;
  experience: Array<{ organization: string; role: string; duration: string; achievements: string[] }>;
  certifications: string[];
  achievements: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  evidence: Array<{ id: string; entity: string; skill: string; text: string; confidence: number; source: "Resume" }>;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  fileSizeBytes: number;
  status: ResumeStatus;
  extractedText: string;
  uploadedAt: string;
  analyzedAt: string | null;
  analysisVersion: string;
  resumeScore: number | null;
  isActive: boolean;
  supersededAt: string | null;
  resumeDNA: ResumeDNA | null;
  error?: string | null;
}

export type CodeforcesSyncStatus = "CONNECTED" | "SYNCING" | "SYNCED" | "FAILED";
export type CodeforcesVerificationStatus = "PENDING_VERIFICATION" | "VERIFIED" | "VERIFICATION_FAILED" | "DISCONNECTED";

export interface CodeforcesConnection {
  id: string;
  userId: string;
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  avatar: string;
  contestsCount: number;
  totalSubmissions: number;
  solvedProblemsCount: number;
  strongestTags: Array<{ tag: string; count: number }>;
  difficultyDistribution: Record<string, number>;
  languages: Record<string, number>;
  ratingTrend: "Improving" | "Stable" | "Declining";
  status: CodeforcesVerificationStatus;
  syncStatus: CodeforcesSyncStatus;
  verificationToken: string | null;
  verificationExpiresAt: string | null;
  verifiedAt: string | null;
  lastSyncedAt: string | null;
  connectedAt: string;
  error?: string | null;
}

export interface CodeforcesDNA {
  score: number; // 0 - 100
  confidence: number;
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  solvedProblemsCount: number;
  contestsCount: number;
  strongestTags: Array<{ tag: string; count: number }>;
  difficultyDistribution: Record<string, number>;
  languages: Record<string, number>;
  ratingTrend: "Improving" | "Stable" | "Declining";
  strengths: string[];
  developingAreas: string[];
  evidence: Array<{ id: string; entity: string; skill: string; text: string; confidence: number; source: "Codeforces" }>;
}

export type LeetCodeSyncStatus = "CONNECTED" | "SYNCING" | "SYNCED" | "FAILED";
export type LeetCodeVerificationStatus = "PENDING_VERIFICATION" | "VERIFIED" | "VERIFICATION_FAILED" | "DISCONNECTED";

export interface LeetCodeConnection {
  id: string;
  userId: string;
  leetcodeId: string;
  ranking: number;
  totalProblemsSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate?: number;
  contestRating: number;
  contestRank?: string;
  contestsCount: number;
  globalRanking?: number;
  topPercentage?: number;
  avatar: string;
  status: LeetCodeVerificationStatus;
  syncStatus: LeetCodeSyncStatus;
  verificationToken: string | null;
  verificationExpiresAt: string | null;
  verifiedAt: string | null;
  lastSyncedAt: string | null;
  connectedAt: string;
  error?: string | null;
}

export interface LeetCodeDNA {
  score: number; // 0 - 100
  confidence: number;
  leetcodeId: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating: number;
  ranking: number;
  strengths: string[];
  developingAreas: string[];
  evidence: Array<{ id: string; entity: string; skill: string; text: string; confidence: number; source: "LeetCode" }>;
}

export type HuggingFaceSyncStatus = "CONNECTED" | "SYNCING" | "SYNCED" | "FAILED";

export interface HuggingFaceConnectionRecord {
  id: string;
  userId: string;
  hfUserId: string;
  username: string;
  fullname: string | null;
  avatarUrl: string | null;
  profileUrl: string;
  accessTokenEncrypted: string;
  modelsCount: number;
  datasetsCount: number;
  spacesCount: number;
  totalLikes: number;
  syncStatus: HuggingFaceSyncStatus;
  lastSyncedAt: string | null;
  connectedAt: string;
  error?: string | null;
}

export interface HuggingFaceDNA {
  score: number; // 0 - 100
  confidence: number;
  username: string;
  modelsCount: number;
  datasetsCount: number;
  spacesCount: number;
  totalLikes: number;
  topFrameworks: string[];
  aiSpecializations: string[];
  evidence: Array<{
    id: string;
    entity: string;
    skill: string;
    text: string;
    confidence: number;
    source: "HuggingFace";
  }>;
}

export type CertificateVerificationStatus =
  | "VERIFIED"
  | "PARTIALLY_VERIFIED"
  | "UNABLE_TO_VERIFY"
  | "SUSPICIOUS"
  | "ANALYSIS_FAILED";

export type CertificateVerificationConfidence = "HIGH" | "MEDIUM" | "LOW";
export type IdentityMatchStatus = "MATCH" | "PARTIAL_MATCH" | "MISMATCH" | "UNKNOWN";
export type IssuerVerificationStatus = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNRECOGNIZED" | "SUSPICIOUS";
export type CredentialVerificationStatus = "VERIFIED" | "NOT_FOUND" | "UNAVAILABLE" | "MISMATCH";
export type DocumentIntegrityStatus = "NO_OBVIOUS_MANIPULATION" | "POSSIBLE_MANIPULATION" | "INSUFFICIENT_EVIDENCE";
export type DigitalSignatureStatus = "DIGITAL_SIGNATURE_VALID" | "DIGITAL_SIGNATURE_INVALID" | "NO_DIGITAL_SIGNATURE";

export interface CertificateRecord {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  fileSize: string; // e.g. "1.2 MB"
  fileUrl: string;
  recipientName: string;
  certificateTitle: string;
  courseName: string;
  issuerName: string;
  issueDate: string | null;
  expiryDate: string | null;
  certificateId: string | null;
  credentialId: string | null;
  verificationUrl: string | null;
  qrData: string | null;
  skills: string[];
  identityMatchStatus: IdentityMatchStatus;
  issuerVerificationStatus: IssuerVerificationStatus;
  credentialVerificationStatus: CredentialVerificationStatus;
  documentIntegrityStatus: DocumentIntegrityStatus;
  digitalSignatureStatus: DigitalSignatureStatus;
  verificationStatus: CertificateVerificationStatus;
  verificationConfidence: CertificateVerificationConfidence;
  evidenceStatements: string[];
  status: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";
  uploadedAt: string;
  analyzedAt: string | null;
  error?: string | null;
}

export interface CertificateDNA {
  score: number; // 0 - 100
  totalCertificates: number;
  verifiedCount: number;
  partiallyVerifiedCount: number;
  unableToVerifyCount: number;
  suspiciousCount: number;
  topVerifiedSkills: Array<{ name: string; certificateCount: number }>;
  evidence: Array<{
    id: string;
    entity: string;
    skill: string;
    text: string;
    confidence: number;
    source: "Certificate";
  }>;
}

export interface CareerDNA {
  id: string;
  userId: string;
  overallScore: number; // Deterministic 0 - 100
  analysisConfidence: number; // Deterministic evidence confidence % (0 - 100)
  dimensions: CareerDNAScoreDimensions;
  dimensionExplanations: Record<keyof CareerDNAScoreDimensions, string>;
  evidences: NormalizedEvidence[];
  topSkills: Array<{
    name: string;
    score: number;
    evidenceCount: number;
  }>;
  skillEvidences: SkillEvidence[];
  featuredProjects: Project[];
  summary: string;
  potentialCareerDirections: string[];
  skillGaps: string[];
  scoringVersion: string;
  analysisVersion: string;
  scoringWeights: Record<string, number>;
  githubStats: {
    totalRepos: number;
    primaryLanguages: string[];
    topRepoName: string;
    totalStars: number;
    lastSyncAt: string;
  } | null;
  codeforcesStats?: {
    handle: string;
    rating: number;
    maxRating: number;
    rank: string;
    solvedProblemsCount: number;
    contestsCount: number;
    lastSyncAt: string;
  } | null;
  leetcodeStats?: {
    leetcodeId: string;
    totalProblemsSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    contestRating: number;
    ranking: number;
    lastSyncAt: string;
  } | null;
  huggingfaceStats?: {
    username: string;
    modelsCount: number;
    datasetsCount: number;
    spacesCount: number;
    totalLikes: number;
    lastSyncAt: string;
  } | null;
  certificateStats?: {
    totalCertificates: number;
    verifiedCertificates: number;
    topSkills: string[];
    lastAnalysisAt: string;
  } | null;
  history?: CareerDNASnapshot[];
  sourceStatuses?: {
    resume: "ANALYZED" | "NOT_CONNECTED" | "PROCESSING" | "STALE";
    github: "ANALYZED" | "CONNECTED" | "NOT_CONNECTED" | "PROCESSING" | "STALE";
    codeforces?: "ANALYZED" | "CONNECTED" | "NOT_CONNECTED" | "PROCESSING" | "STALE";
    leetcode?: "ANALYZED" | "CONNECTED" | "NOT_CONNECTED" | "PROCESSING" | "STALE";
    huggingface?: "ANALYZED" | "CONNECTED" | "NOT_CONNECTED" | "PROCESSING" | "STALE";
    certificates?: "ANALYZED" | "CONNECTED" | "NOT_CONNECTED" | "PROCESSING" | "STALE";
    projects: "ANALYZED" | "NOT_CONNECTED";
    skills: "ANALYZED";
    experience: "ANALYZED" | "NOT_CONNECTED";
    education: "ANALYZED" | "NOT_CONNECTED";
    certifications: "ANALYZED" | "NOT_CONNECTED";
  };
  sourceBreakdown?: {
    resumeScore: number | null;
    githubScore: number | null;
    codeforcesScore?: number | null;
    leetcodeScore?: number | null;
    huggingfaceScore?: number | null;
    certificatesScore?: number | null;
    projectsScore: number | null;
    skillsScore: number | null;
    experienceScore: number | null;
    educationScore: number | null;
  };
  nextBestActions?: Array<{
    id: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    title: string;
    reason: string;
    action: string;
    source: string;
  }>;
  updatedAt: string;
}

export type RecruiterVerificationStatus =
  | 'Pending'
  | 'Email Verified'
  | 'Company Verified'
  | 'Recruiter Verified'
  | 'Verification Failed'
  | 'Suspended';

export interface RecruiterProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar: string;
  googleId?: string;
  emailVerified?: boolean;
  authProvider?: 'credentials' | 'google';
  title: string;
  department?: string;
  company: string;
  companyLogo: string;
  companyWebsite?: string;
  companyLocation?: string;
  companySize?: string;
  companyType?: string;
  recruiterRole?: string;
  recruiterUsage?: string[];
  location: string;
  bio: string;
  verificationStatus?: RecruiterVerificationStatus;
  activeListingsCount: number;
  candidatesReviewed: number;
  interviewsConducted?: number;
}

export type ProjectType =
  | 'Personal'
  | 'Hackathon'
  | 'Capstone'
  | 'Open Source'
  | 'Business Project'
  | 'Research Project'
  | 'Healthcare Project'
  | 'Clinical Experience'
  | 'Design Project'
  | 'Marketing Project'
  | 'Case Study'
  | 'Academic Project'
  | 'Creative Work'
  | 'Leadership'
  | 'Volunteer Work'
  | 'Other';

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  tools?: string[];
  githubUrl?: string;
  liveUrl?: string;
  documentUrl?: string;
  date: string;
  type: ProjectType;
  featured?: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  credentialId: string;
  credentialUrl: string;
  icon?: string;
}

export interface Internship {
  id: string;
  title: string;
  company: string;
  companyLogo: string;
  companyDescription: string;
  location: string;
  workType: 'Remote' | 'Hybrid' | 'Onsite';
  stipend: string;
  duration: string;
  deadline: string;
  postedDate: string;
  department: string;
  requiredSkills: string[];
  matchPercentage: number;
  matchReasons: {
    matchingSkills: string[];
    academicMatch: string;
    projectSynergy: string;
  };
  description: string;
  responsibilities: string[];
  requirements: string[];
  perks: string[];
  applicantsCount: number;
  featured?: boolean;
}

export type ApplicationStatus =
  | 'Applied'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview'
  | 'Selected'
  | 'Rejected';

export interface Application {
  id: string;
  internshipId: string;
  company: string;
  companyLogo: string;
  role: string;
  appliedDate: string;
  status: ApplicationStatus;
  location: string;
  workType: 'Remote' | 'Hybrid' | 'Onsite';
  stipend: string;
  nextStep?: string;
  interviewDate?: string;
  notes?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  isSelf: boolean;
}

export interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    companyOrCollege: string;
    isOnline: boolean;
    type: 'peer' | 'recruiter' | 'mentor';
  };
  lastMessage: {
    text: string;
    timestamp: string;
    isUnread: boolean;
  };
  messages: Message[];
}

export type PostType =
  | 'DISCUSSION'
  | 'QUESTION'
  | 'PROJECT'
  | 'RESOURCE'
  | 'INTERNSHIP'
  | 'HACKATHON'
  | 'ACHIEVEMENT'
  | 'EVENT'
  | 'POLL';

export interface CommunityComment {
  id: string;
  postId: string;
  parentId?: string;
  author: {
    name: string;
    avatar: string;
    headline: string;
    isVerifiedStudent?: boolean;
    university?: string;
  };
  content: string;
  timestamp: string;
  score: number;
  userVote?: 1 | -1 | 0;
  replies?: CommunityComment[];
}

export interface CommunityPost {
  id: string;
  communityId?: string;
  communityName?: string;
  communitySlug?: string;
  communityIcon?: string;
  author: {
    name: string;
    avatar: string;
    headline: string;
    isVerifiedStudent?: boolean;
    university?: string;
    careerDNASkills?: string[];
  };
  type?: PostType;
  title: string;
  content: string;
  timestamp: string;
  upvotes: number;
  userVote?: 1 | -1 | 0;
  hasUpvoted?: boolean;
  commentCount: number;
  comments?: CommunityComment[];
  tags: string[];
  isSaved?: boolean;
  isVerifiedProject?: boolean;
  projectDetails?: {
    name: string;
    repoUrl?: string;
    demoUrl?: string;
    verifiedBy?: string;
  };
  isVerifiedOpportunity?: boolean;
  opportunityDetails?: {
    company: string;
    stipend?: string;
    role: string;
    deadline?: string;
    applyUrl?: string;
  };
}

// ============================================================================
// Structured RPSC-Style Community Hub Types
// ============================================================================

export type CommunityType =
  | 'Technical Club'
  | 'Developer Community'
  | 'Campus Club'
  | 'Student Society'
  | 'Research Group'
  | 'Founder Community'
  | 'Competition Team'
  | 'Professional Community';

export type CommunityDomain =
  | 'Software Development'
  | 'AI / ML'
  | 'Data Science'
  | 'Cybersecurity'
  | 'Web3'
  | 'UI/UX Design'
  | 'Product'
  | 'Entrepreneurship'
  | 'Research'
  | 'Competitive Programming'
  | 'Robotics'
  | 'Electronics'
  | 'Finance'
  | 'Healthcare & Biotech'
  | 'Law & Policy'
  | 'General Tech';

export type CommunityStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ARCHIVED'
  | 'REJECTED';

export type CommunityMembershipType =
  | 'OPEN'
  | 'APPLICATION_REQUIRED'
  | 'INVITE_ONLY';

export type CommunityMembershipStatus =
  | 'NOT_JOINED'
  | 'ELIGIBLE'
  | 'REQUESTED'
  | 'PENDING_APPROVAL'
  | 'MEMBER'
  | 'REJECTED'
  | 'SUSPENDED';

export type CommunityRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MODERATOR'
  | 'LEAD'
  | 'ORGANIZER'
  | 'MEMBER';

export interface CommunityEligibilityCriteria {
  allowedDegrees: string[];
  allowedBranches: string[];
  allowedYears: string[];
  minCgpa?: number;
  requiresInstitutionalVerification: boolean;
  allowedUniversities?: string[];
  requiredSkills?: string[];
  summary: string;
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  communityName: string;
  title: string;
  description: string;
  eventType:
    | 'Hackathon'
    | 'Workshop'
    | 'Seminar'
    | 'Mock Interview'
    | 'Coding Contest'
    | 'Project Showcase'
    | 'Networking Session'
    | 'Technical Session';
  date: string;
  time: string;
  mode: 'Hybrid' | 'In-Person' | 'Virtual';
  location: string;
  eligibility: string;
  capacity: number;
  registeredCount: number;
  isRegistered?: boolean;
}

export interface CommunityAnnouncement {
  id: string;
  communityId: string;
  title: string;
  content: string;
  type: 'EVENT' | 'OPPORTUNITY' | 'GENERAL' | 'IMPORTANT';
  postedAt: string;
  postedBy: string;
  pinned?: boolean;
}

export interface CommunityOpportunity {
  id: string;
  communityId: string;
  communityName: string;
  title: string;
  type: 'INTERNSHIP' | 'PROJECT' | 'HACKATHON' | 'MENTORSHIP' | 'REFERRAL';
  openPositions: number;
  deadline: string;
  company?: string;
  description: string;
  eligibility: string;
  actionUrl?: string;
}

export interface CommunityLeader {
  id: string;
  name: string;
  role: 'President' | 'Vice President' | 'Technical Lead' | 'Community Admin' | 'Faculty Advisor' | 'Founder';
  avatar: string;
  headline: string;
}

export interface CommunityAchievement {
  id: string;
  communityId: string;
  communityName: string;
  studentId?: string;
  title: string;
  type:
    | 'HACKATHON_WINNER'
    | 'WORKSHOP_ORGANIZER'
    | 'TECH_LEAD'
    | 'COMMUNITY_CONTRIBUTOR'
    | 'PROJECT_MENTOR'
    | 'EVENT_VOLUNTEER';
  recipientName: string;
  awardedAt: string;
  evidenceSignal: string;
  isClaimedToCareerDNA?: boolean;
}

export interface CommunityJoinRequest {
  id: string;
  communityId: string;
  communityName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  university: string;
  degree: string;
  branch: string;
  year: string;
  cgpa: string;
  message: string;
  skills: string[];
  portfolioUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface CommunityAuditLog {
  id: string;
  communityId: string;
  actor: string;
  action: string;
  timestamp: string;
  target?: string;
  reason?: string;
  details?: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  category:
    | 'AI & ML'
    | 'Web Development'
    | 'DSA & Prep'
    | 'Startups'
    | 'UI/UX Design'
    | 'Career Growth'
    | 'Business & Finance'
    | 'Bio & Healthcare'
    | 'Law & Policy'
    | 'Research & Sciences'
    | string;
  description: string;
  icon: string;
  bannerColor: string;
  membersCount: number;
  activeDiscussions: number;
  isJoined: boolean;
  featuredPost?: string;
  posts: CommunityPost[];

  // Structured RPSC-Style Community Extensions
  type?: CommunityType;
  domain?: CommunityDomain;
  institution?: string;
  university?: string;
  location?: string;
  city?: string;
  state?: string;
  foundedYear?: number;
  status?: CommunityStatus;
  isVerified?: boolean;
  verificationDetails?: {
    verifiedBy: string;
    verifiedAt: string;
    verificationReason: string;
  };
  membershipType?: CommunityMembershipType;
  myMembershipStatus?: CommunityMembershipStatus;
  myRole?: CommunityRole;
  eligibilityCriteria?: CommunityEligibilityCriteria;
  activityMetrics?: {
    activityLevel: 'VERY_ACTIVE' | 'ACTIVE' | 'MODERATE';
    projectsThisMonth: number;
    eventsThisMonth: number;
    activeMembersCount: number;
    opportunitiesCount: number;
  };
  events?: CommunityEvent[];
  announcements?: CommunityAnnouncement[];
  opportunities?: CommunityOpportunity[];
  leadership?: CommunityLeader[];
  achievements?: CommunityAchievement[];
  joinRequests?: CommunityJoinRequest[];
  auditTrail?: CommunityAuditLog[];
}


export interface NotificationItem {
  id: string;
  type: 'application' | 'internship' | 'message' | 'community' | 'system';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  iconType?: string;
}

export interface ConnectedAccount {
  id: string;
  platform: 'github' | 'leetcode' | 'linkedin' | 'portfolio' | 'codeforces' | 'kaggle';
  name: string;
  description: string;
  icon: string;
  status: 'coming_soon' | 'connected' | 'not_connected';
  username?: string;
  metric?: string;
}

export type RecruiterInternshipStatus = 'Active' | 'Paused' | 'Closed';

export interface RecruiterInternship {
  id: string;
  title: string;
  department: string;
  location: string;
  workType: 'Remote' | 'Hybrid' | 'Onsite';
  internshipType: string;
  stipend: string;
  duration: string;
  deadline: string;
  postedDate: string;
  status: RecruiterInternshipStatus;
  applicationsCount: number;
  shortlistedCount: number;
  viewsCount: number;
  openingsCount: number;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  degreeRequirements: string | string[];
  branchRequirements: string | string[];
  degreeLevels?: string[];
  eligibleBranches?: string[];
  minCgpa: string;
  gradYearRequirements: number[];
  experienceRequirements?: string;
}

export interface RecruiterApplicant {
  id: string;
  internshipId: string;
  internshipTitle: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  university: string;
  degree: string;
  branch: string;
  academicStream?: AcademicStream | string;
  specialization?: string;
  graduationYear: number;
  cgpa: string;
  location: string;
  skills: string[];
  appliedDate: string;
  status: ApplicationStatus;
  matchScore: number;
  resumeUrl: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  behanceUrl?: string;
  researchGateUrl?: string;
  ssrnUrl?: string;
  bio: string;
  projects: Project[];
  certifications: Certification[];
  notes?: string;
}

export interface RecruiterStudentCandidate {
  id: string;
  name: string;
  avatar: string;
  university: string;
  degree: string;
  branch: string;
  academicStream?: AcademicStream | string;
  specialization?: string;
  graduationYear: number;
  cgpa: string;
  location: string;
  skills: string[];
  profileCompletion: number;
  status: string;
  bio: string;
  isShortlisted: boolean;
  projects: Project[];
  certifications: Certification[];
  resumeUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  behanceUrl?: string;
  researchGateUrl?: string;
  ssrnUrl?: string;
}

export interface CompanyInfo {
  id: string;
  name: string;
  logo: string;
  bannerImage?: string;
  industry: string;
  website: string;
  location: string;
  companySize: string;
  foundedYear: number;
  tagline: string;
  description: string;
  about: string;
  perks: string[];
  techStack: string[];
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

export interface RecruiterNotificationItem {
  id: string;
  type: 'application' | 'interview' | 'internship' | 'message' | 'system';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

export type InterviewType =
  | 'Phone'
  | 'Video'
  | 'Technical'
  | 'HR'
  | 'Managerial'
  | 'Final';

export type InterviewStatus =
  | 'Scheduled'
  | 'Completed'
  | 'Cancelled'
  | 'Rescheduled';

export interface RecruiterInterview {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateAvatar: string;
  candidateUniversity: string;
  candidateRole: string;
  candidateEmail?: string;
  internshipId?: string;
  internshipTitle: string;
  type: InterviewType;
  status: InterviewStatus;
  date: string;
  time: string;
  duration: string;
  interviewerName: string;
  meetingLink: string;
  location?: string;
  notes?: string;
  feedback?: string;
  createdAt: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  googleId?: string;
  emailVerified?: boolean;
  authProvider?: 'credentials' | 'google';
  title: string;
  team: string;
}

export type VerificationQueueStatus =
  | 'Pending'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Needs Information';

export type VerificationMethod =
  | 'College Email'
  | 'Google'
  | 'Payment Receipt'
  | 'Manual Review';

export type VerificationRiskLevel = 'Low' | 'Medium' | 'High';

export type VerificationPriority = 'Normal' | 'High Priority' | 'Review Required';

export type VerificationCheckState = 'Pending' | 'Verified' | 'Failed';

export interface VerificationChecklistItem {
  id: string;
  label: string;
  state: VerificationCheckState;
}

export interface VerificationAcademicField {
  label: string;
  value: string;
  verified: boolean;
}

export interface VerificationDocumentSummary {
  fileName: string;
  uploadDate: string;
  fileSize: string;
  documentType: string;
  studentNameDetected?: string;
  collegeNameDetected?: string;
  paymentDate?: string;
  receiptNumber?: string;
  fileUrl: string;
}

export interface DuplicateAccountCandidate {
  id: string;
  name: string;
  email: string;
  degree: string;
  college: string;
  studentId: string;
  phone: string;
  graduationYear: string;
}

export interface VerificationTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  actor: string;
  description?: string;
}

export interface VerificationRequest {
  verificationId: string;
  studentId: string;
  status: VerificationQueueStatus;
  verificationMethod: VerificationMethod;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  riskLevel: VerificationRiskLevel;
  priority: VerificationPriority;
  rejectionReason?: string;
  adminNotes?: string;
  student: {
    avatar: string;
    fullName: string;
    email: string;
    phone: string;
    college: string;
    degree: string;
    branch: string;
    year: string;
    semester: string;
    graduationYear: string;
    studentId: string;
    collegeEmail: string;
    accountCreatedAt: string;
  };
  academicFields: VerificationAcademicField[];
  verificationResult: string;
  checklist: VerificationChecklistItem[];
  document?: VerificationDocumentSummary;
  duplicateCandidates: DuplicateAccountCandidate[];
  timeline: VerificationTimelineEvent[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  student?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  previousStatus?: string;
  newStatus?: string;
  ipSessionRef: string;
  details: string;
  reason?: string;
}

export type CompanyStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface CompanyRecord {
  id: string;
  name: string;
  logo?: string;
  website: string;
  industry: string;
  size: string;
  location: string;
  description: string;
  status: CompanyStatus;
  verificationTier?: 'UNVERIFIED' | 'STANDARD' | 'ENTERPRISE';
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
  recruiterCount?: number;
  activeDrivesCount?: number;
  suspensionReason?: string;
  isRestricted?: boolean;
  restrictionReason?: string;
  restrictedAt?: string;
  warningsCount?: number;
  violationsCount?: number;
}

export type ReportTargetType = 'USER' | 'DRIVE' | 'APPLICATION' | 'COMPANY';
export type ReportStatus = 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';

// ============================================================================
// Trust & Safety System Types
// ============================================================================

export type TrustSafetyEntityType =
  | 'RECRUITER'
  | 'COMPANY'
  | 'JOB'
  | 'INTERNSHIP'
  | 'OPPORTUNITY'
  | 'STUDENT'
  | 'PROFILE'
  | 'MESSAGE'
  | 'CERTIFICATE'
  | 'REVIEW'
  | 'OTHER';

export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TrustSafetyStatus =
  | 'SUBMITTED'
  | 'TRIAGED'
  | 'INVESTIGATION'
  | 'DECISION'
  | 'ACTION'
  | 'RESOLVED'
  | 'ESCALATED'
  | 'DISMISSED'
  | 'PENDING'
  | 'INVESTIGATING';

export type EnforcementActionType =
  | 'NO_ACTION'
  | 'WARNING'
  | 'CONTENT_REMOVED'
  | 'OPPORTUNITY_RESTRICTED'
  | 'USER_RESTRICTED'
  | 'RECRUITER_SUSPENDED'
  | 'COMPANY_SUSPENDED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_BANNED'
  | 'ESCALATED';

export type EnforcementDuration = '24_HOURS' | '7_DAYS' | '30_DAYS' | 'PERMANENT';

export interface ReportEvidence {
  id: string;
  reportId: string;
  type: 'SCREENSHOT' | 'DOCUMENT' | 'MESSAGE_LOG' | 'URL' | 'TEXT';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  description?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface ReportInternalNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  note: string;
  createdAt: string;
}

export interface TrustSafetyReport {
  id: string;
  caseNumber: string; // e.g. "TS-1042"
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reporterRole?: string;

  // Reported Entity
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
  evidence: ReportEvidence[];
  additionalInfo?: string;

  priority: ReportPriority;
  status: TrustSafetyStatus;

  assignedModeratorId?: string;
  assignedModeratorName?: string;
  internalNotes: ReportInternalNote[];

  enforcementAction?: EnforcementActionType;
  enforcementDuration?: EnforcementDuration;
  enforcementReason?: string;
  enforcedAt?: string;
  enforcedBy?: string;

  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;

  // Extensibility Hooks for Phase 2 (Risk scoring, anomaly detection)
  riskScore?: number;
  anomalySignals?: string[];

  // Backwards compatibility with basic ModerationReport
  reason?: string;
  details?: string;
  targetType?: ReportTargetType;

  createdAt: string;
  updatedAt: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reporterRole?: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle: string;
  reason: string;
  details: string;
  status: ReportStatus | TrustSafetyStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;

  // Optional Trust & Safety fields for enriched reports
  caseNumber?: string;
  entityType?: TrustSafetyEntityType;
  reportedUserId?: string;
  reportedUserName?: string;
  reportedCompanyId?: string;
  reportedCompanyName?: string;
  reportedOpportunityId?: string;
  reportedContentId?: string;
  category?: string;
  description?: string;
  evidence?: ReportEvidence[];
  additionalInfo?: string;
  priority?: ReportPriority;
  assignedModeratorId?: string;
  assignedModeratorName?: string;
  internalNotes?: ReportInternalNote[];
  enforcementAction?: EnforcementActionType;
  enforcementDuration?: EnforcementDuration;
  enforcementReason?: string;
  enforcedAt?: string;
  enforcedBy?: string;
  riskScore?: number;
  anomalySignals?: string[];
  updatedAt?: string;
}

export interface EntitySafetyHistory {
  entityType: TrustSafetyEntityType | string;
  entityId: string;
  entityName: string;
  verificationStatus?: string;
  totalReports: number;
  confirmedViolations: number;
  activeInvestigations: number;
  warningsCount: number;
  currentRestrictions: string[];
  recentReports: TrustSafetyReport[];
}

export interface CompanyRiskSignals {
  companyId: string;
  companyName: string;
  recruitersReportedCount: number;
  opportunitiesReportedCount: number;
  totalReportsCount: number;
  previousViolationsCount: number;
  activeInvestigationsCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface TrustSafetyMetrics {
  openReports: number;
  criticalReports: number;
  underInvestigation: number;
  resolvedToday: number;
  suspendedEntities: number;
  resolutionRate: number;
  reportsByCategory: Record<string, number>;
  reportsByEntityType: Record<string, number>;
  priorityDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
}

export type AdminUserStatus = 'ACTIVE' | 'RESTRICTED' | 'SUSPENDED' | 'BANNED' | 'PENDING' | 'INACTIVE';

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: AdminUserStatus;
  suspensionReason?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
  companyId?: string;
  companyName?: string;
  college?: string;
  verificationStatus?: string;
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  type:
    | 'verification_request'
    | 'document_uploaded'
    | 'resubmission'
    | 'risk_alert'
    | 'recruiter_request'
    | 'system';
}

export interface AdminOverviewMetrics {
  totalStudents: number;
  pendingVerification: number;
  verifiedStudents: number;
  rejectedApplications: number;
  verificationRate: number;
  avgVerificationTimeHours: number;
  newRegistrationsToday: number;
  newRegistrationsWeek: number;
  awaitingInformation: number;
  suspiciousAttempts: number;
  totalUsers?: number;
  totalCompanies?: number;
  totalRecruiters?: number;
  activeDrives?: number;
  totalApplications?: number;
  pendingReports?: number;
  totalColleges?: number;
  activeColleges?: number;
  pendingColleges?: number;
  institutionalPlacementRate?: number;
}

export interface AdminStudentRecord {
  id: string;
  name: string;
  email: string;
  college: string;
  collegeId?: string;
  degree: string;
  year: string;
  verificationStatus: VerificationQueueStatus;
  profileCompletion: number;
  lastActive: string;
  joined: string;
  skills?: string[];
  avatar?: string;
  headline?: string;
  careerDNA?: {
    score: number;
    rating: string;
    confidence: number;
    primaryStrength: string;
    topSkills: string[];
    projectsAnalyzed: number;
    verified: boolean;
    lastAnalyzedAt: string;
    summary?: string;
    evidences?: NormalizedEvidence[];
    featuredProjects?: Project[];
    skillGaps?: string[];
    dimensions?: CareerDNAScoreDimensions;
  } | null;
}

export type User = StudentProfile | RecruiterProfile | AdminProfile | CollegeProfile;

// ============================================================================
// Structured RPSC-Style Recruitment Portal Types
// ============================================================================

export type EmploymentType = 'INTERNSHIP' | 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
export type WorkMode = 'ONSITE' | 'REMOTE' | 'HYBRID';

export type RecruitmentApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ELIGIBLE'
  | 'ELIGIBILITY_FAILED'
  | 'SHORTLISTED'
  | 'ASSESSMENT_CLEARED'
  | 'INTERVIEW_SCHEDULED'
  | 'IN_SELECTION'
  | 'SELECTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'WAITLISTED';
export type DriveStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'APPLICATIONS_OPEN'
  | 'APPLICATIONS_CLOSED'
  | 'SCREENING'
  | 'SELECTION_IN_PROGRESS'
  | 'RESULTS_PUBLISHED'
  | 'CLOSED'
  | 'UNDER_REVIEW'
  | 'RESTRICTED';

export type StageType = 'SCREENING' | 'ASSESSMENT' | 'INTERVIEW' | 'FINAL_SELECTION';


export interface EligibilityCriteria {
  degrees: string[];
  branches: string[];
  specializations?: string[];
  minCgpa?: number;
  minPercentage?: number;
  maxBacklogs?: number;
  gradYearMin?: number;
  gradYearMax?: number;
  gradYears?: number[];
  freshersAllowed?: boolean;
  minExpYears?: number;
  maxExpYears?: number;
  requiredSkills: string[];
  preferredSkills?: string[];
  eligibleLocations?: string[];
  remoteAllowed?: boolean;
}

export interface EligibilityItemResult {
  name: string;
  passed: boolean;
  required: string;
  candidateValue: string;
  isMissingInfo?: boolean;
  details?: string;
}

export interface EligibilityEvaluationResult {
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'REQUIRES_MANUAL_REVIEW';
  score: number; // 0-100 match percentage
  criteria: EligibilityItemResult[];
  passedCount: number;
  totalCount: number;
  missingFields: string[];
  evaluatedAt: string;
}

export interface RecruitmentStage {
  id: string;
  driveId: string;
  name: string;
  type: StageType;
  order: number;
  description: string;
  passingScore?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface StageWeights {
  assessmentWeight: number; // e.g. 60
  interviewWeight: number;  // e.g. 40
}

export interface RecruitmentDrive {
  id: string;
  title: string;
  position: string;
  description: string;
  companyId?: string;
  company: string;
  companyLogo?: string;
  department: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  location: string;
  openingsCount: number;
  salaryStipend: string;
  startDate: string;
  endDate: string;
  status: DriveStatus;
  eligibilityCriteria: EligibilityCriteria;
  stages: RecruitmentStage[];
  stageWeights: StageWeights;
  applicantsCount: number;
  eligibleCount: number;
  shortlistedCount: number;
  interviewsCount: number;
  selectedCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isRestricted?: boolean;
  restrictionReason?: string;
  restrictedAt?: string;
  restrictedBy?: string;
}

export interface CandidateApplicationHistoryEntry {
  stageId: string;
  stageName: string;
  status: string;
  timestamp: string;
  actor: string;
  note?: string;
}

export interface RecruitmentApplication {
  id: string;
  driveId: string;
  driveTitle: string;
  company: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string;
  university: string;
  degree: string;
  branch: string;
  graduationYear: number;
  cgpa: string;
  backlogs: number;
  skills: string[];
  resumeUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  status: RecruitmentApplicationStatus;
  eligibility: EligibilityEvaluationResult;
  currentStageId: string;
  currentStageName: string;
  currentStageType: StageType;
  assessmentScore?: number;
  interviewScore?: number;
  finalScore?: number;
  rank?: number;
  notes?: string;
  appliedAt: string;
  updatedAt: string;
  manualOverride?: {
    overriddenBy: string;
    previousStatus: string;
    newStatus: string;
    reason: string;
    timestamp: string;
  };
  history?: CandidateApplicationHistoryEntry[];
  visibilityScope?: ApplicationVisibilityScope;
  version?: number;
  lastIdempotencyKey?: string;
}

export type ApplicationVisibilityScope = 'PRIVATE' | 'COMMANDSKILL' | 'COLLEGE_PLACEMENT';

export interface CandidateAssessmentRecord {
  id: string;
  driveId: string;
  applicationId: string;
  studentId: string;
  studentName: string;
  stageId: string;
  assessmentName: string;
  instructions?: string;
  date: string;
  time?: string;
  duration?: string;
  maxScore: number;
  passingScore: number;
  candidateScore?: number;
  passed?: boolean;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export interface InterviewEvaluation {
  technicalScore: number;
  communicationScore: number;
  overallScore: number;
  feedback: string;
  recommendation: 'RECOMMEND' | 'HOLD' | 'NOT_RECOMMEND';
  evaluatedAt: string;
  evaluatorName: string;
}

export type InterviewRoundType =
  | 'SCREENING'
  | 'TECHNICAL'
  | 'CODING'
  | 'HR'
  | 'MANAGERIAL'
  | 'FINAL'
  | 'OTHER';

export interface CandidateInterviewRecord {
  id: string;
  driveId: string;
  applicationId: string;
  studentId: string;
  candidateName: string;
  candidateAvatar: string;
  candidateUniversity: string;
  driveTitle: string;
  company?: string;
  companyLogo?: string;
  stageId: string;
  roundType?: InterviewRoundType;
  roundName?: string;
  roundNumber?: number;
  instructions?: string;
  type: 'ONLINE' | 'OFFLINE' | 'PHONE' | 'VIDEO';
  date: string;
  time: string;
  duration: string;
  meetingLink?: string;
  location?: string;
  interviewerName: string;
  interviewerRole?: string;
  status: 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  evaluation?: InterviewEvaluation;
  createdAt: string;
}

export type CalendarEventType = 'INTERVIEW' | 'ASSESSMENT' | 'MEETING';
export type CalendarEventStatus = 'SCHEDULED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  subtitle: string;
  description?: string;
  company: string;
  companyLogo?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g., "11:00 AM"
  endTime?: string;
  duration: string; // e.g., "45 mins"
  status: CalendarEventStatus;
  meetingUrl?: string;
  location?: string;
  sourceId: string;
  sourceType: 'DRIVE_INTERVIEW' | 'RECRUITER_INTERVIEW' | 'ASSESSMENT' | 'CAREER_MEETING';
  actionUrl: string;
  metadata: {
    roundType?: InterviewRoundType;
    roundName?: string;
    roundNumber?: number;
    isFinalRound?: boolean;
    interviewerName?: string;
    interviewerRole?: string;
    candidateId?: string;
    candidateName?: string;
    candidateAvatar?: string;
    candidateUniversity?: string;
    applicationId?: string;
    driveId?: string;
    position?: string;
    instructions?: string;
    passingScore?: number;
    maxScore?: number;
  };
}

export interface ResultCandidateItem {
  applicationId: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  university: string;
  degree?: string;
  branch?: string;
  rank: number;
  assessmentScore: number;
  interviewScore: number;
  finalScore: number;
  selectionStatus: 'SELECTED' | 'WAITLISTED' | 'REJECTED';
  notes?: string;
}

export interface RecruitmentResultRecord {
  id: string;
  driveId: string;
  driveTitle: string;
  company: string;
  publishedAt: string;
  publishedBy: string;
  isLocked: boolean;
  totalSelected: number;
  totalWaitlisted: number;
  totalRejected: number;
  candidates: ResultCandidateItem[];
}

export interface RecruiterAuditLogEntry {
  id: string;
  driveId?: string;
  driveTitle?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: 'DRIVE' | 'APPLICATION' | 'STAGE' | 'ASSESSMENT' | 'INTERVIEW' | 'EVALUATION' | 'RESULT';
  targetId: string;
  targetName?: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  details: string;
  timestamp: string;
  ipSessionRef?: string;
}

// ==========================================
// ASSESSMENT & PROCTORING MODULE TYPES
// ==========================================

export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER";

export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";
export type QuestionSource = "SYSTEM" | "COMPANY" | "RECRUITER";
export type QuestionCategory = "Technical" | "Aptitude" | "Communication" | "Domain" | "Mixed";

export interface AssessmentQuestion {
  id: string;
  ownerType: QuestionSource;
  ownerId: string; // "system" or companyId or recruiterId
  companyId?: string;
  createdById: string;
  createdByName: string;
  type: QuestionType;
  questionText: string;
  options?: string[]; // Array of option strings
  correctAnswer: string | string[]; // Single string or array of correct option letters/values
  marks: number;
  negativeMarks: number;
  difficulty: QuestionDifficulty;
  category: QuestionCategory;
  topic: string;
  tags: string[];
  explanation?: string;
  isArchived?: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type AssessmentStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type AssessmentMode = "STANDARD" | "PROCTORED";

export interface ProctoringConfig {
  cameraRequired: boolean;
  microphoneRequired: boolean;
  entireScreenRequired: boolean;
  fullscreenRequired: boolean;
  pauseOnCameraStop: boolean;
  pauseOnMicrophoneStop: boolean;
  pauseOnScreenShareStop: boolean;
  maxWindowViolations: number;
  maxFullscreenViolations: number;
  terminateOnViolationLimit: boolean;
}

export interface AssessmentCandidateRules {
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  allowBackNavigation: boolean;
  autoSubmitOnTimeout: boolean;
  showResultImmediately: boolean;
  attemptsAllowed: number;
}

export interface AssessmentSection {
  id: string;
  name: string; // e.g. "Technical Knowledge", "Aptitude", "General Awareness", "Problem Solving"
  description?: string;
  orderIndex: number;
  totalQuestions: number;
  questionCount?: number;
  totalMarks: number;
  negativeMarksPerQuestion: number;
  cutoffMarks?: number; // Sectional minimum qualification
  questionIds?: string[];
  easyCount?: number;
  mediumCount?: number;
  hardCount?: number;
  blueprint?: {
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    topics?: string[];
  };
}

export type CutoffType = "FIXED_SCORE" | "PERCENTAGE" | "TOP_N" | "TOP_PERCENTAGE" | "SECTIONAL";

export interface AssessmentCutoffConfig {
  type?: CutoffType;
  value?: number; // e.g., 70 for 70 pts or 70%, 20 for Top 20 or Top 20%
  cutoffType: CutoffType;
  cutoffValue: number;
  sectionalMinimums?: Record<string, number>; // sectionId -> min score or percentage
  sectionalCutoffs?: { sectionId: string; minMarks: number }[];
  description?: string;
}

export type MeritCriterion = "TOTAL_SCORE" | "SECTION_SCORE" | "SUBMISSION_TIME" | "PERCENTAGE" | "ACCURACY";

export interface AssessmentMeritConfig {
  primaryCriterion: MeritCriterion;
  secondaryCriterion?: MeritCriterion;
  secondarySectionId?: string;
  tertiaryCriterion?: MeritCriterion;
  tertiarySectionId?: string;
  tieBreakerRule?: "SUBMISSION_TIME" | "FEWEST_INCORRECT" | "ACCURACY" | "SECTION_PRIORITY";
  tieBreaker?: string;
}

export interface AssessmentSnapshotQuestion {
  id: string;
  originalQuestionId: string;
  sectionId?: string;
  sectionName?: string;
  source: QuestionSource;
  type: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer: string | string[]; // Authoritative answer, masked before submit
  marks: number;
  negativeMarks: number;
  difficulty: QuestionDifficulty;
  category: QuestionCategory;
  topic: string;
  orderIndex: number;
  explanation?: string;
}

export interface AssessmentRecord {
  id: string;
  version: number;
  title: string;
  description: string;
  instructions: string;
  driveId: string;
  driveTitle?: string;
  companyId: string;
  companyName: string;
  createdById: string;
  createdByName: string;
  category: QuestionCategory;
  examinationType?: string;
  durationMinutes: number;
  startDateTime?: string;
  endDateTime?: string;
  status: AssessmentStatus;
  mode: AssessmentMode;
  proctoringConfig: ProctoringConfig;
  candidateRules: AssessmentCandidateRules;
  sections?: AssessmentSection[];
  cutoffConfig?: AssessmentCutoffConfig;
  meritConfig?: AssessmentMeritConfig;
  totalMarks: number;
  passingMarks: number;
  passingPercentage: number;
  negativeMarkingEnabled: boolean;
  negativeMarkingRate?: number; // e.g. 0.33, 0.5, 0.25
  negativeMarkingType?: "FIXED" | "PERCENTAGE" | "NONE";
  questionIds: string[];
  questionSnapshots?: AssessmentSnapshotQuestion[];
  assignedCandidateIds: string[]; // Application IDs or Student IDs
  isVersionLocked?: boolean;
  schedule?: {
    examDate?: string;
    windowStart?: string;
    windowEnd?: string;
    lateEntryGraceMinutes?: number;
    maxAttempts?: number;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type AttemptStatus =
  | "NOT_STARTED"
  | "ENVIRONMENT_CHECK"
  | "READY"
  | "ACTIVE"
  | "PAUSED"
  | "SUBMITTED"
  | "AUTO_SUBMITTED"
  | "EXPIRED"
  | "TERMINATED"
  | "ABANDONED";

export interface AttemptAnswer {
  questionId: string;
  sectionId?: string;
  answer: string | string[];
  isAnswered: boolean;
  answeredAt: string;
  updatedAt: string;
  isCorrect?: boolean;
  marksAwarded?: number;
}

export interface SectionScoreSummary {
  sectionId: string;
  sectionName: string;
  score: number;
  maxMarks: number;
  percentage: number;
  passed?: boolean;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  assessmentVersion?: number;
  assessmentTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  applicationId: string;
  driveId: string;
  attemptNumber: number;
  sessionToken: string;
  status: AttemptStatus;
  startedAt?: string;
  expiresAt?: string;
  submittedAt?: string;
  durationSecondsTaken?: number;
  lastActivityAt: string;
  questionOrder: string[]; // Deterministic question order per attempt
  answers: Record<string, AttemptAnswer>; // questionId -> AttemptAnswer
  sectionScores?: Record<string, SectionScoreSummary>;
  totalScore?: number;
  maxScore: number;
  percentage?: number;
  passed?: boolean;
  cutoffCleared?: boolean;
  meritRank?: number;
  shortlistStatus?: "PENDING" | "SHORTLISTED" | "WAITLISTED" | "REJECTED" | "MOVED_TO_INTERVIEW" | "INTERVIEW_SCHEDULED";
  integrityStatus: "CLEAN" | "REVIEW" | "TERMINATED";
  violationCount: number;
  pauseReason?: string;
  terminationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionObjection {
  id: string;
  assessmentId: string;
  attemptId: string;
  candidateId: string;
  candidateName: string;
  questionId: string;
  questionText?: string;
  objectionType: "WRONG_ANSWER_KEY" | "AMBIGUOUS_QUESTION" | "INCORRECT_QUESTION" | "TECHNICAL_ISSUE";
  description: string;
  proposedAnswer?: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  reviewerId?: string;
  reviewerName?: string;
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AssessmentAuthorization {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  assessmentId: string;
  assessmentTitle?: string;
  applicationId: string;
  driveId: string;
  examDate: string;
  examWindowStart?: string;
  examWindowEnd?: string;
  durationMinutes: number;
  maxAttempts?: number;
  attemptNumber?: number;
  attemptsUsed?: number;
  lastAttemptAt?: string;
  status: "AUTHORIZED" | "USED" | "EXPIRED" | "CANCELLED";
  authorizedAt?: string;
  createdAt?: string;
}

export type IntegrityEventType =
  | "TAB_SWITCH"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "FULLSCREEN_EXIT"
  | "FULLSCREEN_ENTER"
  | "CAMERA_STARTED"
  | "CAMERA_STOPPED"
  | "MICROPHONE_STARTED"
  | "MICROPHONE_STOPPED"
  | "SCREEN_SHARE_STARTED"
  | "SCREEN_SHARE_STOPPED"
  | "NETWORK_INTERRUPTION"
  | "SESSION_RECONNECTED"
  | "ASSESSMENT_PAUSED"
  | "ASSESSMENT_RESUMED"
  | "ASSESSMENT_TERMINATED"
  | "ASSESSMENT_SUBMITTED";

export type IntegrityActionTaken =
  | "NONE"
  | "WARNING"
  | "FINAL_WARNING"
  | "PAUSE"
  | "REQUIRE_RECOVERY"
  | "TERMINATE";

export interface AssessmentIntegrityEvent {
  id: string;
  attemptId: string;
  assessmentId: string;
  candidateId: string;
  candidateName: string;
  eventType: IntegrityEventType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: string;
  metadata?: Record<string, any>;
  actionTaken: IntegrityActionTaken;
}

export interface ParsedQuestionCandidate {
  id: string;
  tempId: string;
  questionNumber?: number;
  rawIndex?: number;
  questionText: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string | string[];
  marks: number;
  negativeMarks: number;
  difficulty: QuestionDifficulty;
  category: QuestionCategory;
  topic: string;
  tags?: string[];
  explanation?: string;
  status: "READY" | "NEEDS_REVIEW" | "DUPLICATE" | "INVALID";
  validationStatus: "READY" | "NEEDS_REVIEW" | "DUPLICATE" | "INVALID";
  reviewReason?: string;
  validationIssues: string[];
  duplicateStatus: "UNIQUE" | "LIKELY_DUPLICATE" | "EXACT_DUPLICATE";
  duplicateReason?: string;
  matchedExistingQuestionId?: string;
  matchedQuestionText?: string;
}

export interface QuestionImportRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number;
  uploadedById?: string;
  uploadedByName?: string;
  companyId: string;
  totalDetected: number;
  importedCount: number;
  skippedCount?: number;
  duplicateCount?: number;
  failedCount?: number;
  status?: "COMPLETED" | "PARTIAL" | "FAILED";
  importedAt: string;
  importedBy: string;
  questionIds?: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
}

// ==========================================
// INSTITUTIONAL & COLLEGE PORTAL TYPES
// ==========================================

export type CollegeStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
export type CollegeVerificationStatus = "VERIFIED" | "PENDING" | "REJECTED" | "NEEDS_REVIEW";
export type CollegeParticipationStatus = "OPEN" | "UNDER_REVIEW" | "APPROVED" | "ACTIVE" | "CLOSED";

export interface CollegePlacementOfficer {
  name: string;
  email: string;
  phone?: string;
  designation?: string;
}

export interface CollegePlacementPolicy {
  minAttendancePercentage?: number;
  maxOffersAllowed?: number;
  dreamTierThresholdLpa?: number;
  allowSimultaneousInterview?: boolean;
  rules: string[];
}

export interface CollegeDepartment {
  id: string;
  collegeId: string;
  name: string;
  code: string;
  headOfDepartment?: string;
  studentCount: number;
  eligibleCount: number;
  placedCount: number;
  placementRate: number;
  activeDrivesCount: number;
}

export interface CollegeBatch {
  id: string;
  collegeId: string;
  year: number;
  degree: string;
  totalStudents: number;
  eligibleStudents: number;
  placedStudents: number;
  unplacedStudents: number;
  activeApplications: number;
  totalOffers: number;
  placementRate?: number;
}

export interface CollegeDriveParticipation {
  id: string;
  collegeId: string;
  driveId: string;
  driveTitle?: string;
  companyName?: string;
  status: CollegeParticipationStatus;
  approvedByCollege?: boolean;
  approvalNotes?: string;
  maxCandidates?: number;
  registeredStudentIds?: string[];
  approvedAt?: string;
  approvedBy?: string;
  registeredStudentsCount: number;
  eligibleStudentsCount: number;
  shortlistedCount: number;
  interviewedCount: number;
  selectedCount: number;
  offersCount: number;
  notes?: string;
  updatedAt: string;
}

export interface CollegeRecord {
  id: string;
  name: string;
  code: string;
  slug: string;
  logo: string;
  bannerImage?: string;
  location: string;
  website: string;
  establishedYear: number;
  status: CollegeStatus;
  placementOfficer: CollegePlacementOfficer;
  verificationStatus: CollegeVerificationStatus;
  departments: CollegeDepartment[];
  batches: CollegeBatch[];
  placementPolicy: CollegePlacementPolicy;
  stats: {
    totalStudents: number;
    eligibleStudents: number;
    placedStudents: number;
    placementRate: number;
    activeDrives: number;
    totalOffers: number;
    companiesEngaged: number;
    pendingVerifications: number;
    averagePackage: string;
    highestPackage: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CollegeProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  googleId?: string;
  emailVerified?: boolean;
  authProvider?: 'credentials' | 'google';
  collegeId: string;
  collegeName: string;
  title: string;
  department?: string;
  phone?: string;
  bio?: string;
}
