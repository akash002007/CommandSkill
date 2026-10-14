import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth-jwt";
import {
  defaultStudentUser,
  defaultRecruiterUser,
  defaultAdminUser,
  defaultCollegeUser,
} from "@/data/mock-users";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  company_id?: string;
  college_id?: string;
  account_status?: string;
}

export interface AuthenticatedStudent extends AuthenticatedUser {
  role: "STUDENT";
}

export interface AuthenticatedRecruiter extends AuthenticatedUser {
  role: "RECRUITER";
}

/**
 * Creates a Supabase server client configured for Next.js App Router
 * with cookie read/write handling.
 */
export async function createSupabaseServerClient(token?: string) {
  let cookieStore: any = null;
  try {
    cookieStore = await cookies();
  } catch {
    // Outside Next.js request context (scripts/tests)
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
    cookies: {
      getAll() {
        return cookieStore ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet) {
        try {
          if (cookieStore) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          }
        } catch {
          // Can be safely ignored when called in read contexts
        }
      },
    },
  });
}

/**
 * Unified authentication function that checks Supabase Auth or local JWT tokens,
 * validates against an array of allowed roles, and returns the authenticated user.
 */
export async function getAuthenticatedUser(
  request: NextRequest | Request,
  allowedRoles?: string[]
): Promise<{ user: AuthenticatedUser | null; error: string | null; status: number }> {
  try {
    // 1. Extract Bearer token if provided in request headers
    const authHeader =
      request.headers.get("Authorization") || request.headers.get("authorization");
    let bearerToken: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      bearerToken = authHeader.substring(7).trim();
    }

    const supabase = await createSupabaseServerClient(bearerToken);

    // 2. Query Supabase Auth for user session
    let supabaseUser = null;
    try {
      if (bearerToken) {
        const { data } = await supabase.auth.getUser(bearerToken);
        supabaseUser = data?.user;
      }
      if (!supabaseUser) {
        const { data } = await supabase.auth.getUser();
        supabaseUser = data?.user;
      }
    } catch {
      // Supabase auth service unavailable or invalid credentials
    }

    let userRole = "";
    let authenticatedUser: AuthenticatedUser | null = null;

    if (supabaseUser) {
      const rawRole =
        supabaseUser.user_metadata?.role ||
        supabaseUser.app_metadata?.role ||
        supabaseUser.role;

      userRole = typeof rawRole === "string" ? rawRole.toUpperCase() : "";
      
      authenticatedUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        role: userRole,
        name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name,
        company_id: supabaseUser.app_metadata?.company_id || supabaseUser.user_metadata?.company_id,
        college_id: supabaseUser.app_metadata?.college_id || supabaseUser.user_metadata?.college_id,
        account_status: supabaseUser.app_metadata?.account_status || "ACTIVE"
      };
    } 
    // 3. Fallback to Bearer token decoding (if it's a valid local JWT)
    else if (bearerToken) {
      const jwtPayload = await verifyAccessToken(bearerToken);
      if (jwtPayload && jwtPayload.userId) {
        userRole = (jwtPayload.role || "").toUpperCase();
        authenticatedUser = {
          id: jwtPayload.userId,
          email: jwtPayload.email || "",
          role: userRole,
          name: (jwtPayload.name as string) || "",
          company_id: jwtPayload.company_id as string | undefined,
          college_id: jwtPayload.college_id as string | undefined,
        };
      }
    } 
    // 4. Fallback to Cookie processing
    else {
      let cookieStore: any = null;
      try {
        cookieStore = await cookies();
      } catch {
        // Outside Next.js request context (scripts/tests)
      }

      let tokenCookie: string | undefined;
      if (cookieStore) {
        tokenCookie =
          cookieStore.get("commandskill_access_token")?.value ||
          cookieStore.get("sb-access-token")?.value;
      }
      if (!tokenCookie && (request as any)?.cookies?.get) {
        tokenCookie =
          (request as any).cookies.get("commandskill_access_token")?.value ||
          (request as any).cookies.get("sb-access-token")?.value;
      }
      if (!tokenCookie && request.headers) {
        const rawCookie = request.headers.get("cookie") || "";
        const match = rawCookie.match(/(?:commandskill_access_token|sb-access-token)=([^;]+)/);
        if (match) {
          tokenCookie = decodeURIComponent(match[1].trim());
        }
      }

      if (tokenCookie) {
        const jwtPayload = await verifyAccessToken(tokenCookie);
        if (jwtPayload && jwtPayload.userId) {
          userRole = (jwtPayload.role || "").toUpperCase();
          authenticatedUser = {
            id: jwtPayload.userId,
            email: jwtPayload.email || "",
            role: userRole,
            name: (jwtPayload.name as string) || "",
            company_id: jwtPayload.company_id as string | undefined,
            college_id: jwtPayload.college_id as string | undefined,
          };
        }
      }
    }

    // 5. Mock header logic for testing/service access
    if (!authenticatedUser) {
      const headerUserId = request.headers.get("x-user-id");
      if (headerUserId) {
        const trimmedId = headerUserId.trim();
        let user: any = null;
        if (trimmedId === defaultStudentUser.id || trimmedId === "student" || trimmedId === "student_123") {
          user = defaultStudentUser;
        } else if (trimmedId === defaultRecruiterUser.id || trimmedId === "recruiter") {
          user = defaultRecruiterUser;
        } else if (trimmedId === defaultAdminUser.id || trimmedId === "admin") {
          user = defaultAdminUser;
        } else if (trimmedId === defaultCollegeUser.id || trimmedId === "college" || trimmedId === "college_admin") {
          user = defaultCollegeUser;
        }

        if (user) {
          userRole = (user.role || "").toUpperCase();
          authenticatedUser = {
            id: user.id || trimmedId,
            email: user.email || "mock@example.com",
            role: userRole,
            name: user.name || "Mock User",
            college_id: user.collegeId,
          };
        }
      }
    }

    // 6. Default fallback for local dev
    if (!authenticatedUser && process.env.NODE_ENV === "development") {
      const url = request.url || "";
      if (url.includes("/admin")) {
        userRole = "PLATFORM_ADMIN";
        authenticatedUser = {
          id: defaultAdminUser.id,
          email: defaultAdminUser.email || "admin@commandskill.io",
          role: "PLATFORM_ADMIN",
          name: defaultAdminUser.name || "Platform Admin",
        };
      } else if (url.includes("/college") || url.includes("/api/college")) {
        userRole = "COLLEGE_ADMIN";
        authenticatedUser = {
          id: defaultCollegeUser.id,
          email: defaultCollegeUser.email || "placement@stanford.edu",
          role: "COLLEGE_ADMIN",
          name: defaultCollegeUser.name || "Dr. Ronald Evans",
          college_id: "col_stanford",
        };
      } else if (url.includes("/recruiter")) {
        userRole = "RECRUITER";
        authenticatedUser = {
          id: defaultRecruiterUser.id,
          email: defaultRecruiterUser.email || "recruiter@example.com",
          role: "RECRUITER",
          name: defaultRecruiterUser.name || "Mock Recruiter",
          company_id: "comp_stripe",
        };
      } else {
        userRole = "STUDENT";
        authenticatedUser = {
          id: defaultStudentUser.id,
          email: defaultStudentUser.email || "student@example.com",
          role: "STUDENT",
          name: defaultStudentUser.name || "Mock Student",
          college_id: "col_stanford",
        };
      }
    }

    if (!authenticatedUser) {
      return {
        user: null,
        error: "Unauthorized: Active session required",
        status: 401,
      };
    }

    // 7. Check suspended status
    if (authenticatedUser.account_status === "SUSPENDED") {
      return {
        user: null,
        error: "Forbidden: Account is suspended",
        status: 403,
      };
    }

    // 8. Validate against allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
      const upperAllowed = allowedRoles.map(r => r.toUpperCase());
      const roleMatches =
        upperAllowed.includes(userRole) ||
        (userRole === "ADMIN" && (upperAllowed.includes("PLATFORM_ADMIN") || upperAllowed.includes("SUPER_ADMIN"))) ||
        (["PLATFORM_ADMIN", "SUPER_ADMIN"].includes(userRole) && upperAllowed.includes("ADMIN"));

      if (!roleMatches) {
        return {
          user: null,
          error: `Forbidden: Endpoint requires one of roles: ${allowedRoles.join(", ")}`,
          status: 403,
        };
      }
    }

    return {
      user: authenticatedUser,
      error: null,
      status: 200,
    };
  } catch (err) {
    console.error("[Supabase Auth] Verification error:", err);
    return {
      user: null,
      error: "Unauthorized: Authentication verification failed",
      status: 401,
    };
  }
}

/**
 * Legacy wrapper: strictly validates that the user role is STUDENT.
 */
export async function getAuthenticatedStudent(
  request: NextRequest | Request
): Promise<{ student: AuthenticatedStudent | null; error: string | null; status: number }> {
  const { user, error, status } = await getAuthenticatedUser(request, ["STUDENT"]);
  return {
    student: user as AuthenticatedStudent | null,
    error,
    status
  };
}

/**
 * Legacy wrapper: strictly validates that the user role is RECRUITER.
 */
export async function getAuthenticatedRecruiter(
  request: NextRequest | Request
): Promise<{ recruiter: AuthenticatedRecruiter | null; error: string | null; status: number }> {
  const { user, error, status } = await getAuthenticatedUser(request, ["RECRUITER"]);
  return {
    recruiter: user as AuthenticatedRecruiter | null,
    error,
    status
  };
}

/**
 * College wrapper: validates that the user role is COLLEGE_ADMIN or COLLEGE_PLACEMENT_OFFICER (or admin).
 */
export async function getAuthenticatedCollege(
  request: NextRequest | Request
): Promise<{ collegeUser: AuthenticatedUser | null; error: string | null; status: number }> {
  const { user, error, status } = await getAuthenticatedUser(request, [
    "COLLEGE_ADMIN",
    "COLLEGE_PLACEMENT_OFFICER",
    "PLATFORM_ADMIN",
    "SUPER_ADMIN",
  ]);
  return {
    collegeUser: user,
    error,
    status,
  };
}
