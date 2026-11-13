"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFeed, useMe, useMissions, useReports } from "@/lib/app-state";
import { ISSUE_LABELS, MISSION_CATEGORIES, STATUS_LABELS } from "@/lib/app-data";
import { revalidate } from "@/lib/api-client";
import { checkImageFile, cropSquare, dataUrlToBlob } from "@/lib/image";
import { useDismiss } from "@/lib/hooks";
import Avatar from "@/components/Avatar";
import RewardsBoard from "./RewardsBoard";
import { Post, timeAgo } from "./FeedBoard";
import { useToast } from "./Toast";
import MissionImage from "./MissionImage";

const TABS = [
  { key: "posts", label: "Posts" },
  { key: "reports", label: "Reports" },
  { key: "missions", label: "Missions" },
  { key: "saved", label: "Saved" },
  { key: "rewards", label: "Rewards" },
];
const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function EditProfile({ user, areas, onClose, onSave }) {
  const ref = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(user.bio || "");

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

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSave({ name: f.get("name"), bio: f.get("bio"), area: f.get("area"), organization: f.get("organization") });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} className="postmodal" aria-labelledby="edit-title" onClick={(e) => e.target === ref.current && onClose()}>
      <form onSubmit={submit}>
        <header className="postmodal__head">
          <h2 id="edit-title">Edit profile</h2>
          <button type="button" className="postmodal__close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="postmodal__body editprofile">
          <label>
            Name
            <input name="name" defaultValue={user.name} required minLength={2} maxLength={60} autoComplete="name" />
          </label>
          {user.role === "organizer" && (
            <label>
              Group or organisation
              <input name="organization" defaultValue={user.organization || ""} required minLength={2} maxLength={80} />
            </label>
          )}
          <label>
            Area
            <select name="area" defaultValue={user.area}>
              {areas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Bio
            <textarea name="bio" rows={3} maxLength={200} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What do you care about in your neighbourhood?" />
            <small>{200 - bio.length} characters left</small>
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="postmodal__foot">
          <button type="submit" className="postmodal__post" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

/** Profile photo with a camera button: upload a new photo or remove the current one. */
function AvatarEditor({ user, onChange }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(menuRef, open, close);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) return toast(problem);
    setBusy(true);
    try {
      await onChange(await dataUrlToBlob(await cropSquare(file)));
      toast("Profile photo updated.");
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setOpen(false);
    setBusy(true);
    try {
      await onChange(null);
      toast("Profile photo removed.");
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`profilehead__avatar${busy ? " is-busy" : ""}`} ref={menuRef}>
      <Avatar name={user.name} src={user.avatarUrl} className="profilehead__img" />
      <button
        type="button"
        className="profilehead__camera"
        aria-label="Change profile photo"
        aria-expanded={open}
        disabled={busy}
        onClick={() => (user.avatarUrl ? setOpen((o) => !o) : fileRef.current?.click())}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      </button>
      {open && (
        <div className="dropdown account avatar-menu" role="menu">
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              fileRef.current?.click();
            }}
          >
            Upload new photo
          </button>
          <button role="menuitem" type="button" className="danger" onClick={remove}>
            Remove photo
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={pick} />
    </div>
  );
}

function PostsTab({ filter, empty }) {
  const feed = useFeed(filter);
  if (feed.loading) return <p className="feed__empty">Loading…</p>;
  if (!feed.posts.length) return <p className="feed__empty">{empty}</p>;
  return feed.posts.map((p) => <Post key={p.id} post={p} feed={feed} />);
}

function ReportsTab() {
  const { reports, loading } = useReports();
  if (loading) return <p className="feed__empty">Loading…</p>;
  if (!reports.length)
    return (
      <p className="feed__empty">
        No reports yet. <Link href="/reports">Report a problem</Link>
      </p>
    );
  return (
    <ul className="card plist">
      {reports.map((r) => (
        <li key={r.id}>
          <img src={r.image} alt="" />
          <div>
            <strong>
              {r.id} · {ISSUE_LABELS[r.issue]}
            </strong>
            <small>
              {r.place} · {timeAgo(r.createdAt)}
            </small>
          </div>
          <span className={`status status--${r.status}`}>{STATUS_LABELS[r.status]}</span>
        </li>
      ))}
      <li className="plist__more">
        <Link href="/reports">Open My reports →</Link>
      </li>
    </ul>
  );
}

function MissionsTab() {
  const { missions, loading } = useMissions();
  const mine = missions.filter((m) => m.isJoined || m.isOrganizer);
  if (loading) return <p className="feed__empty">Loading…</p>;
  if (!mine.length)
    return (
      <p className="feed__empty">
        You haven’t joined a mission yet. <Link href="/missions">Find one</Link>
      </p>
    );
  return (
    <ul className="card plist">
      {mine.map((m) => (
        <li key={m.id}>
          <MissionImage mission={m} />
          <div>
            <Link href={`/missions?open=${m.id}`}>
              <strong>{m.title}</strong>
            </Link>
            <small>
              {MISSION_CATEGORIES[m.category]} · {fmt(m.start)} – {fmt(m.end)} · {m.location}
            </small>
          </div>
          <span className={`mtag ${m.isOrganizer ? "mtag--joined" : m.end < new Date().toISOString().slice(0, 10) ? "mtag--ended" : "mtag--open"}`}>
            {m.isOrganizer ? "Organizer" : m.end < new Date().toISOString().slice(0, 10) ? "Done" : "Going"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ProfileBoard() {
  const { user, error, retry, areas, isOrganizer, update, setAvatar } = useMe();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "posts";
  const [editing, setEditing] = useState(false);
  const closeEdit = useCallback(() => setEditing(false), []);

  // Refresh activity counts each time the profile is opened.
  useEffect(() => {
    revalidate("/api/me");
  }, []);

  const setTab = (t) => router.replace(t === "posts" ? pathname : `${pathname}?tab=${t}`, { scroll: false });

  if (!user && error)
    return (
      <div className="feed__empty" role="alert">
        <p>Couldn’t load your profile: {error.message}</p>
        <button type="button" className="btn-primary" style={{ marginTop: 12 }} onClick={retry}>
          Try again
        </button>
      </div>
    );
  if (!user) return <p className="feed__empty">Loading profile…</p>;
  const s = user.stats;
  const joined = new Date(user.joinedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <section className="profilepage" aria-label="Your profile">
      <div className="card profilehead">
        <div className="profilehead__main">
          <AvatarEditor user={user} onChange={setAvatar} />
          <div className="profilehead__info">
            <h1>{user.name}</h1>
            <p className="profilehead__sub">
              <span className={`role-tag${isOrganizer ? " role-tag--org" : ""}`}>{isOrganizer ? "Organizer" : "Citizen"}</span>
              {isOrganizer && user.organization && <span>{user.organization}</span>}
              <span>📍 {user.area}</span>
              <span>Joined {joined}</span>
            </p>
            {user.bio ? <p className="profilehead__bio">{user.bio}</p> : <p className="profilehead__bio muted">No bio yet.</p>}
          </div>
          <button type="button" className="btn-primary btn-primary--ghost" onClick={() => setEditing(true)}>
            ✎ Edit profile
          </button>
        </div>
        <dl className="profilehead__stats">
          <div>
            <dt>Posts</dt>
            <dd>{s.posts}</dd>
          </div>
          <div>
            <dt>Reports</dt>
            <dd>
              {s.reports}
              {s.resolved ? <small> · {s.resolved} resolved</small> : null}
            </dd>
          </div>
          <div>
            <dt>Missions</dt>
            <dd>{s.missions}</dd>
          </div>
          <div>
            <dt>Inspired</dt>
            <dd>{s.inspired}</dd>
          </div>
          <div>
            <dt>Following</dt>
            <dd>{s.following}</dd>
          </div>
        </dl>
        <button type="button" className="profilehead__rewards" onClick={() => setTab("rewards")}>
          <span className="profilehead__level">
            <strong>Level 4 · Eco Champion</strong>
            <span className="profilehead__bar">
              <span style={{ width: "89%" }} />
            </span>
            <small>1,420 / 1,600 XP to Level 5</small>
          </span>
          <span className="profilehead__pill">🌿 1,420 Eco Score</span>
          <span className="profilehead__pill">🪙 380 Eco Coins</span>
          <span className="profilehead__pill">🏅 3 / 6 badges</span>
        </button>
        <nav className="profilehead__tabs" role="tablist" aria-label="Profile sections">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : undefined} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="profilepage__content">
        {tab === "posts" && <PostsTab filter="mine" empty="You haven’t posted yet. Share an update from the feed!" />}
        {tab === "reports" && <ReportsTab />}
        {tab === "missions" && <MissionsTab />}
        {tab === "saved" && <PostsTab filter="saved" empty="No saved posts yet." />}
        {tab === "rewards" && <RewardsBoard embedded />}
      </div>

      {editing && (
        <EditProfile
          user={user}
          areas={areas}
          onClose={closeEdit}
          onSave={async (input) => {
            await update(input);
            toast("Profile updated.");
          }}
        />
      )}
    </section>
  );
}
