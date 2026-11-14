"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHelp } from "@/lib/app-state";
import type { FormEvent } from "react";
import { useToast } from "./Toast";
import type { HelpKind } from "@/lib/types";
import type { HelpEndStatus } from "@/lib/app-state";

/** A browser geolocation fix. */
export interface GeoPos {
  lat: number;
  lng: number;
  accuracy: number;
}

type LocState =
  | { state: "locating" }
  | { state: "ok"; pos: GeoPos; at: number }
  | { state: "error"; message: string };

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export const HELP_KINDS: Record<HelpKind, { label: string; icon: string }> = {
  flood: { label: "Flood / water", icon: "🌊" },
  rescue: { label: "Rescue / trapped", icon: "🛟" },
  medical: { label: "Medical", icon: "🩺" },
  supplies: { label: "Food & supplies", icon: "🍚" },
  other: { label: "Other", icon: "🆘" },
};

export function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

/** Promise wrapper around the browser's geolocation. */
export function currentPosition(): Promise<GeoPos> {
  return new Promise<GeoPos>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location isn’t available in this browser."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(
          new Error(
            e.code === 1
              ? "Location permission was denied. Allow location for this site so helpers can find you."
              : "Couldn’t get your location. Move to an open area or check that location is turned on.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}

/** "Ask for help" form. */
const HELP_HINTS: Record<HelpKind, string> = {
  flood: "Water entering home or rising",
  rescue: "Trapped, stranded or need a boat",
  medical: "Injured, sick or need medicine",
  supplies: "Food, clean water or shelter",
  other: "Something else urgent",
};

const QUICK_DETAILS = [
  "Water is rising fast",
  "Elderly person with me",
  "Child or baby with me",
  "Someone is injured",
  "Need a boat",
  "No drinking water",
];

const LOC_FRESH_MS = 60_000;

// Object.entries widens keys to string; HELP_KINDS is keyed by HelpKind.
const HELP_KIND_ENTRIES = Object.entries(HELP_KINDS) as [HelpKind, (typeof HELP_KINDS)[HelpKind]][];

interface AskHelpDialogProps {
  onClose: () => void;
}

export function AskHelpDialog({ onClose }: AskHelpDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const { create } = useHelp();
  const [kind, setKind] = useState<HelpKind>("flood");
  const [people, setPeople] = useState<number | "">(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Location is fetched as soon as the dialog opens so sending is fast.
  const [loc, setLoc] = useState<LocState>({ state: "locating" });

  const locate = useCallback(async () => {
    setLoc({ state: "locating" });
    try {
      const pos = await currentPosition();
      const next: Extract<LocState, { state: "ok" }> = { state: "ok", pos, at: Date.now() };
      setLoc(next);
      return next;
    } catch (err) {
      setLoc({ state: "error", message: errorMessage(err) });
      throw err;
    }
  }, []);

  useEffect(() => {
    locate().catch(() => {});
  }, [locate]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!d.open) d.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      if (!busy) onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose, busy]);

  const setCount = (n: number | string) => setPeople(Math.max(1, Math.min(500, Math.round(Number(n) || 1))));

  function toggleDetail(text: string) {
    setNote((cur) => {
      if (cur.includes(text)) {
        return cur
          .replace(text, "")
          .replace(/^[\s.]+|[\s.]+$/g, "")
          .replace(/\.\s*\./g, ".");
      }
      const base = cur.trim().replace(/[.,;]$/, "");
      return (base ? `${base}. ${text}` : text).slice(0, 300);
    });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fresh = loc.state === "ok" && Date.now() - loc.at < LOC_FRESH_MS ? loc : await locate();
      await create({ kind, people: Number(people) || 1, note: note.trim(), ...fresh.pos });
      toast("Help request sent. Your live location is now visible to EcoPulse users.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const accuracy = loc.state === "ok" && loc.pos.accuracy ? Math.round(loc.pos.accuracy) : null;

  return (
    <dialog
      ref={ref}
      className="postmodal helpmodal"
      aria-labelledby="help-title"
      aria-describedby="help-sub"
      onClick={(e) => e.target === ref.current && !busy && onClose()}
    >
      <form onSubmit={submit} aria-busy={busy}>
        <header className="helpmodal__head">
          <span className="helpmodal__badge" aria-hidden="true">
            SOS
          </span>
          <div>
            <h2 id="help-title">Ask for help</h2>
            <p id="help-sub">Nearby volunteers will see where you are and can come to you.</p>
          </div>
          <button type="button" className="postmodal__close" aria-label="Close" onClick={onClose} disabled={busy}>
            ×
          </button>
        </header>

        <div className="postmodal__body helpform">
          <div className="helpform__emergency" role="note">
            <div>
              <strong>In immediate danger?</strong>
              <span>EcoPulse is not an emergency service. Call first, then share your location here.</span>
            </div>
            <a className="helpform__call" href="tel:999">
              📞 Call 999
            </a>
          </div>

          <fieldset disabled={busy}>
            <legend>
              <span className="helpform__step">1</span> What do you need?
            </legend>
            <div className="helpform__kinds">
              {HELP_KIND_ENTRIES.map(([k, v]) => (
                <label key={k} className={kind === k ? "on" : undefined}>
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
                  <span className="helpform__kicon" aria-hidden="true">
                    {v.icon}
                  </span>
                  <span className="helpform__ktext">
                    {v.label}
                    <small>{HELP_HINTS[k]}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={busy}>
            <legend>
              <span className="helpform__step">2</span> Who is with you?
            </legend>
            <div className="helpform__people">
              <span>Number of people, including you</span>
              <div className="helpform__stepper">
                <button type="button" aria-label="Fewer people" onClick={() => setCount(Number(people) - 1)} disabled={Number(people) <= 1}>
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  aria-label="Number of people"
                  value={people}
                  onChange={(e) => setPeople(e.target.value === "" ? "" : Number(e.target.value))}
                  onBlur={(e) => setCount(e.target.value)}
                  required
                />
                <button type="button" aria-label="More people" onClick={() => setCount(Number(people) + 1)} disabled={Number(people) >= 500}>
                  +
                </button>
              </div>
            </div>
          </fieldset>

          <fieldset disabled={busy}>
            <legend>
              <span className="helpform__step">3</span> Details <small>(optional)</small>
            </legend>
            <div className="helpform__chips">
              {QUICK_DETAILS.map((t) => {
                const on = note.includes(t);
                return (
                  <button key={t} type="button" className={on ? "on" : undefined} aria-pressed={on} onClick={() => toggleDetail(t)}>
                    {on ? "✓" : "+"} {t}
                  </button>
                );
              })}
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={note}
              aria-label="Details"
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. 2nd floor of the yellow building next to the mosque."
            />
            <small className="helpform__count">{note.length}/300</small>
          </fieldset>

          <div className={`helpform__loc helpform__loc--${loc.state}`} aria-live="polite">
            <span className="helpform__locicon" aria-hidden="true">
              {loc.state === "ok" ? "📍" : loc.state === "error" ? "⚠️" : <span className="helpform__spin" />}
            </span>
            <div>
              {loc.state === "ok" && (
                <>
                  <strong>Location found</strong>
                  <small>{accuracy ? `Accurate to about ${accuracy} m` : "Ready to share"}</small>
                </>
              )}
              {loc.state === "locating" && (
                <>
                  <strong>Finding your location…</strong>
                  <small>Stay near a window or in the open for a better fix.</small>
                </>
              )}
              {loc.state === "error" && (
                <>
                  <strong>Location not available</strong>
                  <small>{loc.message}</small>
                </>
              )}
            </div>
            {loc.state !== "locating" && (
              <button type="button" className="helpform__retry" onClick={() => locate().catch(() => {})} disabled={busy}>
                {loc.state === "ok" ? "Refresh" : "Try again"}
              </button>
            )}
          </div>

          <p className="helpform__consent">
            Your <strong>live location</strong> will be shown on the map to signed-in EcoPulse users until you tap{" "}
            <em>I’m safe</em> or <em>Stop sharing</em> (or after 6 hours).
          </p>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="postmodal__foot helpmodal__foot">
          <button type="button" className="helpmodal__cancel" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="postmodal__post helpmodal__send" disabled={busy || loc.state === "locating"}>
            {busy ? (
              <>
                <span className="helpform__spin helpform__spin--light" aria-hidden="true" /> Sending…
              </>
            ) : loc.state === "locating" ? (
              "Finding your location…"
            ) : (
              "🆘 Send help request"
            )}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

const MIN_INTERVAL = 15_000; // don't send more often than this
const HEARTBEAT = 60_000; // send at least this often while sharing
const MIN_MOVE_M = 20; // or when moved this far

function metres(a: Pick<GeoPos, "lat" | "lng">, b: Pick<GeoPos, "lat" | "lng">) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Mounted on every app page. While the user has an active help request it keeps sharing their
 * live location (watchPosition → throttled PATCH) and shows a status pill with Safe / Stop buttons.
 */
export function HelpBeacon() {
  const toast = useToast();
  const { mine, updateLocation, finish } = useHelp(20_000);
  const last = useRef<{ at: GeoPos | null; sentAt: number }>({ at: null, sentAt: 0 });
  const [locError, setLocError] = useState("");
  const [busy, setBusy] = useState(false);
  const id = mine?.id;

  const send = useCallback(
    async (pos: GeoPos, force = false) => {
      if (id === undefined) return; // only called while a request is active (see effect below)
      const now = Date.now();
      const prev = last.current;
      const moved = prev.at ? metres(prev.at, pos) : Infinity;
      if (!force && now - prev.sentAt < MIN_INTERVAL) return;
      if (!force && moved < MIN_MOVE_M && now - prev.sentAt < HEARTBEAT) return;
      last.current = { at: pos, sentAt: now };
      try {
        await updateLocation(id, pos);
      } catch {
        /* network blip — the next update will retry */
      }
    },
    [id, updateLocation],
  );

  useEffect(() => {
    if (!id || !navigator.geolocation) return;
    last.current = { at: null, sentAt: Date.now() }; // creation already sent the first position
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        setLocError("");
        send({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
      },
      (e) => setLocError(e.code === 1 ? "Location permission is off — helpers see your last known position." : "Can’t update your location right now."),
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
    // Heartbeat: re-send the last position even when standing still, so "updated" stays fresh.
    const beat = setInterval(() => {
      if (last.current.at) send(last.current.at, true);
    }, HEARTBEAT);
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(beat);
    };
  }, [id, send]);

  if (!mine) return null;
  const active = mine; // narrowed for the closure below

  async function end(status: HelpEndStatus) {
    if (status === "cancelled" && !confirm("Stop sharing your location and cancel the help request?")) return;
    setBusy(true);
    try {
      await finish(active.id, status);
      toast(status === "resolved" ? "Glad you’re safe. Your location is no longer shared." : "Help request cancelled. Location sharing stopped.");
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="helpbeacon" role="status" aria-live="polite">
      <span className="helpbeacon__pulse" aria-hidden="true" />
      <div className="helpbeacon__text">
        <strong>Sharing your live location</strong>
        <small>
          {HELP_KINDS[mine.kind].label} ·{" "}
          {mine.responders ? `${mine.responders} ${mine.responders === 1 ? "person is" : "people are"} on the way` : "waiting for helpers"} · updated{" "}
          {ago(mine.locatedAt)}
        </small>
        {locError && <small className="helpbeacon__warn">{locError}</small>}
      </div>
      <a className="helpbeacon__map" href="/map">
        Map
      </a>
      <button type="button" className="helpbeacon__safe" disabled={busy} onClick={() => end("resolved")}>
        I’m safe
      </button>
      <button type="button" className="helpbeacon__stop" disabled={busy} onClick={() => end("cancelled")}>
        Stop sharing
      </button>
    </div>
  );
}
