import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { UserRole } from "@/types";

const DEFAULT_JWT_SECRET = "commandskill_jwt_access_secret_super_secure_key_2026";
const DEFAULT_REFRESH_SECRET = "commandskill_jwt_refresh_secret_super_secure_key_2026";

function getSecretKey(secret?: string): Uint8Array {
  return new TextEncoder().encode(secret || DEFAULT_JWT_SECRET);
}

function getRefreshSecretKey(secret?: string): Uint8Array {
  return new TextEncoder().encode(secret || DEFAULT_REFRESH_SECRET);
}

export interface CommandSkillTokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  company_id?: string;
  college_id?: string;
  googleId?: string;
  authProvider?: "credentials" | "google";
  tokenType?: "access" | "refresh";
}

/**
 * Signs a CommandSkill Access Token (default 1 hour expiry)
 */
export async function signAccessToken(
  payload: Omit<CommandSkillTokenPayload, "tokenType" | "iat" | "exp">,
  expiresIn = "1h"
): Promise<string> {
  const secret = getSecretKey(process.env.JWT_SECRET);

  return new SignJWT({ ...payload, tokenType: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("commandskill")
    .setAudience("commandskill-users")
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Signs a CommandSkill Refresh Token (default 7 days expiry)
 */
export async function signRefreshToken(
  payload: Omit<CommandSkillTokenPayload, "tokenType" | "iat" | "exp">,
  expiresIn = "7d"
): Promise<string> {
  const secret = getRefreshSecretKey(process.env.JWT_REFRESH_SECRET);

  return new SignJWT({ ...payload, tokenType: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("commandskill")
    .setAudience("commandskill-users")
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verifies a CommandSkill Access Token
 */
export async function verifyAccessToken(token: string): Promise<CommandSkillTokenPayload | null> {
  try {
    const secret = getSecretKey(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: "commandskill",
      audience: "commandskill-users",
    });

    return payload as CommandSkillTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verifies a CommandSkill Refresh Token
 */
export async function verifyRefreshToken(token: string): Promise<CommandSkillTokenPayload | null> {
  try {
    const secret = getRefreshSecretKey(process.env.JWT_REFRESH_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: "commandskill",
      audience: "commandskill-users",
    });

    return payload as CommandSkillTokenPayload;
  } catch {
    return null;
  }
}
