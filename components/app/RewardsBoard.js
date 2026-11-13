"use client";

import { useEffect, useRef, useState } from "react";
import { useMe, useMissions, useReports } from "@/lib/app-state";
import Avatar from "@/components/Avatar";
import { ISSUE_LABELS } from "@/lib/app-data";
import { initials, useUserName } from "@/lib/useUser";

const BADGES = [
  { name: "Tree Guardian", desc: "Joined 5 tree-planting missions", icon: "/icons/leaf-green.svg", earned: true, progress: [5, 5], how: "Join and attend tree-planting missions." },
  { name: "Drain Hero", desc: "Reported 10 drainage issues", icon: "/icons/info-blue.svg", tone: "blue", earned: true, progress: [10, 10], how: "Report blocked drains that get verified." },
  { name: "Clean Streets", desc: "Joined 3 clean-up drives", icon: "/icons/trophy.svg", tone: "amber", earned: true, progress: [3, 3], how: "Take part in waste clean-up missions." },
  { name: "Sharp Eye", desc: "5 reports verified", icon: "/icons/search.svg", progress: [3, 5], how: "Submit clear, accurate reports — each verified one counts." },
  { name: "Plastic Free", desc: "Recycled 50 items", icon: "/icons/leaf.svg", progress: [32, 50], how: "Log items you drop at recycling points." },
  { name: "Flood Ready", desc: "Completed 2 flood missions", icon: "/icons/flag.svg", progress: [1, 2], how: "Join pre-monsoon drain checks and flood-prep missions." },
];

const BOARDS = {
  month: [
    { name: "Tanvir Ahmed", initials: "TA", color: "#7b5ea7", score: 2180 },
    { name: "Farhana Akter", initials: "FA", color: "#c4663b", score: 2140 },
    { name: "Rakib Hasan", initials: "RH", color: "#3d6fa8", score: 1950 },
    { name: "Sumaiya Islam", initials: "SI", color: "#a8476b", score: 1770 },
    { name: "Arif Hossain", initials: "AH", color: "#2c8a86", score: 1520 },
    { you: true, score: 1420 },
  ],
  all: [
    { name: "Farhana Akter", initials: "FA", color: "#c4663b", score: 9840 },
    { name: "Tanvir Ahmed", initials: "TA", color: "#7b5ea7", score: 9210 },
    { name: "Sumaiya Islam", initials: "SI", color: "#a8476b", score: 7760 },
    { you: true, score: 6950 },
    { name: "Rakib Hasan", initials: "RH", color: "#3d6fa8", score: 6420 },
    { name: "Arif Hossain", initials: "AH", color: "#2c8a86", score: 5180 },
  ],
};

const BASE_ACTIVITY = [
  { title: "Joined Green Mirpur Drive", meta: "Mission · 2 days ago", xp: 80, tone: "green", icon: "/icons/leaf-white.svg" },
  { title: "Reported a blocked drain", meta: "Report verified · 4 days ago", xp: 25, tone: "blue", icon: "/icons/flag-white.svg" },
  { title: "Earned “Clean Streets”", meta: "Badge · 1 week ago", xp: 120, tone: "teal", icon: "/icons/flag-white.svg" },
];

export default function RewardsBoard({ embedded = false }) {
  const name = useUserName();
  const { user: me } = useMe();
  const { reports: myReports } = useReports();
  const { missions, joined } = useMissions();
  const [period, setPeriod] = useState("month");
  const [badge, setBadge] = useState(null);
  const earned = BADGES.filter((b) => b.earned).length;

  // Recent things the user did in this browser show up first (XP is pending until verified).
  const recent = [
    ...myReports.slice(0, 3).map((r) => ({
      title: `Reported ${ISSUE_LABELS[r.issue].toLowerCase()}`,
      meta: `Report ${r.id} · ${r.status === "resolved" ? "resolved" : r.status === "review" ? "in review" : "awaiting verification"}`,
      xp: r.status === "resolved" ? 25 : "pending",
      tone: "blue",
      icon: "/icons/flag-white.svg",
    })),
  ];
  const activity = [...recent, ...BASE_ACTIVITY].slice(0, 5);
  const joinedUpcoming = missions.filter((m) => joined.includes(m.id) && m.end >= new Date().toISOString().slice(0, 10));

  return (
    <section className="rewards">
      {!embedded && (
        <>
      <header className="page-head">
        <span className="eyebrow eyebrow--dark">YOUR IMPACT, RECOGNISED</span>
        <h1>Rewards</h1>
      </header>

      <div className="card summary">
        <span className="summary__avatar">{initials(name)}</span>
        <div className="summary__info">
          <h2>{name}</h2>
          <small>Citizen · Mirpur 10, Dhaka · Joined Aug 2026</small>
          <div className="summary__bar">
            <span style={{ width: "89%" }}></span>
          </div>
        </div>
        <div className="summary__level">
          <strong>Level 4</strong>
          <small>1,420 / 1,600 XP to Level 5</small>
        </div>
      </div>

        </>
      )}

      <div className="stats">
        <div className="stat stat--dark">
          <small>ECO SCORE</small>
          <strong>1,420</strong>
          <span>From verified missions &amp; reports</span>
        </div>
        <div className="stat stat--cream">
          <small>ECO COINS</small>
          <strong>380</strong>
          <span>In-app reward currency</span>
        </div>
        <div className="stat">
          <small>UPCOMING MISSIONS</small>
          <strong>{joinedUpcoming.length}</strong>
          <span>{joinedUpcoming[0] ? `Next: ${joinedUpcoming[0].title}` : "Join one to earn XP"}</span>
        </div>
      </div>

      <div className="rewards__grid">
        <div className="card">
          <div className="card__title">
            <h3>Badges</h3>
            <span className="tag tag--outline">
              {earned} / {BADGES.length}
            </span>
          </div>
          <div className="badges">
            {BADGES.map((b) => (
              <button
                type="button"
                key={b.name}
                className={`badge-card${b.earned ? "" : " is-locked"}`}
                onClick={() => setBadge(b)}
                aria-label={`${b.name}: ${b.earned ? "earned" : "locked"}. Show details`}
              >
                <span className={`badge-card__icon${b.tone ? ` badge-card__icon--${b.tone}` : ""}`}>
                  <img src={b.icon} alt="" />
                </span>
                <strong>{b.name}</strong>
                <small>{b.desc}</small>
                {b.earned ? <span className="tag tag--success">Earned</span> : <span className="tag tag--outline">Locked</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="rewards__side">
          <div className="card" id="leaderboard">
            <div className="card__title">
              <h3>Leaderboard · Mirpur</h3>
              <div className="seg seg--sm" role="tablist" aria-label="Leaderboard period">
                {[
                  ["month", "This month"],
                  ["all", "All time"],
                ].map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={period === k} className={period === k ? "on" : undefined} onClick={() => setPeriod(k)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <ol className="board" key={period}>
              {BOARDS[period].map((p, i) => (
                <li key={p.you ? "you" : p.name} className={p.you ? "is-you" : undefined}>
                  <span className="rank">#{i + 1}</span>
                  {p.you ? (
                    <Avatar name={name} src={me?.avatarUrl} size="sm" />
                  ) : (
                    <span className="avatar avatar--sm avatar--init" style={{ "--c": p.color }}>
                      {p.initials}
                    </span>
                  )}
                  <strong>{p.you ? "You" : p.name}</strong>
                  <b>{p.score.toLocaleString()}</b>
                </li>
              ))}
            </ol>
          </div>

          <div className="card">
            <div className="card__title">
              <h3>Activity log</h3>
            </div>
            <ul className="list activity">
              {activity.map((a, i) => (
                <li key={`${a.title}-${i}`}>
                  <span className={`sq sq--${a.tone}`}>
                    <img className="ic" src={a.icon} alt="" />
                  </span>
                  <div>
                    <strong>{a.title}</strong>
                    <small>{a.meta}</small>
                  </div>
                  <span className={`xp${a.xp === "pending" ? " xp--pending" : ""}`}>{a.xp === "pending" ? "Pending" : `+${a.xp} XP`}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {badge && <BadgeDialog badge={badge} onClose={() => setBadge(null)} />}
    </section>
  );
}

function BadgeDialog({ badge, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const onCancel = (e) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);
  const [have, need] = badge.progress;
  return (
    <dialog ref={ref} className="mdialog mdialog--sm" aria-label={badge.name} onClick={(e) => e.target === ref.current && onClose()}>
      <button type="button" className="mdialog__close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className={`badge-card__icon badge-card__icon--lg${badge.tone ? ` badge-card__icon--${badge.tone}` : ""}`}>
        <img src={badge.icon} alt="" />
      </div>
      <h2>{badge.name}</h2>
      <p>{badge.desc}</p>
      <div className="badge-progress">
        <div className="mbar">
          <span style={{ width: `${(have / need) * 100}%` }} />
        </div>
        <small>
          {have} / {need} {badge.earned ? "· Earned 🎉" : `· ${need - have} to go`}
        </small>
      </div>
      <p className="badge-how">
        <strong>How to earn:</strong> {badge.how}
      </p>
    </dialog>
  );
}
