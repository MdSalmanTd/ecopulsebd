"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useComments, useFeed, useMe, useMissions } from "@/lib/app-state";
import Avatar from "@/components/Avatar";
import { checkImageFile, dataUrlToBlob, shrinkImage } from "@/lib/image";
import { initials, useUserName } from "@/lib/useUser";
import { useDismiss } from "@/lib/hooks";
import { LIVE } from "@/lib/app-data";
import { useToast } from "./Toast";
import type { Comment, Post as PostData, PostAttachment } from "@/lib/types";

type Feed = ReturnType<typeof useFeed>;
type FeedView = "all" | "nearby" | "saved" | "mine";

/** Attachments may carry extra keys depending on their kind (report status, linked mission). */
type Attachment = PostAttachment & { statusKey?: string; missionId?: string };

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const VIEWS: { key: FeedView; label: string }[] = [
  { key: "all", label: "For you" },
  { key: "nearby", label: "Nearby" },
  { key: "saved", label: "Saved" },
  { key: "mine", label: "My posts" },
];
const AREAS = ["Mirpur 10", "Mirpur 2", "Shewrapara", "Agargaon", "Dhanmondi", "Mohammadpur", "Uttara", "Gulshan"];

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Renders #hashtags as highlighted tags. */
function Body({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="post__body">
      {text.split(/(#[\p{L}\p{N}_]+)/u).map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="hashtag">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </p>
  );
}

// ---------------- Composer (Facebook-style: bar → "Create post" modal) ----------------

interface CreatePostModalProps {
  onClose: () => void;
  onCreate: (formData: FormData) => Promise<unknown>;
  startWithPhoto: boolean;
}

function CreatePostModal({ onClose, onCreate, startWithPhoto }: CreatePostModalProps) {
  const name = useUserName();
  const { user: me } = useMe();
  const toast = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [area, setArea] = useState("Mirpur 10");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = Boolean(text.trim() || photo);

  const requestClose = useCallback(() => {
    if (busy) return;
    if (dirty && !confirm("Discard this post?")) return;
    onClose();
  }, [busy, dirty, onClose]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (!d.open) d.showModal();
    textRef.current?.focus();
    if (startWithPhoto) fileRef.current?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault(); // Esc → ask before discarding
      requestClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [requestClose]);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const problem = checkImageFile(file);
    if (problem) return setError(problem);
    setError("");
    try {
      setPhoto(await shrinkImage(file));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("body", text.trim());
    fd.set("area", area);
    if (photo) fd.set("photo", await dataUrlToBlob(photo), "photo.jpg");
    try {
      await onCreate(fd);
      toast("Your post is live.");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="postmodal"
      aria-labelledby="postmodal-title"
      onClick={(e) => e.target === dialogRef.current && requestClose()}
    >
      <form onSubmit={submit}>
        <header className="postmodal__head">
          <h2 id="postmodal-title">Create post</h2>
          <button type="button" className="postmodal__close" aria-label="Close" onClick={requestClose}>
            ×
          </button>
        </header>

        <div className="postmodal__body">
          <div className="postmodal__author">
            <Avatar name={name} src={me?.avatarUrl} />
            <div>
              <strong>{name}</strong>
              <label className="postmodal__chip">
                <img className="ic" src="/icons/pin.svg" alt="" />
                <select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Location">
                  {AREAS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <textarea
            ref={textRef}
            className={photo ? "is-small" : undefined}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder={`What’s happening around you, ${name.split(" ")[0]}?`}
            aria-label="Post text"
          />

          {photo ? (
            <div className="postmodal__photo">
              <img src={photo} alt="Selected photo" />
              <button type="button" aria-label="Remove photo" onClick={() => setPhoto(null)}>
                ×
              </button>
            </div>
          ) : null}

          {text.length > 800 && <small className="postmodal__count">{1000 - text.length} characters left</small>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="postmodal__add">
            <span>Add to your post</span>
            <div>
              <button type="button" title="Photo" aria-label="Add photo" onClick={() => fileRef.current?.click()}>
                <img src="/icons/photo.svg" alt="" />
              </button>
              <button type="button" title="Location" aria-label="Change location" onClick={() => document.querySelector<HTMLSelectElement>(".postmodal__chip select")?.focus()}>
                <img src="/icons/pin.svg" alt="" />
              </button>
              <Link href="/reports" title="Report an issue" aria-label="Report an issue instead">
                <img src="/icons/alert.svg" alt="" />
              </Link>
              <Link href="/missions" title="Missions" aria-label="Find a mission">
                <img src="/icons/flag.svg" alt="" />
              </Link>
            </div>
          </div>
        </div>

        <footer className="postmodal__foot">
          <button type="submit" className="postmodal__post" disabled={!dirty || busy}>
            {busy ? "Posting…" : "Post"}
          </button>
        </footer>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={pick} />
      </form>
    </dialog>
  );
}

function Composer({ onCreate }: { onCreate: CreatePostModalProps["onCreate"] }) {
  const name = useUserName();
  const { user: me } = useMe();
  const [open, setOpen] = useState<"text" | "photo" | null>(null);

  return (
    <>
      <div className="card composer composer--bar">
        <div className="composer__row">
          <Avatar name={name} src={me?.avatarUrl} size="sm" />
          <button type="button" className="composer__open" onClick={() => setOpen("text")}>
            What’s on your mind, {name.split(" ")[0]}?
          </button>
        </div>
        <div className="composer__tools">
          <button type="button" onClick={() => setOpen("photo")}>
            <img className="ic" src="/icons/photo.svg" alt="" />
            Photo
          </button>
          <Link href="/reports">
            <img className="ic" src="/icons/alert.svg" alt="" />
            Report an issue
          </Link>
          <Link href="/missions">
            <img className="ic" src="/icons/flag.svg" alt="" />
            Join a mission
          </Link>
        </div>
      </div>
      {open && <CreatePostModal onClose={() => setOpen(null)} onCreate={onCreate} startWithPhoto={open === "photo"} />}
    </>
  );
}

// ---------------- Comments ----------------

function Comments({ post }: { post: PostData }) {
  const toast = useToast();
  const { comments, loading, add, remove } = useComments(post.id, true);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const name = useUserName();
  const { user: me } = useMe();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await add(text.trim());
      setText("");
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="comments">
      {loading && <p className="comments__empty">Loading comments…</p>}
      {!loading && !comments.length && <p className="comments__empty">No comments yet. Be the first!</p>}
      <ul>
        {comments.map((c: Comment) => (
          <li key={c.id}>
            <Avatar name={c.author} src={c.avatar} size="sm" color={c.mine ? "var(--green-500)" : "#8a8f8b"} />
            <div className="comment__bubble">
              <strong>{c.author}</strong>
              <p>{c.body}</p>
              <small>
                {timeAgo(c.createdAt)}
                {c.mine && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={() =>
                        remove(c.id).then(
                          () => toast("Comment deleted."),
                          (err: unknown) => toast(errorMessage(err)),
                        )
                      }
                    >
                      Delete
                    </button>
                  </>
                )}
              </small>
            </div>
          </li>
        ))}
      </ul>
      <form className="comments__form" onSubmit={submit}>
        <Avatar name={name} src={me?.avatarUrl} size="sm" />
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Write a comment…" aria-label="Write a comment" />
        <button type="submit" disabled={!text.trim() || busy} aria-label="Send comment">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l16-8-6 16-3-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

// ---------------- Post ----------------

function PostMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="post__more" aria-label="Post options" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        •••
      </button>
      {open && (
        <div className="dropdown account" role="menu">
          <button
            role="menuitem"
            type="button"
            className="danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Delete post
          </button>
        </div>
      )}
    </div>
  );
}

const STATUS_TAG: Record<string, string> = { submitted: "tag--outline", review: "tag--warn", resolved: "tag--success" };

function Attachment({ a, mine }: { a: Attachment | null; mine: boolean }) {
  const { missions, isJoined, toggle } = useMissions();
  const toast = useToast();
  if (!a) return null;

  if (a.kind === "alert") {
    return (
      <div className="alertbox">
        <img className="ic" src="/icons/alert-red.svg" alt="" />
        <div>
          <strong>{a.title}</strong>
          <small>{a.sub}</small>
        </div>
      </div>
    );
  }
  if (a.kind === "report") {
    const inner = (
      <>
        <img className="ic" src="/icons/alert.svg" alt="" />
        <div>
          <strong>{a.title}</strong>
          <small>{a.sub}</small>
        </div>
        <span className={`tag ${(a.statusKey ? STATUS_TAG[a.statusKey] : undefined) ?? "tag--success"}`}>{a.status}</span>
      </>
    );
    // Your own report links to your Reports page; other people's reports are shown as a card.
    return mine || !a.statusKey ? (
      <Link href={a.href || "/reports"} className="linkcard">
        {inner}
      </Link>
    ) : (
      <div className="linkcard">{inner}</div>
    );
  }
  if (a.kind === "mission") {
    const m = missions.find((x: { id: string }) => x.id === a.missionId);
    const missionId = a.missionId ?? "";
    const joined = isJoined(missionId);
    return (
      <div className="linkcard">
        <img className="ic" src="/icons/leaf-green.svg" alt="" />
        <Link href={`/missions?open=${a.missionId}`}>
          <strong>{a.title}</strong>
          <small>
            {a.sub}
            {m ? ` · ${m.joined.toLocaleString()} going` : ""}
          </small>
        </Link>
        <button
          type="button"
          className={`join-btn${joined ? " is-joined" : ""}`}
          disabled={!m}
          onClick={() =>
            toggle(missionId).then(
              () => toast(joined ? `You left “${a.title}”.` : `You joined “${a.title}”!`),
              (err: unknown) => toast(errorMessage(err)),
            )
          }
        >
          {joined ? "✓ Joined" : "Join"}
        </button>
      </div>
    );
  }
  return null;
}

interface PostProps {
  post: PostData;
  feed: Feed;
  highlight?: boolean;
}

export function Post({ post, feed, highlight }: PostProps) {
  const toast = useToast();
  const [showComments, setShowComments] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  const run = (p: Promise<unknown>) => p.catch((err: unknown) => toast(errorMessage(err)));

  async function share() {
    const url = `${location.origin}/feed?post=${post.id}`;
    try {
      // Phones: native share sheet. Computers: copy the link.
      const touch = matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.share) await navigator.share({ title: `${post.author.name} on EcoPulse BD`, text: post.body.slice(0, 100), url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied to clipboard.");
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // user closed the share sheet
      toast("Couldn’t share — copy the address bar link instead.");
      return;
    }
    run(feed.share(post));
  }

  return (
    <article ref={ref} className={`card post${highlight ? " is-highlight" : ""}`} id={`post-${post.id}`}>
      <header className="post__head">
        {post.author.badge === "Official" && post.author.name === "EcoPulse BD" ? (
          <img className="avatar" src="/images/logo.svg" alt="" />
        ) : (
          <Avatar name={post.author.name} src={post.author.avatar} color={post.author.color} />
        )}
        <div className="post__meta">
          <strong>{post.author.name}</strong> <span className="muted">{post.action}</span>
          <small>
            {post.area} · {timeAgo(post.createdAt)}
            {post.community && (
              <>
                {" · "}
                <Link href={`/missions?q=${encodeURIComponent(post.community.split(" ")[0])}`}>{post.community}</Link>
              </>
            )}
          </small>
        </div>
        {post.author.badge && <span className="tag tag--outline">{post.author.badge}</span>}
        {post.mine && (
          <PostMenu
            onDelete={() => {
              if (confirm("Delete this post? This can’t be undone.")) run(feed.remove(post).then(() => toast("Post deleted.")));
            }}
          />
        )}
      </header>

      <Body text={post.body} />
      <Attachment a={post.attachment} mine={post.mine} />

      {post.image && (
        <figure className="post__media">
          {post.mediaLabel && <span className="media-label">{post.mediaLabel}</span>}
          <img src={post.image} alt={`Photo shared by ${post.author.name}`} loading="lazy" />
        </figure>
      )}

      <div className="post__stats">
        <span>🌿 {post.likes} inspired</span>
        <button type="button" onClick={() => setShowComments((s) => !s)}>
          {post.comments} comment{post.comments === 1 ? "" : "s"} · {post.shares} share{post.shares === 1 ? "" : "s"}
        </button>
      </div>

      <footer className="post__actions">
        <button type="button" className={post.liked ? "liked" : undefined} aria-pressed={post.liked} onClick={() => run(feed.toggleLike(post))}>
          <img className="ic" src={post.liked ? "/icons/heart-red.svg" : "/icons/leaf.svg"} alt="" />
          {post.liked ? "Inspired" : "Inspire"}
        </button>
        <button type="button" aria-expanded={showComments} onClick={() => setShowComments((s) => !s)}>
          <img className="ic" src="/icons/chat.svg" alt="" />
          Comment
        </button>
        <button type="button" onClick={share}>
          <img className="ic" src="/icons/share.svg" alt="" />
          Share
        </button>
        <button
          type="button"
          className={post.saved ? "saved" : undefined}
          aria-pressed={post.saved}
          onClick={() => run(feed.toggleSave(post).then((p: PostData) => toast(p.saved ? "Saved to your posts." : "Removed from saved.")))}
        >
          <img className="ic" src="/icons/bookmark.svg" alt="" />
          {post.saved ? "Saved" : "Save"}
        </button>
      </footer>

      {showComments && <Comments post={post} />}
    </article>
  );
}

// ---------------- Feed ----------------

export default function FeedBoard() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewParam = params.get("view");
  const view: FeedView = VIEWS.find((v) => v.key === viewParam)?.key ?? "all";
  const highlightId = Number(params.get("post")) || null;
  const feed = useFeed(view);

  const setView = (v: FeedView) => {
    const sp = new URLSearchParams();
    if (v !== "all") sp.set("view", v);
    router.replace(`${pathname}${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  return (
    <section className="feed" aria-label="Community feed">
      <div className="hero">
        <div className="hero__content">
          <span className="eyebrow">
            <span className="dot dot--light"></span>TODAY IN {LIVE.area.toUpperCase()}
          </span>
          <h1>
            Small actions keep
            <br />
            the city breathing.
          </h1>
          <div className="hero__stats">
            <div>
              <b>AQI {LIVE.aqi}</b>
              <small>{LIVE.aqiLabel}</small>
            </div>
            <div>
              <b>{LIVE.humidity}%</b>
              <small>Humidity today</small>
            </div>
            <div>
              <b>{LIVE.floodRisk}</b>
              <small>Flood risk</small>
            </div>
          </div>
          <div className="hero__actions">
            <Link href="/missions" className="btn btn--light">
              Find a mission near me →
            </Link>
            <Link href="/assistant" className="btn btn--ghost">
              Ask the assistant
            </Link>
          </div>
        </div>
        <img className="hero__badge" src="/images/hero-badge.svg" alt="" />
      </div>

      <Composer onCreate={feed.create} />

      <div className="tabs" role="tablist" aria-label="Feed">
        {VIEWS.map((v) => (
          <button key={v.key} type="button" role="tab" aria-selected={view === v.key} className={view === v.key ? "on" : undefined} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      {feed.loading && <p className="feed__empty">Loading posts…</p>}
      {feed.error && <p className="feed__empty">Couldn’t load the feed: {feed.error.message}</p>}
      {!feed.loading && !feed.error && !feed.posts.length && (
        <p className="feed__empty">
          {view === "saved"
            ? "No saved posts yet. Tap Save on a post to keep it here."
            : view === "mine"
              ? "You haven’t posted yet. Share your first update above!"
              : "No posts here yet."}
        </p>
      )}

      {feed.posts.map((p: PostData) => (
        <Post key={p.id} post={p} feed={feed} highlight={p.id === highlightId} />
      ))}
    </section>
  );
}
