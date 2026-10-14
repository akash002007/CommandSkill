"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  User,
  UserRole,
  StudentProfile,
  RecruiterProfile,
  VerificationType,
  VerificationStatus,
  StudentVerificationRequest,
  AdminProfile,
  CollegeProfile,
} from "@/types";
import { defaultStudentUser, defaultRecruiterUser, defaultAdminUser, defaultCollegeUser } from "@/data/mock-users";
import { isUniversityEmail } from "@/lib/utils";

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoaded: boolean;
  login: (email: string, role: UserRole, name?: string) => void;
  loginWithGoogle: (
    credential: string,
    role?: UserRole,
    metadata?: { university?: string; company?: string }
  ) => Promise<{
    success: boolean;
    user?: User;
    token?: string;
    refreshToken?: string;
    isNewUser?: boolean;
    redirectUrl?: string;
    error?: string;
  }>;
  loginWithCredentials: (
    email: string,
    password: string,
    role?: UserRole
  ) => Promise<{
    success: boolean;
    user?: User;
    token?: string;
    refreshToken?: string;
    redirectUrl?: string;
    error?: string;
  }>;
  loginWithDemo: (role: UserRole) => Promise<{
    success: boolean;
    user?: User;
    token?: string;
    refreshToken?: string;
    redirectUrl?: string;
    error?: string;
  }>;
  resetPassword: (
    email: string,
    newPassword?: string
  ) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  registerStudent: (basicData: {
    name: string;
    email: string;
    university: string;
    password?: string;
  }) => Promise<StudentProfile>;
  registerRecruiter: (data: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    companyName: string;
    companyWebsite?: string;
    companyLocation?: string;
    companySize?: string;
    companyType?: string;
    jobTitle?: string;
    department?: string;
    recruiterRole?: string;
    recruiterUsage?: string[];
  }) => Promise<RecruiterProfile> | RecruiterProfile;
  logout: () => void;
  switchRole: (newRole: UserRole) => Promise<{
    success: boolean;
    user?: User;
    role?: UserRole;
    redirectUrl?: string;
    error?: string;
  }>;
  updateStudentProfile: (updates: Partial<StudentProfile>) => void;
  updateRecruiterProfile: (updates: Partial<RecruiterProfile>) => void;
  submitStudentVerification: (data: {
    verificationType: VerificationType;
    documentName: string;
    documentSize: string;
    documentUrl: string;
    personalEmail?: string;
    college?: string;
    degree?: string;
    branch?: string;
    year?: string;
    studentIdNumber?: string;
    graduationYear?: string;
    file?: File;
  }) => Promise<{
    success: boolean;
    status: string;
    verificationStatus: VerificationStatus;
    failureReason?: string;
    confidenceScore?: number;
    document?: any;
    request?: StudentVerificationRequest;
  }>;
  requestManualReview: (data: {
    documentId?: string;
    reason: string;
    documentName?: string;
    documentSize?: string;
  }) => Promise<{
    success: boolean;
    status: string;
    verificationStatus: VerificationStatus;
  }>;
  resubmitStudentVerification: (data: {
    documentName: string;
    documentSize: string;
    documentUrl: string;
    personalEmail?: string;
    notes?: string;
  }) => Promise<void>;
  reviewVerification: (status: "approved" | "rejected", rejectionReason?: string) => Promise<void>;
  resetVerificationForResubmission: () => void;
  refreshUserSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "commandskill_auth_user_v1";
const ROLE_STORAGE_KEY = "commandskill_auth_role_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [isLoaded, setIsLoaded] = useState(false);

  // Normalize role to ensure legacy support maps correctly
  const normalizeRole = (rawRole: string): UserRole => {
    const r = rawRole.toUpperCase();
    if (["STUDENT", "RECRUITER", "COMPANY_ADMIN", "COLLEGE_ADMIN", "COLLEGE_PLACEMENT_OFFICER", "VERIFICATION_OFFICER", "PLATFORM_ADMIN", "SUPER_ADMIN"].includes(r)) {
      return r as UserRole;
    }
    if (r === "ADMIN") return "PLATFORM_ADMIN";
    return "STUDENT";
  };

  // Helper to persist session
  const persistSession = (newUser: User | null, newRole: UserRole) => {
    try {
      if (newUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
        localStorage.setItem(ROLE_STORAGE_KEY, newRole);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(ROLE_STORAGE_KEY);
      }
    } catch {
      console.warn("Failed to save auth session to localStorage");
    }
  };

  const refreshUserSession = useCallback(async () => {
    if (!user || (user.role || "").toLowerCase() !== "student") return;
    try {
      const res = await fetch(`/api/student/verification?studentId=${encodeURIComponent(user.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.student) {
          setUser((prev) => {
            if (!prev) return null;
            const rawStatus = data.student.verificationStatus || data.verificationStatus;
            const updated = {
              ...prev,
              ...data.student,
              verificationStatus: rawStatus,
              accountAccessStatus:
                data.student.accountAccessStatus ||
                data.accountAccessStatus ||
                (rawStatus === "approved" || rawStatus === "VERIFIED"
                  ? "ACTIVE"
                  : "RESTRICTED"),
              rejectionReason:
                data.student.rejectionReason || data.request?.rejectionReason,
              verificationRequest: data.request
                ? {
                    id: data.request.verificationId,
                    verificationId: data.request.verificationId,
                    studentId: data.request.studentId,
                    studentName: data.request.student.fullName,
                    university: data.request.student.college,
                    universityEmail: data.request.student.collegeEmail,
                    verificationType: data.request.verificationMethod === "College Email" ? "university_email" : data.request.verificationMethod === "Payment Receipt" ? "payment_receipt" : "student_id_card",
                    status: data.request.status === "Approved" ? "approved" : data.request.status === "Rejected" ? "rejected" : data.request.status === "Needs Information" ? "needs_information" : "pending",
                    documentName: data.request.document?.fileName || "Document.pdf",
                    documentSize: data.request.document?.fileSize || "1.5 MB",
                    documentUrl: data.request.document?.fileUrl || "#",
                    personalEmail: data.request.student.email,
                    submittedAt: data.request.submittedAt,
                    reviewedAt: data.request.reviewedAt,
                    reviewerName: data.request.reviewedBy,
                    rejectionReason: data.request.rejectionReason,
                    adminNotes: data.request.adminNotes,
                  }
                : (prev as StudentProfile).verificationRequest,
            } as StudentProfile;
            persistSession(updated, updated.role);
            return updated;
          });
        }
      }
    } catch (err) {
      console.warn("Session refresh error:", err);
    }
  }, [user]);

  // Initialize from localStorage and cookies on mount & sync with server
  useEffect(() => {
    try {
      const cookieToken = typeof document !== "undefined"
        ? document.cookie
            .split("; ")
            .find((row) => row.startsWith("commandskill_access_token="))
            ?.split("=")[1]
        : null;
      const localToken = typeof localStorage !== "undefined" ? localStorage.getItem("commandskill_access_token") : null;
      const effectiveToken = cookieToken || localToken;

      const storedRole = localStorage.getItem(ROLE_STORAGE_KEY) as UserRole | null;
      const storedUserJson = localStorage.getItem(AUTH_STORAGE_KEY);

      // If no valid auth token exists in either cookie or localStorage, clear stale local session
      if (!effectiveToken) {
        setUser(null);
        setRole("STUDENT");
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(ROLE_STORAGE_KEY);
      } else if (storedUserJson) {
        const parsedUser = JSON.parse(storedUserJson);
        setUser(parsedUser);
        const resolvedRole = normalizeRole(storedRole || parsedUser.role || "STUDENT");
        setRole(resolvedRole);

        // If student, sync latest from backend
        if (resolvedRole === "STUDENT" && parsedUser.id) {
          fetch(`/api/student/verification?studentId=${encodeURIComponent(parsedUser.id)}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.student) {
                const synched: StudentProfile = {
                  ...parsedUser,
                  ...d.student,
                  verificationStatus: d.student.verificationStatus || d.verificationStatus,
                };
                setUser(synched);
                persistSession(synched, synched.role);
              }
            })
            .catch(() => {});
        }
      }
    } catch {
      console.warn("Failed to load auth session from localStorage");
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const login = (email: string, rawRole: UserRole, customName?: string) => {
    let authenticatedUser: User;
    const selectedRole = normalizeRole(rawRole);

    if (["RECRUITER", "COMPANY_ADMIN"].includes(selectedRole)) {
      authenticatedUser = {
        ...defaultRecruiterUser,
        email: email || defaultRecruiterUser.email,
        name: customName || defaultRecruiterUser.name,
        role: selectedRole,
      };
    } else if (["COLLEGE_ADMIN", "COLLEGE_PLACEMENT_OFFICER"].includes(selectedRole)) {
      authenticatedUser = {
        ...defaultCollegeUser,
        email: email || defaultCollegeUser.email,
        name: customName || defaultCollegeUser.name,
        role: selectedRole,
      } as CollegeProfile;
    } else if (["PLATFORM_ADMIN", "SUPER_ADMIN", "VERIFICATION_OFFICER"].includes(selectedRole)) {
      authenticatedUser = {
        ...defaultAdminUser,
        email: email || defaultAdminUser.email,
        name: customName || defaultAdminUser.name,
        role: selectedRole,
      } as AdminProfile;
    } else {
      authenticatedUser = {
        ...defaultStudentUser,
        email: email || defaultStudentUser.email,
        name: customName || defaultStudentUser.name,
        role: selectedRole,
      };
    }

    setUser(authenticatedUser);
    setRole(selectedRole);
    persistSession(authenticatedUser, selectedRole);

    // Sync if student
    if ((selectedRole || "").toLowerCase() === "student") {
      fetch(`/api/student/verification?studentId=${encodeURIComponent(authenticatedUser.id)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.student) {
            const synched: StudentProfile = {
              ...(authenticatedUser as StudentProfile),
              ...d.student,
              verificationStatus: d.student.verificationStatus || d.verificationStatus,
            };
            setUser(synched);
            persistSession(synched, "student");
          }
        })
        .catch(() => {});
    }
  };

  const loginWithGoogle = async (
    credential: string,
    targetRole: UserRole = "STUDENT",
    metadata?: { university?: string; company?: string }
  ) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential,
          role: targetRole,
          university: metadata?.university,
          company: metadata?.company,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const mappedRole = normalizeRole(data.user.role);
        setUser({ ...data.user, role: mappedRole });
        setRole(mappedRole);
        persistSession({ ...data.user, role: mappedRole }, mappedRole);

        try {
          if (data.token) {
            localStorage.setItem("commandskill_access_token", data.token);
          }
          if (data.refreshToken) {
            localStorage.setItem("commandskill_refresh_token", data.refreshToken);
          }
        } catch {
          console.warn("Could not save auth tokens to localStorage");
        }

        return {
          success: true,
          user: data.user,
          token: data.token,
          refreshToken: data.refreshToken,
          isNewUser: data.isNewUser,
          redirectUrl: data.redirectUrl,
        };
      } else {
        return {
          success: false,
          error: data.error || "Google authentication failed",
        };
      }
    } catch {
      return {
        success: false,
        error: "Network error during Google authentication. Please try again.",
      };
    }
  };

  const loginWithDemo = async (targetRole: UserRole) => {
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const mappedRole = normalizeRole(data.user.role);
        const resolvedUser = { ...data.user, role: mappedRole };
        setUser(resolvedUser);
        setRole(mappedRole);
        persistSession(resolvedUser, mappedRole);

        try {
          if (data.token) {
            localStorage.setItem("commandskill_access_token", data.token);
            // Ensure cookie is immediately available in client document
            document.cookie = `commandskill_access_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
          }
          if (data.refreshToken) {
            localStorage.setItem("commandskill_refresh_token", data.refreshToken);
            document.cookie = `commandskill_refresh_token=${data.refreshToken}; path=/; max-age=2592000; SameSite=Lax`;
          }
          if (data.token) {
            document.cookie = `sb-access-token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
          }
        } catch {
          console.warn("Could not save auth tokens to storage");
        }

        return {
          success: true,
          user: resolvedUser,
          token: data.token,
          refreshToken: data.refreshToken,
          redirectUrl: data.redirectUrl,
        };
      } else {
        return {
          success: false,
          error: data.error || "Demo authentication failed",
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Demo login service temporarily unreachable. Please try again.",
      };
    }
  };

  const loginWithCredentials = async (email: string, password: string, targetRole?: UserRole) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: targetRole }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const mappedRole = normalizeRole(data.user.role);
        const resolvedUser = { ...data.user, role: mappedRole };
        setUser(resolvedUser);
        setRole(mappedRole);
        persistSession(resolvedUser, mappedRole);

        try {
          if (data.token) {
            localStorage.setItem("commandskill_access_token", data.token);
            document.cookie = `commandskill_access_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = `sb-access-token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
          }
          if (data.refreshToken) {
            localStorage.setItem("commandskill_refresh_token", data.refreshToken);
            document.cookie = `commandskill_refresh_token=${data.refreshToken}; path=/; max-age=2592000; SameSite=Lax`;
          }
        } catch {
          console.warn("Could not save auth tokens to storage");
        }

        return {
          success: true,
          user: resolvedUser,
          token: data.token,
          refreshToken: data.refreshToken,
          redirectUrl: data.redirectUrl,
        };
      } else {
        return {
          success: false,
          error: data.error || "Invalid email or password. Please verify your credentials.",
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Login service temporarily unavailable. Please try again.",
      };
    }
  };

  const resetPassword = async (email: string, newPassword?: string) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || "Password reset failed" };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || "Service temporarily unavailable" };
    }
  };

  const registerStudent = async (basicData: {
    name: string;
    email: string;
    university: string;
    password?: string;
  }): Promise<StudentProfile> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "student",
          name: basicData.name.trim(),
          email: basicData.email.trim(),
          password: basicData.password || "commandskill123",
          university: basicData.university.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const mappedRole = normalizeRole(data.user.role);
        const resolvedUser = { ...data.user, role: mappedRole } as StudentProfile;
        setUser(resolvedUser);
        setRole(mappedRole);
        persistSession(resolvedUser, mappedRole);

        try {
          if (data.token) {
            localStorage.setItem("commandskill_access_token", data.token);
            document.cookie = `commandskill_access_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = `sb-access-token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
          }
          if (data.refreshToken) {
            localStorage.setItem("commandskill_refresh_token", data.refreshToken);
            document.cookie = `commandskill_refresh_token=${data.refreshToken}; path=/; max-age=2592000; SameSite=Lax`;
          }
        } catch {}

        return resolvedUser;
      } else {
        throw new Error(data.error || "Failed to register student account");
      }
    } catch (err: any) {
      if (err?.message && !err.message.includes("Failed to fetch")) {
        throw err;
      }

      // Fallback local registration if network completely unavailable
      const isUni = isUniversityEmail(basicData.email);
      const fallbackStudent: StudentProfile = {
        ...defaultStudentUser,
        id: `student_${Date.now()}`,
        name: basicData.name.trim(),
        email: basicData.email.trim(),
        university: basicData.university.trim(),
        role: "student",
        hasUniversityEmail: isUni,
        isUniversityEmail: isUni,
        accountStatus: isUni ? "onboarding_complete" : "account_created",
        verificationStatus: isUni ? "approved" : "not_submitted",
        onboardingCompleted: isUni,
      };
      setUser(fallbackStudent);
      setRole("STUDENT");
      persistSession(fallbackStudent, "STUDENT");
      return fallbackStudent;
    }
  };

  const registerRecruiter = async (data: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    companyName: string;
    companyWebsite?: string;
    companyLocation?: string;
    companySize?: string;
    companyType?: string;
    jobTitle?: string;
    department?: string;
    recruiterRole?: string;
    recruiterUsage?: string[];
  }): Promise<RecruiterProfile> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "recruiter",
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim() || "",
          password: data.password || "recruiter123",
          companyName: data.companyName.trim(),
          companyWebsite: data.companyWebsite?.trim(),
          companyLocation: data.companyLocation?.trim(),
          companySize: data.companySize,
          companyType: data.companyType,
          jobTitle: data.jobTitle?.trim(),
          department: data.department?.trim(),
          recruiterRole: data.recruiterRole,
          recruiterUsage: data.recruiterUsage,
        }),
      });

      const resData = await res.json();

      if (res.ok && resData.success && resData.user) {
        const mappedRole = normalizeRole(resData.user.role);
        const resolvedUser = { ...resData.user, role: mappedRole } as RecruiterProfile;
        setUser(resolvedUser);
        setRole(mappedRole);
        persistSession(resolvedUser, mappedRole);

        try {
          if (resData.token) {
            localStorage.setItem("commandskill_access_token", resData.token);
            document.cookie = `commandskill_access_token=${resData.token}; path=/; max-age=604800; SameSite=Lax`;
            document.cookie = `sb-access-token=${resData.token}; path=/; max-age=604800; SameSite=Lax`;
          }
          if (resData.refreshToken) {
            localStorage.setItem("commandskill_refresh_token", resData.refreshToken);
            document.cookie = `commandskill_refresh_token=${resData.refreshToken}; path=/; max-age=2592000; SameSite=Lax`;
          }
        } catch {}

        return resolvedUser;
      } else {
        throw new Error(resData.error || "Failed to register recruiter account");
      }
    } catch (err: any) {
      if (err?.message && !err.message.includes("Failed to fetch")) {
        throw err;
      }

      const fallbackRecruiter: RecruiterProfile = {
        ...defaultRecruiterUser,
        id: `recruiter_${Date.now()}`,
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || "",
        role: "recruiter",
        company: data.companyName.trim() || "Enterprise Partner",
        verificationStatus: "Recruiter Verified",
      };
      setUser(fallbackRecruiter);
      setRole("RECRUITER");
      persistSession(fallbackRecruiter, "RECRUITER");
      return fallbackRecruiter;
    }
  };

  const updateRecruiterProfile = (updates: Partial<RecruiterProfile>) => {
    if (!user || user.role !== "recruiter") return;
    const updated = { ...user, ...updates } as RecruiterProfile;
    setUser(updated);
    persistSession(updated, "recruiter");
  };

  const logout = () => {
    setUser(null);
    setRole("STUDENT");
    persistSession(null, "STUDENT");
    try {
      localStorage.removeItem("commandskill_access_token");
      localStorage.removeItem("commandskill_refresh_token");
      document.cookie = "commandskill_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "commandskill_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } catch {
      // ignore
    }
  };

  const switchRole = async (
    rawRole: UserRole
  ): Promise<{
    success: boolean;
    user?: User;
    role?: UserRole;
    redirectUrl?: string;
    error?: string;
  }> => {
    try {
      // 1. Properly terminate or clear previous authenticated user state from local storage & cookies
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(ROLE_STORAGE_KEY);
      localStorage.removeItem("commandskill_access_token");
      localStorage.removeItem("commandskill_refresh_token");

      document.cookie = "commandskill_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "commandskill_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      // 2. Map role to backend demo key
      let roleKey = "student";
      const r = (rawRole || "").toUpperCase();
      if (r === "RECRUITER" || r === "COMPANY_ADMIN") {
        roleKey = "recruiter";
      } else if (r === "COLLEGE_ADMIN" || r === "COLLEGE_PLACEMENT_OFFICER" || r === "COLLEGE") {
        roleKey = "college_admin";
      } else if (r === "PLATFORM_ADMIN" || r === "ADMIN" || r === "SUPER_ADMIN") {
        roleKey = "platform_admin";
      }

      // 3. Authenticate newly selected account via existing backend authentication endpoint
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleKey }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const canonicalRole = normalizeRole(data.user.role);
        const resolvedUser = { ...data.user, role: canonicalRole };

        setUser(resolvedUser);
        setRole(canonicalRole);
        persistSession(resolvedUser, canonicalRole);

        if (data.token) {
          localStorage.setItem("commandskill_access_token", data.token);
          document.cookie = `commandskill_access_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
          document.cookie = `sb-access-token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        }
        if (data.refreshToken) {
          localStorage.setItem("commandskill_refresh_token", data.refreshToken);
          document.cookie = `commandskill_refresh_token=${data.refreshToken}; path=/; max-age=2592000; SameSite=Lax`;
        }

        const destination =
          data.redirectUrl ||
          (canonicalRole === "PLATFORM_ADMIN"
            ? "/admin"
            : canonicalRole === "COLLEGE_ADMIN"
            ? "/college/dashboard"
            : canonicalRole === "RECRUITER"
            ? "/dashboard/recruiter"
            : "/dashboard");

        return {
          success: true,
          user: resolvedUser,
          role: canonicalRole,
          redirectUrl: destination,
        };
      } else {
        throw new Error(data.error || "Failed to switch account role");
      }
    } catch (err: any) {
      console.error("switchRole error:", err);
      return {
        success: false,
        error: err?.message || "Failed to switch account role",
      };
    }
  };

  const updateStudentProfile = (updates: Partial<StudentProfile>) => {
    if (!user || user.role !== "student") return;
    const updated = { ...user, ...updates } as StudentProfile;
    setUser(updated);
    persistSession(updated, "student");

    // Push to server API in background
    fetch(`/api/admin/students/${encodeURIComponent(updated.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).catch(() => {});
  };

  const submitStudentVerification = async (data: {
    verificationType: VerificationType;
    documentName: string;
    documentSize: string;
    documentUrl: string;
    personalEmail?: string;
    college?: string;
    degree?: string;
    branch?: string;
    year?: string;
    studentIdNumber?: string;
    graduationYear?: string;
    file?: File;
  }): Promise<{
    success: boolean;
    status: string;
    verificationStatus: VerificationStatus;
    failureReason?: string;
    confidenceScore?: number;
    document?: any;
    request?: StudentVerificationRequest;
  }> => {
    const student = user as StudentProfile;
    const studentId = student?.id || `student_${Date.now()}`;

    const payload = {
      studentId,
      studentName: student?.name || "Student",
      email: student?.email || "student@university.edu",
      college: data.college || student?.university || "University",
      degree: data.degree || student?.degree || "B.Tech",
      branch: data.branch || student?.branch || student?.specialization || "Computer Science",
      year: data.year || student?.yearOfStudy || "3rd Year",
      studentIdNumber: data.studentIdNumber || "STU-2026-REG",
      graduationYear: data.graduationYear || String(student?.graduationYear || 2027),
      phone: student?.phone,
      verificationType: data.verificationType,
      documentName: data.documentName,
      documentSize: data.documentSize,
      documentUrl: data.documentUrl,
      personalEmail: data.personalEmail || student?.personalEmail,
    };

    let resultJson: any = null;
    try {
      let res: Response;
      if (data.file) {
        const fd = new FormData();
        fd.append("file", data.file);
        fd.append("studentId", studentId);
        fd.append("verificationType", data.verificationType);
        if (data.personalEmail) fd.append("personalEmail", data.personalEmail);
        res = await fetch("/api/student/verification", {
          method: "POST",
          body: fd,
        });
      } else {
        res = await fetch("/api/student/verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        resultJson = await res.json();
      } else {
        resultJson = await res.json().catch(() => ({}));
      }
    } catch (err) {
      console.warn("Server verification submission error:", err);
    }

    const autoPassed =
      resultJson?.status === "AUTO_VERIFIED" || resultJson?.verificationStatus === "approved";
    const newStatus: VerificationStatus = autoPassed ? "approved" : "verification_failed";

    const updatedProfile: StudentProfile = {
      ...student,
      verificationStatus: newStatus,
      personalEmail: data.personalEmail || student?.personalEmail,
      verificationRequest: autoPassed
        ? {
            id: `req_${Date.now()}`,
            studentId,
            studentName: payload.studentName,
            university: payload.college,
            universityEmail: payload.email,
            verificationType: data.verificationType,
            status: "approved",
            documentName: data.documentName,
            documentSize: data.documentSize,
            documentUrl: data.documentUrl,
            submittedAt: new Date().toLocaleString(),
          }
        : undefined,
    };

    setUser(updatedProfile);
    persistSession(updatedProfile, "student");

    return {
      success: autoPassed,
      status: resultJson?.status || (autoPassed ? "AUTO_VERIFIED" : "VERIFICATION_FAILED"),
      verificationStatus: newStatus,
      failureReason: resultJson?.failureReason,
      confidenceScore: resultJson?.confidenceScore,
      document: resultJson?.document,
      request: updatedProfile.verificationRequest || undefined,
    };
  };

  const requestManualReview = async (data: {
    documentId?: string;
    reason: string;
    documentName?: string;
    documentSize?: string;
  }): Promise<{
    success: boolean;
    status: string;
    verificationStatus: VerificationStatus;
  }> => {
    const student = user as StudentProfile;
    const studentId = student?.id || "student_01";

    try {
      const res = await fetch("/api/student/verification/manual-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          documentId: data.documentId,
          reason: data.reason,
          documentName: data.documentName,
          documentSize: data.documentSize,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const updatedProfile: StudentProfile = {
          ...student,
          verificationStatus: "manual_review_requested",
        };
        setUser(updatedProfile);
        persistSession(updatedProfile, "student");
        return {
          success: true,
          status: "MANUAL_REVIEW_REQUESTED",
          verificationStatus: "manual_review_requested",
        };
      }
    } catch (err) {
      console.warn("Manual review request error:", err);
    }

    const fallbackProfile: StudentProfile = {
      ...student,
      verificationStatus: "manual_review_requested",
    };
    setUser(fallbackProfile);
    persistSession(fallbackProfile, "student");
    return {
      success: true,
      status: "MANUAL_REVIEW_REQUESTED",
      verificationStatus: "manual_review_requested",
    };
  };

  const resubmitStudentVerification = async (data: {
    documentName: string;
    documentSize: string;
    documentUrl: string;
    personalEmail?: string;
    notes?: string;
  }): Promise<void> => {
    if (!user || user.role !== "student") return;
    const student = user as StudentProfile;
    const verificationId = student.verificationRequest?.verificationId || "VER-CURRENT";

    try {
      const res = await fetch(`/api/student/verification/${encodeURIComponent(verificationId)}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          ...data,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.student) {
          setUser(json.student);
          persistSession(json.student, "student");
          return;
        }
      }
    } catch (err) {
      console.warn("Resubmit error:", err);
    }

    // Local fallback update
    const updatedRequest: StudentVerificationRequest = {
      ...(student.verificationRequest || {
        id: `req_${Date.now()}`,
        verificationId: `VER-2026-${Date.now().toString().slice(-6)}`,
        studentId: student.id,
        studentName: student.name,
        university: student.university,
        universityEmail: student.email,
        verificationType: "payment_receipt",
      }),
      status: "pending",
      documentName: data.documentName,
      documentSize: data.documentSize,
      documentUrl: data.documentUrl,
      personalEmail: data.personalEmail || student.personalEmail,
      submittedAt: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      rejectionReason: undefined,
    };

    const updatedProfile: StudentProfile = {
      ...student,
      verificationStatus: "pending",
      verificationRequest: updatedRequest,
    };

    setUser(updatedProfile);
    persistSession(updatedProfile, "student");
  };

  const reviewVerification = async (status: "approved" | "rejected", rejectionReason?: string) => {
    if (!user || user.role !== "student") return;
    const student = user as StudentProfile;
    const currentReq = student.verificationRequest;
    const verId = currentReq?.verificationId || currentReq?.id || "VER-2026-004812";

    try {
      if (status === "approved") {
        await fetch(`/api/admin/verification/${encodeURIComponent(verId)}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminName: "CommandSkill Admin Team" }),
        });
      } else {
        await fetch(`/api/admin/verification/${encodeURIComponent(verId)}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: rejectionReason || "Uploaded document was unreadable or expired.",
            adminName: "CommandSkill Admin Team",
          }),
        });
      }
    } catch (err) {
      console.warn("Review API error:", err);
    }

    const updatedReq: StudentVerificationRequest | null = currentReq
      ? {
          ...currentReq,
          status,
          reviewedAt: new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          reviewerName: "CommandSkill Administration Team",
          rejectionReason:
            status === "rejected"
              ? rejectionReason || "The uploaded document is unreadable, expired, or invalid. Please upload a clear valid copy."
              : undefined,
        }
      : null;

    const updatedProfile: StudentProfile = {
      ...student,
      verificationStatus: status,
      verificationRequest: updatedReq,
    };

    setUser(updatedProfile);
    persistSession(updatedProfile, "student");
  };

  const resetVerificationForResubmission = async () => {
    if (!user || (user.role || "").toLowerCase() !== "student") return;
    const student = user as StudentProfile;

    try {
      await fetch("/api/student/verification/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
    } catch (err) {
      console.warn("Reset verification API error:", err);
    }

    const updatedProfile: StudentProfile = {
      ...student,
      verificationStatus: "not_submitted",
      accountAccessStatus: "RESTRICTED",
      rejectionReason: undefined,
      verificationRequest: null,
    };

    setUser(updatedProfile);
    persistSession(updatedProfile, "student");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoaded,
        login,
        loginWithCredentials,
        loginWithGoogle,
        loginWithDemo,
        resetPassword,
        registerStudent,
        registerRecruiter,
        logout,
        switchRole,
        updateStudentProfile,
        updateRecruiterProfile,
        submitStudentVerification,
        requestManualReview,
        resubmitStudentVerification,
        reviewVerification,
        resetVerificationForResubmission,
        refreshUserSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
