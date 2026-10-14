import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ServerStore } from "@/lib/server-store";
import { signAccessToken, signRefreshToken } from "@/lib/auth-jwt";
import { UserRole } from "@/types";

const DemoAuthSchema = z.object({
  role: z.string().min(1, "Role is required"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = DemoAuthSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload. Please select a valid demo role.",
          details: parseResult.error.issues.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { role: requestedRole } = parseResult.data;

    // Retrieve or provision authorized demo profile from ServerStore
    const demoResult = ServerStore.getDemoUser(requestedRole);

    if (!demoResult) {
      return NextResponse.json(
        {
          success: false,
          error: `Unrecognized demo role: "${requestedRole}". Valid demo roles: student, recruiter, college_admin, platform_admin.`,
        },
        { status: 400 }
      );
    }

    const { user, role: canonicalRole, redirectUrl } = demoResult;

    // Issue signed CommandSkill JWT Access Token (7 days) and Refresh Token (30 days)
    const companyId = (user as any).companyId || (canonicalRole === "RECRUITER" ? "comp_stripe" : undefined);
    const collegeId = (user as any).collegeId || (canonicalRole === "STUDENT" || canonicalRole === "COLLEGE_ADMIN" ? "col_stanford" : undefined);

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

    // Prepare JSON response
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
        message: `Authenticated successfully as ${user.name} (${canonicalRole})`,
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
      httpOnly: false, // Accessible to client-side scripts & edge middleware
    });

    response.cookies.set("commandskill_refresh_token", refreshToken, {
      path: "/",
      maxAge: thirtyDaysInSeconds,
      sameSite: "lax",
      secure: isProduction,
      httpOnly: false,
    });

    // Provide legacy/interoperability cookie for existing Supabase server adapter
    response.cookies.set("sb-access-token", accessToken, {
      path: "/",
      maxAge: sevenDaysInSeconds,
      sameSite: "lax",
      secure: isProduction,
      httpOnly: false,
    });

    return response;
  } catch (error: unknown) {
    console.error("[Demo Auth API] Error during authentication:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred during demo authentication. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    availableAccounts: [
      {
        role: "STUDENT",
        label: "Student",
        name: "Alex Rivera",
        email: "alex.rivera@stanford.edu",
        destination: "/dashboard",
      },
      {
        role: "RECRUITER",
        label: "Recruiter",
        name: "Barun",
        email: "barun@stripe-careers.com",
        destination: "/dashboard/recruiter",
      },
      {
        role: "COLLEGE_ADMIN",
        label: "College Dean",
        name: "Dr. Ronald Evans",
        email: "placement@stanford.edu",
        destination: "/college/dashboard",
      },
      {
        role: "PLATFORM_ADMIN",
        label: "Platform Admin",
        name: "Priya Menon",
        email: "priya.menon@commandskill.io",
        destination: "/admin",
      },
    ],
  });
}
