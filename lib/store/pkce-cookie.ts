import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sl_oauth_pkce";
const MAX_AGE_SECONDS = 60 * 10;

export interface PkceSession {
  state: string;
  codeVerifier: string;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function encode(session: PkceSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  return `${payload}.${sign(payload, secret)}`;
}

function decode(raw: string, secret: string): PkceSession | null {
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as PkceSession;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.codeVerifier !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setPkceCookie(
  session: PkceSession,
  secret: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, encode(session, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function consumePkceCookie(
  secret: string,
): Promise<PkceSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  jar.delete(COOKIE_NAME);
  if (!raw) return null;
  return decode(raw, secret);
}
