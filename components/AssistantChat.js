"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, useApi } from "@/lib/api-client";
import { useUserName } from "@/lib/useUser";
import { LIVE } from "@/lib/app-data";

const SUGGESTIONS = [
  "Is it safe to jog today?",
  "Where can I plant a tree?",
  "Nearest recycling point?",
  "What does UV 8 mean?",
  "Flood risk today?",
];

export default function AssistantChat() {
  const name = useUserName();
  const { data: status } = useApi("/api/assistant"); // { ai, model }
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const inputRef = useRef(null);
  const logRef = useRef(null);
  const recRef = useRef(null);

  useEffect(() => {
    setCanListen(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function ask(text) {
    const q = text.trim();
    if (!q || typing) return;
    const next = [...messages, { from: "user", text: q }];
    setMessages(next);
    setDraft("");
    setTyping(true);
    try {
      // Send the recent conversation so follow-up questions have context.
      const history = next.slice(-12).map((m) => ({ role: m.from === "user" ? "user" : "assistant", content: m.text }));
      const reply = await api("/api/assistant", { method: "POST", json: { messages: history } });
      setMessages((m) => [...m, { from: "bot", ...reply }]);
    } catch (err) {
      setMessages((m) => [...m, { from: "bot", text: err.message || "Something went wrong. Please try again.", error: true }]);
    } finally {
      setTyping(false);
    }
  }

  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (e) => {
      const t = Array.from(e.results).map((r) => r[0].transcript).join("");
      setDraft(t);
      if (e.results[e.results.length - 1].isFinal) ask(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="card chat">
      <div className="chat__bar">
        <span className="live-dot" aria-hidden="true" />
        Live: AQI {LIVE.aqi} · UV {LIVE.uv} · Flood risk {LIVE.floodRisk.toLowerCase()} · updated {LIVE.updated}
        {status && (
          <span
            className={`ai-badge${status.ai ? " ai-badge--on" : ""}`}
            title={status.ai ? `Answers by ${status.model}` : "Add ANTHROPIC_API_KEY to .env.local to turn on AI answers"}
          >
            {status.ai ? "✦ AI" : "Built-in answers"}
          </span>
        )}
        {messages.length > 0 && (
          <button type="button" className="link-btn" onClick={() => setMessages([])}>
            Clear chat
          </button>
        )}
      </div>

      <div className="chat__log" aria-live="polite" ref={logRef}>
        <p className="msg msg--bot">
          Hi {name.split(" ")[0]}! I use the live readings for {LIVE.area}. Ask me about air, flood risk, missions or recycling near you.
        </p>
        {messages.map((m, i) => (
          <div key={i} className={`msg msg--${m.from}`}>
            <p>{m.text}</p>
            {m.links?.length > 0 && (
              <div className="msg__links">
                {m.links.map((l) => (
                  <Link key={l.href} href={l.href}>
                    {l.label} →
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {typing && (
          <p className="msg msg--bot msg--typing" aria-label="Assistant is typing">
            <span />
            <span />
            <span />
          </p>
        )}
      </div>

      <div className="chat__footer">
        <div className="chips">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => ask(s)} disabled={typing}>
              {s}
            </button>
          ))}
        </div>

        <form
          className="ask"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={listening ? "Listening…" : "Ask about air, floods, missions or recycling…"}
            aria-label="Message"
          />
          {canListen && (
            <button
              type="button"
              className={`ask__mic${listening ? " is-on" : ""}`}
              aria-label={listening ? "Stop voice input" : "Voice input"}
              aria-pressed={listening}
              onClick={toggleMic}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
          )}
          <button type="submit" className="ask__send" aria-label="Send" disabled={!draft.trim() || typing}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12l16-8-6 16-3-7z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
