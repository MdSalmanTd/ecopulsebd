"use client";

// Minimal data-fetching cache for the app's REST API (like a tiny SWR).
import { useEffect, useSyncExternalStore } from "react";

/** One cached GET endpoint: the last good data and/or the last error. */
export interface CacheEntry<T = unknown> {
  data: T | undefined;
  error: Error | undefined;
}

/** What useApi() returns. `loading` is true until the first response (or error) arrives. */
export interface ApiState<T = unknown> extends CacheEntry<T> {
  loading: boolean;
}

/** Options for api(): `json` is sent as a JSON body, `form` as multipart FormData. */
export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  json?: unknown;
  form?: FormData;
}

type Listener = () => void;

const cache = new Map<string, CacheEntry>(); // key -> { data, error }
const listeners = new Map<string, Set<Listener>>(); // key -> Set<fn>
const inflight = new Map<string, Promise<void>>(); // key -> Promise
const EMPTY: CacheEntry<never> = { data: undefined, error: undefined };

function emit(key: string): void {
  listeners.get(key)?.forEach((fn) => fn());
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

/**
 * fetch wrapper: JSON in/out, readable errors, and a redirect to sign-in when the session expired.
 * `T` is the expected response body. A 204 response resolves to `null` (use `T = null` / `void` for those).
 */
export async function api<T = unknown>(url: string, { method = "GET", json, form }: ApiOptions = {}): Promise<T> {
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
  // The server's JSON is trusted to match T; the 204 case is documented above.
  if (res.status === 204) return null as T;
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      body && typeof body === "object" && "error" in body && typeof body.error === "string" && body.error
        ? body.error
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

/** (Re)loads a GET endpoint into the cache. */
export function revalidate(key: string): Promise<void> {
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = api(key)
    .then((data) => {
      cache.set(key, { data, error: undefined });
    })
    .catch((error: unknown) => {
      cache.set(key, { data: cache.get(key)?.data, error: toError(error) });
    })
    .finally(() => {
      inflight.delete(key);
      emit(key);
    });
  inflight.set(key, p);
  return p;
}

/** Updates cached data locally (optimistic updates / applying a server response). */
export function mutate<T = unknown>(key: string, updater: (current: T | undefined) => T | undefined): void {
  // Entries for a key are only ever written with that endpoint's shape.
  const cur = (cache.get(key) ?? EMPTY) as CacheEntry<T>;
  const next = updater(cur.data);
  if (next === undefined) return; // nothing loaded for this key yet — leave it to fetch fresh
  cache.set(key, { data: next, error: undefined });
  emit(key);
}

export function clearApiCache(): void {
  cache.clear();
  [...listeners.keys()].forEach(emit);
}

/** Subscribes a component to a GET endpoint. Returns { data, error, loading }. Pass null to skip. */
export function useApi<T = unknown>(key: string | null | undefined | false): ApiState<T> {
  const entry = useSyncExternalStore(
    (cb) => {
      if (!key) return () => {};
      let set = listeners.get(key);
      if (!set) listeners.set(key, (set = new Set()));
      set.add(cb);
      return () => {
        listeners.get(key)?.delete(cb);
      };
    },
    // The cache entry for `key` holds this endpoint's response (shape T).
    () => ((key && cache.get(key)) || EMPTY) as CacheEntry<T>,
    () => EMPTY as CacheEntry<T>,
  );
  useEffect(() => {
    if (key && !cache.has(key)) revalidate(key);
  }, [key]);
  return { ...entry, loading: entry.data === undefined && !entry.error };
}
