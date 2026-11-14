"use client";

import { useEffect, type RefObject } from "react";
import { useStored, type StoredState } from "./store";

/** Calls onClose on outside click or Escape while `open` is true. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node | null)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, onClose]);
}

// ---- UI language (navigation labels) ----
const DICT: Record<string, string | undefined> = {
  Home: "হোম",
  Feed: "ফিড",
  Map: "মানচিত্র",
  Missions: "মিশন",
  Reports: "রিপোর্ট",
  Rewards: "পুরস্কার",
  Assistant: "সহকারী",
  "Your profile": "আপনার প্রোফাইল",
  "Saved posts": "সংরক্ষিত পোস্ট",
  "My missions": "আমার মিশন",
  "My reports": "আমার রিপোর্ট",
  "Ask the assistant": "সহকারীকে জিজ্ঞাসা করুন",
  "Organizer tools": "আয়োজক টুলস",
  "Your communities": "আপনার কমিউনিটি",
  "Sign out": "সাইন আউট",
};

export type Lang = "en" | "bn";

/** [lang, setLang] — persisted UI language. */
export function useLang(): StoredState<Lang> {
  return useStored<Lang>("lang", "en");
}

/** Returns a translator for navigation labels (falls back to the English text). */
export function useT(): (s: string) => string {
  const [lang] = useLang();
  return (s: string) => (lang === "bn" && DICT[s]) || s;
}
