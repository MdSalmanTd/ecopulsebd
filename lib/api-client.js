"use client";

// Minimal data-fetching cache for the app's REST API (like a tiny SWR).
import { useEffect, useSyncExternalStore } from "react";

const cache = new Map(); // key -> { data, error }
const listeners = new Map(); // key -> Set<fn>
const inflight = new Map(); // key -> Promise
const EMPTY = { data: undefined, error: undefined };

function emit(key) {
  listeners.get(key)?.forEach((fn) => fn());
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** fetch wrapper: JSON in/out, readable errors, and a redirect to sign-in when the session expired. */
export async function api(url, { method = "GET", json, form } = {}) {
  const res = await fetch(url, {
    method,
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : form,
    credentials: "same-origin",
  });
  if (res.status === 401) {
    window.location.href = `/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`;
    throw new ApiError(401, "Please sign in.");
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || `Request failed (${res.status})`);
  return body;
}

/** (Re)loads a GET endpoint into the cache. */
export function revalidate(key) {
  if (inflight.has(key)) return inflight.get(key);
  const p = api(key)
    .then((data) => cache.set(key, { data, error: undefined }))
    .catch((error) => cache.set(key, { data: cache.get(key)?.data, error }))
    .finally(() => {
      inflight.delete(key);
      emit(key);
    });
  inflight.set(key, p);
  return p;
}

/** Updates cached data locally (optimistic updates / applying a server response). */
export function mutate(key, updater) {
  const cur = cache.get(key) ?? EMPTY;
  const next = updater(cur.data);
  if (next === undefined) return; // nothing loaded for this key yet — leave it to fetch fresh
  cache.set(key, { data: next, error: undefined });
  emit(key);
}

export function clearApiCache() {
  cache.clear();
  [...listeners.keys()].forEach(emit);
}

/** Subscribes a component to a GET endpoint. Returns { data, error, loading }. */
export function useApi(key) {
  const entry = useSyncExternalStore(
    (cb) => {
      if (!key) return () => {};
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key).add(cb);
      return () => listeners.get(key).delete(cb);
    },
    () => (key && cache.get(key)) || EMPTY,
    () => EMPTY,
  );
  useEffect(() => {
    if (key && !cache.has(key)) revalidate(key);
  }, [key]);
  return { ...entry, loading: entry.data === undefined && !entry.error };
}
