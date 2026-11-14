"use client";

import { useState } from "react";

interface PasswordFieldProps {
  invalid?: boolean;
  signup?: boolean;
}

export default function PasswordField({ invalid = false, signup = false }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-box">
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="15" r="1.2" fill="currentColor" />
      </svg>

      <input
        type={visible ? "text" : "password"}
        id="password"
        name="password"
        autoComplete={signup ? "new-password" : "current-password"}
        placeholder={signup ? "At least 8 characters" : "Enter your password"}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "password-error" : undefined}
        required
      />

      <button
        type="button"
        className="eye-button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M2 12S5.5 5 12 5s10 7 10 7-3.5 7-10 7S2 12 2 12Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 21L21 3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </button>
    </div>
  );
}
