"use client";

// Tiny persistent store: React state backed by localStorage, synced across components and tabs.
// There is no backend yet, so this is where reports, joined missions etc. live (per browser).

import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "ecopulse:";
const listeners = new Set();
const cache = new Map();

function read(key, initial) {
  if (cache.has(key)) return cache.get(key);
  let value = initial;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw != null) value = JSON.parse(raw);
  } catch {
    /* storage blocked or bad JSON — fall back to initial */
  }
  cache.set(key, value);
  return value;
}

function write(key, value) {
  cache.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  const onStorage = (e) => {
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

/** Like useState, but persisted. Server render always uses `initial`. */
export function useStored(key, initial) {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, initial),
    () => initial,
  );
  const set = useCallback(
    (next) => write(key, typeof next === "function" ? next(read(key, initial)) : next),
    [key, initial],
  );
  return [value, set];
}

/** Clears everything this app stored (used on sign-out). */
export function clearStore() {
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
