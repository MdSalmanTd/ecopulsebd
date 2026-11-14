"use client";

// Tiny persistent store: React state backed by localStorage, synced across components and tabs.
// There is no backend yet, so this is where reports, joined missions etc. live (per browser).

import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "ecopulse:";
const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

/** Value or updater function, like React's SetStateAction. */
export type StoredUpdate<T> = T | ((prev: T) => T);
/** [value, set] pair returned by useStored(). */
export type StoredState<T> = [T, (next: StoredUpdate<T>) => void];

// Values are only ever written under a key with that key's type, so reading back as T is safe enough.
function read<T>(key: string, initial: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value = initial;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw != null) value = JSON.parse(raw) as T;
  } catch {
    /* storage blocked or bad JSON — fall back to initial */
  }
  cache.set(key, value);
  return value;
}

function write<T>(key: string, value: T): void {
  cache.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) {
      cache.delete(e.key.slice(PREFIX.length));
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function isUpdater<T>(next: StoredUpdate<T>): next is (prev: T) => T {
  return typeof next === "function";
}

/** Like useState, but persisted. Server render always uses `initial`. */
export function useStored<T>(key: string, initial: T): StoredState<T> {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, initial),
    () => initial,
  );
  const set = useCallback(
    (next: StoredUpdate<T>) =>
      write(key, isUpdater(next) ? next(read(key, initial)) : next),
    [key, initial],
  );
  return [value, set];
}

/** Clears everything this app stored (used on sign-out). */
export function clearStore(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  cache.clear();
  listeners.forEach((l) => l());
}
