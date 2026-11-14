"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { Mission, Volunteer } from "@/lib/types";
import { useMissions, useVolunteers } from "@/lib/app-state";
import { LIVE } from "@/lib/app-data";
import { initials } from "@/lib/useUser";
import { useToast } from "./Toast";

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));
const TONES: Record<string, string> = { trees: "green", drainage: "blue", waste: "teal", plastic: "green" };

export default function FeedSidebar() {
  const toast = useToast();
  const { missions, isJoined, toggle } = useMissions();
  const { volunteers, toggle: toggleFollow } = useVolunteers();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = missions.filter((m: Mission) => m.end >= today).sort((a: Mission, b: Mission) => a.start.localeCompare(b.start)).slice(0, 3);

  return (
    <aside className="sidebar sidebar--right" aria-label="Around you">
      <div className="card air">
        <h3>Air right now</h3>
        <div className="air__body">
          <div className="gauge" style={{ "--p": Math.min(100, Math.round((LIVE.aqi / 250) * 100)) } as CSSProperties}>
            <span>{LIVE.aqi}</span>
          </div>
          <div>
            <span className="tag tag--warn">{LIVE.aqiLabel}</span>
            <p>Mask on if you’re outside; light exercise before 5 PM.</p>
            <small className="muted">
              {LIVE.area} · updated {LIVE.updated}
            </small>
          </div>
        </div>
        <div className="air__chips">
          <span>PM2.5 · {LIVE.pm25}</span>
          <span>UV · {LIVE.uv}</span>
          <span>Humidity · {LIVE.humidity}%</span>
        </div>
        <Link href="/assistant" className="air__ask">
          Is it safe to go out? Ask the assistant →
        </Link>
      </div>

      <div className="card">
        <div className="card__title">
          <h3>Missions near you</h3>
          <Link href="/missions">See all</Link>
        </div>
        <ul className="list">
          {upcoming.map((m: Mission) => {
            const joined = isJoined(m.id);
            const full = !joined && m.joined >= m.capacity;
            return (
              <li key={m.id}>
                <span className={`sq sq--${TONES[m.category] ?? "green"}`}>
                  <img className="ic" src={m.category === "trees" ? "/icons/leaf-white.svg" : "/icons/flag-white.svg"} alt="" />
                </span>
                <Link href={`/missions?open=${m.id}`}>
                  <strong>{m.title}</strong>
                  <small>
                    {fmt(m.start)} · {m.location}
                  </small>
                </Link>
                <button
                  type="button"
                  className={`btn btn--sm ${joined ? "btn--soft" : "btn--dark"}`}
                  disabled={full || m.isOrganizer}
                  onClick={() =>
                    toggle(m.id).then(
                      () => toast(joined ? `You left “${m.title}”.` : `You joined “${m.title}”!`),
                      (e: unknown) => toast(errorMessage(e)),
                    )
                  }
                >
                  {m.isOrganizer ? "Yours" : joined ? "Joined" : full ? "Full" : "Join"}
                </button>
              </li>
            );
          })}
          {!upcoming.length && <li className="muted">No upcoming missions.</li>}
        </ul>
      </div>

      <div className="card">
        <div className="card__title">
          <h3>Volunteers to follow</h3>
        </div>
        <ul className="list">
          {volunteers.map((v: Volunteer) => (
            <li key={v.id}>
              <span className="avatar avatar--init avatar--sm" style={{ "--c": v.color } as CSSProperties}>
                {initials(v.name)}
              </span>
              <div>
                <strong>{v.name}</strong>
                <small>{v.sub}</small>
              </div>
              <button
                type="button"
                className={`btn btn--sm ${v.following ? "btn--soft" : "btn--dark"}`}
                aria-pressed={v.following}
                onClick={() =>
                  toggleFollow(v).then(
                    () => toast(v.following ? `Unfollowed ${v.name}.` : `Following ${v.name}.`),
                    (e: unknown) => toast(errorMessage(e)),
                  )
                }
              >
                {v.following ? "Following" : "Follow"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="infobox">
        <img className="ic" src="/icons/info-blue.svg" alt="" />
        <p>
          <strong>Use voice.</strong> Tap the mic on the assistant page to ask questions by speaking — no typing needed.
        </p>
      </div>
    </aside>
  );
}
