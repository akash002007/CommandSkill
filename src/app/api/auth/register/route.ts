import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ServerStore } from "@/lib/server-store";
import { signAccessToken, signRefreshToken } from "@/lib/auth-jwt";
import { UserRole } from "@/types";

const RegisterSchema = z.object({
  role: z.enum(["student", "recruiter", "STUDENT", "RECRUITER"]),
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("A valid email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  university: z.string().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyLocation: z.string().optional(),
  companySize: z.string().optional(),
  companyType: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  recruiterRole: z.string().optional(),
  recruiterUsage: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = RegisterSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid registration information",
          details: parseResult.error.issues.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const regResult = ServerStore.registerUser(parseResult.data);

    if ("error" in regResult) {
      return NextResponse.json(
        {
          success: false,
          error: regResult.error,
        },
        { status: regResult.status }
      );
    }

    const { user, role: canonicalRole, redirectUrl } = regResult;

    const companyId = (user as any).companyId || (canonicalRole === "RECRUITER" ? "comp_new" : undefined);
    const collegeId = (user as any).collegeId;

    // Issue signed JWT access and refresh tokens
    const accessToken = await signAccessToken(
      {
        userId: user.id,
        email: user.email,
        role: canonicalRole as UserRole,
        name: user.name,
        company_id: companyId,
        college_id: collegeId,
        authProvider: "credentials",
      },
      "7d"
    );

    const refreshToken = await signRefreshToken(
      {
        userId: user.id,
        email: user.email,
        role: canonicalRole as UserRole,
        name: user.name,
        company_id: companyId,
        college_id: collegeId,
        authProvider: "credentials",
      },
      "30d"
    );

    const response = NextResponse.json(
      {
        success: true,
        user: {
          ...user,
          role: canonicalRole,
        },
        token: accessToken,
        refreshToken,
        redirectUrl,
        message: `Account created successfully for ${user.name}`,
      },
      { status: 201 }
    );

    // Set secure authentication cookies
    const isProduction = process.env.NODE_ENV === "production";
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

    response.cookies.set("commandskill_access_token", accessToken, {
      path: "/",
      maxAge: sevenDaysInSeconds,
      sameSite: "lax",
      secure: isProduction,
      httpOnly: false,
    });

    response.cookies.set("commandskill_refresh_token", refreshToken, {
      path: "/",
      maxAge: thirtyDaysInSeconds,
      sameSite: "lax",
      secure: isProduction,
      httpOnly: false,
    });

    response.cookies.set("sb-access-token", accessToken, {
      path: "/",
      maxAge: sevenDaysInSeconds,
      sameSite: "lax",
      secure: isProduction,
      httpOnly: false,
    });

    return response;
  } catch (error: unknown) {
    console.error("[Register Auth API] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during account registration. Please try again.",
      },
      { status: 500 }
    );
  }
}
