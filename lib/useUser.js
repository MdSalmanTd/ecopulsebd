"use client";

import { useSyncExternalStore } from "react";

const COOKIE = "ecopulse_profile";
const FALLBACK = "EcoPulse member";

function readName() {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  if (!m) return FALLBACK;
  try {
    // value is URI-encoded twice-safe: once by us, once by the cookie serializer
    let v = decodeURIComponent(m[1]);
    if (/%[0-9A-F]{2}/i.test(v)) v = decodeURIComponent(v);
    return v || FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export function initials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "EP"
  );
}

const nameListeners = new Set();

/** Call after the profile name changes so every component re-reads the cookie. */
export function notifyProfileChanged() {
  nameListeners.forEach((fn) => fn());
}

/** The signed-in user's display name (from the readable profile cookie). */
export function useUserName() {
  return useSyncExternalStore(
    (cb) => {
      nameListeners.add(cb);
      return () => nameListeners.delete(cb);
    },
    readName,
    () => FALLBACK,
  );
}

function readSignedIn() {
  return new RegExp(`(?:^|; )${COOKIE}=`).test(document.cookie);
}

/** True when the readable profile cookie is present (UI hint only — access is enforced by proxy.js). */
export function useSignedIn() {
  return useSyncExternalStore(
    () => () => {},
    readSignedIn,
    () => false,
  );
}
