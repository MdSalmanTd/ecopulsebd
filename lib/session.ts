// Signed session cookie (HMAC-SHA256 via Web Crypto, so it works in proxy and server code).
// Format: base64url(JSON payload) + "." + base64url(signature)

export const SESSION_COOKIE = "ecopulse_session";
export const PROFILE_COOKIE = "ecopulse_profile";
export const SESSION_DAYS = 7;

/** What the signed session cookie carries. */
export interface SessionData {
  uid: number;
  name: string;
}

export interface SessionPayload extends SessionData {
  /** Expiry, ms since epoch. */
  exp: number;
}

const enc = new TextEncoder();

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is not set. Add it to .env.local (see .env.example).");
  }
  return "dev-only-insecure-secret-change-me";
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array<ArrayBuffer> {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createToken(user: SessionData): Promise<string> {
  const payload: SessionPayload = { ...user, exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

/** Returns the session payload, or null if missing, tampered with, or expired. */
export async function verifyToken(token: unknown): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const payload: Partial<SessionPayload> = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload as SessionPayload; // signature verified: we issued this payload
  } catch {
    return null;
  }
}

/** Only allow redirects to local app paths (blocks "//evil.com" and absolute URLs). */
export function safeNext(next: unknown, fallback: string = "/feed"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
