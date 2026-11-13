"use client";

import { useEffect } from "react";
import { useStored } from "./store";

/** Calls onClose on outside click or Escape while `open` is true. */
export function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
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
const DICT = {
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

export function useLang() {
  return useStored("lang", "en");
}

export function useT() {
  const [lang] = useLang();
  return (s) => (lang === "bn" && DICT[s]) || s;
}
