"use client";

import { useActionState, useState } from "react";
import { signIn, type AccountType, type SignInErrors } from "@/lib/auth-actions";
import PasswordField from "./PasswordField";

export interface SignInFormProps {
  /** Where to go after signing in (already sanitised). */
  next: string;
  mode?: "signin" | "signup";
  /** Preselected account type from the URL; anything but "organizer" means citizen. */
  type?: string;
}

export default function SignInForm({ next, mode = "signin", type = "citizen" }: SignInFormProps) {
  const signup = mode === "signup";
  const [state, action, pending] = useActionState(signIn, undefined);
  const [accountType, setAccountType] = useState<AccountType>(type === "organizer" ? "organizer" : "citizen");
  const errors: SignInErrors = state?.errors ?? {};

  return (
    <form action={action} noValidate>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="mode" value={mode} />

      {errors.form && (
        <p className="form-alert" role="alert">
          {errors.form}
        </p>
      )}

      {signup && (
        <fieldset className="account-type">
          <legend>I’m joining as</legend>
          {([
            ["citizen", "Citizen", "Post updates, report problems, join missions"],
            ["organizer", "Organizer", "Everything citizens can do, plus create missions"],
          ] as const).map(([value, label, hint]) => (
            <label key={value} className={accountType === value ? "on" : undefined}>
              <input
                type="radio"
                name="accountType"
                value={value}
                checked={accountType === value}
                onChange={() => setAccountType(value)}
              />
              <strong>{label}</strong>
              <small>{hint}</small>
            </label>
          ))}
        </fieldset>
      )}

      {signup && accountType === "organizer" && (
        <div className="form-group">
          <label htmlFor="organization">Group or organisation</label>
          <div className="input-box">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <input
              type="text"
              id="organization"
              name="organization"
              placeholder="e.g. Mirpur Green Team"
              defaultValue={state?.values?.organization}
              aria-invalid={errors.organization ? true : undefined}
              aria-describedby={errors.organization ? "organization-error" : undefined}
              required
            />
          </div>
          {errors.organization && (
            <p className="field-error" id="organization-error" role="alert">
              {errors.organization}
            </p>
          )}
        </div>
      )}

      {signup && (
        <div className="form-group">
          <label htmlFor="name">Full name</label>
          <div className="input-box">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" stroke="currentColor" strokeWidth="2" />
            </svg>
            <input
              type="text"
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              defaultValue={state?.values?.name}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "name-error" : undefined}
              required
            />
          </div>
          {errors.name && (
            <p className="field-error" id="name-error" role="alert">
              {errors.name}
            </p>
          )}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email or phone number</label>
        <div className="input-box">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M4 7L12 13L20 7" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input
            type="text"
            id="email"
            name="email"
            autoComplete="username"
            placeholder="Enter your email or phone number"
            defaultValue={state?.values?.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            required
          />
        </div>
        {errors.email && (
          <p className="field-error" id="email-error" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <PasswordField invalid={Boolean(errors.password)} signup={signup} />
        {errors.password && (
          <p className="field-error" id="password-error" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      <div className="remember-row">
        <label>
          <input type="checkbox" name="remember-me" defaultChecked />
          <span>Keep me signed in</span>
        </label>
      </div>

      <button type="submit" className="sign-in-button" disabled={pending}>
        {pending ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
