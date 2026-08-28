import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "session";

function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");
}

// Team auth is intentionally simple for v1: one shared password gets
// you a signed session cookie. Swap for per-user accounts later by
// checking against the User table instead of TEAM_PASSWORD.
export async function createSession() {
  const token = await new SignJWT({ team: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function isAuthed() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

export function clearSession() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}
