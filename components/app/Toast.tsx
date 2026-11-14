"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

/** Shows a short message at the bottom of the screen. */
export type ShowToast = (text: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

/** App-wide toast messages ("Report submitted", "Joined mission", …). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((text: string) => {
    setMsg(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 3500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast${msg ? " is-on" : ""}`} role="status" aria-live="polite">
        {msg}
      </div>
    </ToastContext.Provider>
  );
}
