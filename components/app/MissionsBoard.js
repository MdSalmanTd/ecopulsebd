"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMe, useMissions } from "@/lib/app-state";
import { MISSION_CATEGORIES } from "@/lib/app-data";
import { useToast } from "./Toast";
import MissionImage from "./MissionImage";

const TODAY = () => new Date().toISOString().slice(0, 10);

const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : String(n));

function statusOf(m, joined) {
  if (m.end < TODAY()) return { key: "ended", label: "Ended" };
  if (joined) return { key: "joined", label: "Joined" };
  if (m.joined >= m.capacity) return { key: "full", label: "Full" };
  return { key: "open", label: "Open" };
}

export default function MissionsBoard() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { missions, loading, error, isJoined, toggle, toggleSaved, create } = useMissions();
  const { isOrganizer, loaded: meLoaded } = useMe();
  const saved = missions.filter((m) => m.isSaved).map((m) => m.id);
  const [pending, setPending] = useState(null); // mission id being joined/left

  const view = params.get("view") ?? "all"; // all | mine | saved
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [detailId, setDetailId] = useState(null);
  const [creating, setCreating] = useState(false);

  // Deep links: ?open=<id>, ?create=1, ?q=<text>
  useEffect(() => {
    const open = params.get("open");
    if (open) setDetailId(open);
    if (params.get("create")) setCreating(true); // only rendered for organizers (see below)
    if (params.get("q") != null) setQ(params.get("q"));
  }, [params]);

  const setView = (v) => {
    const sp = new URLSearchParams(params);
    if (v === "all") sp.delete("view");
    else sp.set("view", v);
    sp.delete("open");
    sp.delete("create");
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  // Closing a dialog also drops its deep-link (?open / ?create) so a reload doesn't reopen it.
  const dropParam = (name) => {
    if (!params.has(name)) return;
    const sp = new URLSearchParams(params);
    sp.delete(name);
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };
  const closeDetail = () => {
    setDetailId(null);
    dropParam("open");
  };
  const closeCreate = () => {
    setCreating(false);
    dropParam("create");
  };

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return missions.filter((m) => {
      if (view === "mine" && !isJoined(m.id)) return false;
      if (view === "saved" && !saved.includes(m.id)) return false;
      if (category !== "all" && m.category !== category) return false;
      if (s && !`${m.title} ${m.location} ${m.organizer} ${m.description}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [missions, view, category, q, saved, isJoined]);

  const detail = missions.find((m) => m.id === detailId);

  async function onToggle(m) {
    const was = isJoined(m.id);
    setPending(m.id);
    try {
      await toggle(m.id);
      toast(was ? `You left “${m.title}”.` : `You joined “${m.title}”! +${m.xp} XP when it’s verified.`);
    } catch (e) {
      toast(e.message);
    } finally {
      setPending(null);
    }
  }

  async function onSave(m) {
    try {
      await toggleSaved(m.id);
      toast(m.isSaved ? "Removed from saved." : "Saved for later.");
    } catch (e) {
      toast(e.message);
    }
  }

  const heading = view === "mine" ? "My missions" : view === "saved" ? "Saved missions" : "Missions";

  return (
    <section className="missions" aria-labelledby="missions-title">
      <header className="page-head missions__head">
        <div>
          <span className="eyebrow">COMMUNITY ACTION</span>
          <h1 id="missions-title">{heading}</h1>
        </div>
        {isOrganizer ? (
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            ＋ Create mission
          </button>
        ) : meLoaded ? (
          <p className="organizer-note">
            Want to run a mission? <a href="/contact#partner">Apply to become an organizer</a>
          </p>
        ) : null}
      </header>

      <div className="missions__tools">
        <div className="seg" role="tablist" aria-label="Which missions">
          {[
            ["all", "All missions"],
            ["mine", "Joined"],
            ["saved", "Saved"],
          ].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? "on" : undefined} onClick={() => setView(k)}>
              {l}
            </button>
          ))}
        </div>
        <input
          className="missions__search"
          type="search"
          placeholder="Filter by name or area…"
          aria-label="Filter missions"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="chips" role="group" aria-label="Category">
        <button type="button" className={`chip${category === "all" ? " chip--on" : ""}`} aria-pressed={category === "all"} onClick={() => setCategory("all")}>
          All
        </button>
        {Object.entries(MISSION_CATEGORIES).map(([k, l]) => (
          <button key={k} type="button" className={`chip${category === k ? " chip--on" : ""}`} aria-pressed={category === k} onClick={() => setCategory(k)}>
            {l}
          </button>
        ))}
      </div>

      <div className="mgrid">
        {list.map((m) => {
          const joined = isJoined(m.id);
          const st = statusOf(m, joined);
          const count = m.joined;
          return (
            <article key={m.id} className="mcard">
              <button type="button" className="mcard__img" onClick={() => setDetailId(m.id)} aria-label={`Details for ${m.title}`}>
                <MissionImage mission={m} />
                <span className="mcard__cat">{MISSION_CATEGORIES[m.category]}</span>
              </button>
              <div className="mcard__body">
                <div className="mcard__title">
                  <h2>
                    <button type="button" onClick={() => setDetailId(m.id)}>
                      {m.title}
                    </button>
                  </h2>
                  <span className={`mtag mtag--${st.key}`}>{st.label}</span>
                </div>
                <p>{m.description}</p>
                <div className="mcard__meta">
                  <span>📅 {fmt(m.start)} – {fmt(m.end)}</span>
                  <span>📍 {m.location}</span>
                  <span>
                    👥 {compact(count)}/{compact(m.capacity)}
                  </span>
                </div>
                <div className="mbar" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, (count / m.capacity) * 100)}%` }} />
                </div>
              </div>
              <footer className="mcard__foot">
                <span className="mcard__org">{m.organizer}</span>
                <button
                  type="button"
                  className={`icon-toggle${saved.includes(m.id) ? " on" : ""}`}
                  aria-pressed={saved.includes(m.id)}
                  aria-label={saved.includes(m.id) ? "Unsave" : "Save"}
                  onClick={() => onSave(m)}
                >
                  <img src="/icons/bookmark.svg" alt="" />
                </button>
                <button
                  type="button"
                  className={`join-btn${joined ? " is-joined" : ""}`}
                  disabled={st.key === "ended" || st.key === "full" || pending === m.id || m.isOrganizer}
                  title={m.isOrganizer ? "You organise this mission" : undefined}
                  onClick={() => onToggle(m)}
                >
                  {pending === m.id ? "…" : m.isOrganizer ? "Organizer" : joined ? "✓ Joined" : st.key === "ended" ? "Ended" : st.key === "full" ? "Full" : "Join →"}
                </button>
              </footer>
            </article>
          );
        })}
      </div>
      {loading && <p className="loading">Loading missions…</p>}
      {error && <p className="loading">Couldn’t load missions: {error.message}</p>}
      {!loading && !error && !list.length && (
        <div className="empty">
          <p>
            {view === "mine"
              ? "You haven’t joined any missions yet."
              : view === "saved"
                ? "Nothing saved yet. Tap the bookmark on a mission to keep it here."
                : "No missions match your filters."}
          </p>
          {view !== "all" && (
            <button type="button" className="btn-ghost" onClick={() => setView("all")}>
              Browse all missions
            </button>
          )}
        </div>
      )}

      {detail && (
        <Dialog onClose={closeDetail} label={detail.title}>
          <MissionImage mission={detail} className="mdialog__img" eager />
          <span className="eyebrow">{MISSION_CATEGORIES[detail.category].toUpperCase()}</span>
          <h2>{detail.title}</h2>
          <p>{detail.description}</p>
          <dl className="mdialog__facts">
            <div>
              <dt>Dates</dt>
              <dd>
                {fmt(detail.start)} – {fmt(detail.end)}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{detail.location}</dd>
            </div>
            <div>
              <dt>Organizer</dt>
              <dd>{detail.organizer}</dd>
            </div>
            <div>
              <dt>Participants</dt>
              <dd>
                {detail.joined.toLocaleString()} / {detail.capacity.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt>Reward</dt>
              <dd>+{detail.xp} XP</dd>
            </div>
          </dl>
          {(() => {
            const st = statusOf(detail, isJoined(detail.id));
            return (
              <button
                type="button"
                className={`btn-primary${isJoined(detail.id) ? " btn-primary--ghost" : ""}`}
                disabled={st.key === "ended" || st.key === "full" || pending === detail.id || detail.isOrganizer}
                onClick={() => onToggle(detail)}
              >
                {detail.isOrganizer ? "You’re the organizer" : isJoined(detail.id) ? "Leave mission" : st.key === "ended" ? "This mission has ended" : st.key === "full" ? "Mission is full" : "Join mission"}
              </button>
            );
          })()}
        </Dialog>
      )}

      {creating && isOrganizer && (
        <Dialog onClose={closeCreate} label="Create a mission">
          <CreateMissionForm
            onCancel={closeCreate}
            onCreate={async (m) => {
              const mission = await create(m); // throws with the server's message on validation errors
              setCreating(false);
              setView("mine");
              toast(`“${mission.title}” created. You’re the organizer!`);
            }}
          />
        </Dialog>
      )}
    </section>
  );
}

function Dialog({ children, onClose, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d.open) d.showModal();
    const onCancel = (e) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);
  return (
    <dialog
      ref={ref}
      className="mdialog"
      aria-label={label}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on backdrop
      }}
    >
      <button type="button" className="mdialog__close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      {children}
    </dialog>
  );
}

function CreateMissionForm({ onCreate, onCancel }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const today = TODAY();

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const m = {
      title: String(f.get("title")).trim(),
      category: f.get("category"),
      description: String(f.get("description")).trim(),
      location: String(f.get("location")).trim(),
      start: f.get("start"),
      end: f.get("end"),
      capacity: Number(f.get("capacity")),
    };
    if (!m.title || !m.description || !m.location || !m.start || !m.end) return setError("Please fill in every field.");
    if (m.end < m.start) return setError("The end date must be on or after the start date.");
    if (!(m.capacity >= 1)) return setError("Participant limit must be at least 1.");
    setError("");
    setBusy(true);
    try {
      await onCreate(m);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="mform" onSubmit={submit} noValidate>
      <span className="eyebrow">ORGANIZER TOOLS</span>
      <h2>Create a mission</h2>
      <label>
        Mission name
        <input name="title" required maxLength={80} placeholder="e.g. Shewrapara Tree Walk" />
      </label>
      <label>
        Category
        <select name="category" defaultValue="trees">
          {Object.entries(MISSION_CATEGORIES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Description
        <textarea name="description" rows={3} required maxLength={400} placeholder="What will volunteers do?" />
      </label>
      <label>
        Location
        <input name="location" required maxLength={100} placeholder="Area, Dhaka" />
      </label>
      <div className="mform__row">
        <label>
          Starts
          <input name="start" type="date" min={today} defaultValue={today} required />
        </label>
        <label>
          Ends
          <input name="end" type="date" min={today} defaultValue={today} required />
        </label>
        <label>
          Spots
          <input name="capacity" type="number" min={1} max={100000} defaultValue={20} required />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="mform__actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Creating…" : "Create mission"}
        </button>
      </div>
    </form>
  );
}
