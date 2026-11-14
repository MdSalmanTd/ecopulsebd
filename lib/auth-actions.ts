"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { PROFILE_COOKIE, SESSION_COOKIE, SESSION_DAYS, createToken, safeNext } from "./session";
import { createUser, findUserByLogin } from "./server/data";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./server/password";
import { rateLimit, resetLimit, waitText } from "./server/redis";

export type AccountType = "citizen" | "organizer";

/** Field errors from a sign-in/sign-up attempt; `form` is a message for the whole form. */
export interface SignInErrors {
  form?: string;
  name?: string;
  organization?: string;
  email?: string;
  password?: string;
}

/** Echoed form values so the form can be re-filled after an error. */
export interface SignInValues {
  email: string;
  name: string;
  accountType: AccountType;
  organization: string;
}

/** useActionState state for signIn: undefined before the first submit; on success the action redirects. */
export type SignInState = { errors: SignInErrors; values: SignInValues } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BD_PHONE = /^(?:\+?88)?(01[3-9]\d{8})$/;

/** Normalises an email (lower-case) or BD mobile number (01XXXXXXXXX). Returns null if invalid. */
function normaliseLogin(raw: string): string | null {
  const v = raw.trim();
  if (EMAIL.test(v)) return v.toLowerCase();
  const phone = BD_PHONE.exec(v.replace(/[\s-]/g, ""));
  return phone ? phone[1] : null;
}

export async function signIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const name = String(formData.get("name") ?? "").trim();
  const rawLogin = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember-me") === "on";
  const next = safeNext(String(formData.get("next") ?? ""));
  const accountType: AccountType = formData.get("accountType") === "organizer" ? "organizer" : "citizen";
  const organization = String(formData.get("organization") ?? "").trim();
  const values: SignInValues = { email: rawLogin.trim(), name, accountType, organization };

  const login = normaliseLogin(rawLogin);
  const errors: SignInErrors = {};
  if (mode === "signup" && (name.length < 2 || name.length > 60)) errors.name = "Please enter your name.";
  if (mode === "signup" && accountType === "organizer" && (organization.length < 2 || organization.length > 80)) {
    errors.organization = "Enter the name of your group or organisation.";
  }
  if (!login) errors.email = "Enter a valid email or Bangladeshi mobile number.";
  if (mode === "signup" ? password.length < 8 : !password) {
    errors.password = mode === "signup" ? "Use at least 8 characters." : "Enter your password.";
  }
  if (password.length > 200) errors.password = "That password is too long.";
  if (Object.keys(errors).length) return { errors, values };
  if (!login) return { errors, values }; // unreachable (errors.email is set above); narrows `login` to string

  // Rate limits (Redis): slow down password guessing and mass sign-ups.
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  const checks: [key: string, max: number, windowSec: number][] =
    mode === "signup"
      ? [[`signup:ip:${ip}`, 5, 60 * 60]]
      : [
          [`login:ip:${ip}`, 30, 15 * 60],
          [`login:acct:${login}`, 8, 15 * 60],
        ];
  for (const [key, max, win] of checks) {
    const r = await rateLimit(key, max, win);
    if (!r.ok) return { errors: { form: `Too many attempts. Please try again in ${waitText(r.retryAfter)}.` }, values };
  }

  let user;
  if (mode === "signup") {
    user = await createUser(name, login, hashPassword(password), accountType, organization);
    if (!user) {
      return { errors: { email: "An account with this email or phone already exists. Try signing in." }, values };
    }
  } else {
    const found = await findUserByLogin(login);
    // Always run a hash check so timing doesn't reveal whether the account exists.
    const ok = verifyPassword(password, found?.password_hash ?? DUMMY_HASH) && Boolean(found);
    if (!ok || !found) return { errors: { form: "Incorrect email/phone or password." }, values };
    user = found;
    await resetLimit(`login:acct:${login}`);
  }

  const token = await createToken({ uid: user.id, name: user.name });
  const base = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // "Keep me signed in" → persistent cookie; otherwise it ends with the browser session.
    ...(remember ? { maxAge: SESSION_DAYS * 24 * 60 * 60 } : {}),
  };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...base, httpOnly: true });
  // Readable by the page so the UI can show the user's name (not used for access checks).
  jar.set(PROFILE_COOKIE, encodeURIComponent(user.name), base);

  redirect(next);
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(PROFILE_COOKIE);
  redirect("/");
}
