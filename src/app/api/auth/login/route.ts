import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ServerStore } from "@/lib/server-store";
import { signAccessToken, signRefreshToken } from "@/lib/auth-jwt";
import { UserRole } from "@/types";

const LoginSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
  role: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = LoginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid login credentials",
        },
        { status: 400 }
      );
    }

    const { email, password, role } = parseResult.data;

    // Authenticate credentials against ServerStore
    const authResult = ServerStore.authenticateWithPassword(email, password, role);

    if ("error" in authResult) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
        },
        { status: authResult.status }
      );
    }

    const { user, role: canonicalRole, redirectUrl } = authResult;

    const companyId = (user as any).companyId || (canonicalRole === "RECRUITER" ? "comp_stripe" : undefined);
    const collegeId = (user as any).collegeId || (canonicalRole === "STUDENT" || canonicalRole === "COLLEGE_ADMIN" ? "col_stanford" : undefined);

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
        message: `Successfully authenticated as ${user.name}`,
      },
      { status: 200 }
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
    console.error("[Login Auth API] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected server error occurred during login. Please try again.",
      },
      { status: 500 }
    );
  }
}
