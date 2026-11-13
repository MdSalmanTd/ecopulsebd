"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** App-wide toast messages ("Report submitted", "Joined mission", …). */
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState("");
  const timer = useRef(null);

  const show = useCallback((text) => {
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
