import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ServerStore } from "@/lib/server-store";

const ResetPasswordSchema = z.object({
  email: z.string().email("A valid email address is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = ResetPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || "Invalid email format",
        },
        { status: 400 }
      );
    }

    const { email, newPassword } = parseResult.data;
    const result = ServerStore.resetPassword(email, newPassword);

    if ("error" in result) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[Reset Password API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process password reset request. Please try again.",
      },
      { status: 500 }
    );
  }
}
