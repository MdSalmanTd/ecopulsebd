"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { signOut } from "@/lib/auth-actions";
import BrandLogo from "./BrandLogo";
import Avatar from "./Avatar";
import { clearStore } from "@/lib/store";
import { clearApiCache, useApi } from "@/lib/api-client";
import { useMe, useNotifications } from "@/lib/app-state";
import { useDismiss, useLang, useT } from "@/lib/hooks";
import { initials, useUserName } from "@/lib/useUser";
import { LIVE, SEED_MISSIONS } from "@/lib/app-data";

const PAGES = [
  { label: "Your profile", hint: "Profile", href: "/profile" },
  { label: "Feed", hint: "Community posts", href: "/feed" },
  { label: "Map", hint: "Missions, reports & recycling near you", href: "/map" },
  { label: "Saved posts", hint: "Feed", href: "/feed?view=saved" },
  { label: "Submit a report", hint: "Reports", href: "/reports" },
  { label: "My reports", hint: "Reports", href: "/reports#my-reports" },
  { label: "Missions", hint: "Join community action", href: "/missions" },
  { label: "Rewards & badges", hint: "Profile", href: "/profile?tab=rewards" },
  { label: "Leaderboard", hint: "Profile · Rewards", href: "/profile?tab=rewards#leaderboard" },
  { label: "Ask the assistant", hint: "AI Assistant", href: "/assistant" },
];


function Search() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const missions = SEED_MISSIONS.map((m) => ({
      label: m.title,
      hint: `Mission · ${m.location}`,
      href: `/missions?open=${m.id}`,
    }));
    return [...PAGES, ...missions]
      .filter((r) => `${r.label} ${r.hint}`.toLowerCase().includes(s))
      .slice(0, 7);
  }, [q]);

  const go = (r) => {
    setOpen(false);
    setQ("");
    router.push(r.href);
  };

  return (
    <div className="search-wrap" ref={ref}>
      <label className="search">
        <img className="ic" src="/icons/search.svg" alt="" />
        <input
          type="search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-label="Search"
          placeholder="Search missions, pages…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(results[active]);
            }
          }}
        />
      </label>
      {open && q.trim() && (
        <ul className="dropdown search-results" id="search-results" role="listbox">
          {results.length ? (
            results.map((r, i) => (
              <li
                key={r.href}
                role="option"
                aria-selected={i === active}
                className={i === active ? "is-active" : undefined}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(r);
                }}
              >
                <strong>{r.label}</strong>
                <small>{r.hint}</small>
              </li>
            ))
          ) : (
            <li className="dropdown__empty">No results for “{q}”</li>
          )}
        </ul>
      )}
    </div>
  );
}

function Notifications() {
  const { notifications, unread, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="menu-wrap" ref={ref}>
      <button
        className="icon-btn"
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <img className="ic" src="/icons/bell.svg" alt="" />
        {unread > 0 && <span className="badge"></span>}
      </button>
      {open && (
        <div className="dropdown notif" role="dialog" aria-label="Notifications">
          <div className="dropdown__head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" onClick={() => markRead(notifications.map((n) => n.id))}>
                Mark all read
              </button>
            )}
          </div>
          <ul>
            {notifications.map((n) => (
              <li key={n.id} className={n.read ? undefined : "is-unread"}>
                <Link
                  href={n.href}
                  onClick={() => {
                    if (!n.read) markRead([n.id]);
                    setOpen(false);
                  }}
                >
                  <span>{n.text}</span>
                  <small>{n.time}</small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const name = useUserName();
  const { user: me } = useMe();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="account-btn" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={name} src={me?.avatarUrl} />
      </button>
      {open && (
        <div className="dropdown account" role="menu">
          <div className="dropdown__head">
            <strong>{name}</strong>
          </div>
          <Link role="menuitem" href="/profile" onClick={close}>
            Your profile
          </Link>
          <Link role="menuitem" href="/profile?tab=saved" onClick={close}>
            Saved posts
          </Link>
          <Link role="menuitem" href="/profile?tab=rewards" onClick={close}>
            Rewards
          </Link>
          <Link role="menuitem" href="/missions?view=mine" onClick={close}>
            My missions
          </Link>
          <Link role="menuitem" href="/reports#my-reports" onClick={close}>
            My reports
          </Link>
          <form
            action={signOut}
            onSubmit={() => {
              clearStore();
              clearApiCache();
            }}
          >
            <button role="menuitem" type="submit" className="danger">
              {t("Sign out")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Facebook-style centre tabs: big icon-only buttons, tooltip on hover, underline on the current page.
const TABS = [
  { href: "/feed", label: "Feed", d: "M4 5h13v14H6a2 2 0 0 1-2-2V5Zm13 4h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4" },
  { href: "/map", label: "Map", d: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" },
  { href: "/missions", label: "Missions", d: "M5 21V4m0 0h11l-2 4 2 4H5" },
  { href: "/reports", label: "Reports", d: "M12 3 2 20h20L12 3Zm0 6v5m0 3v.5" },
  { href: "/profile?tab=rewards", match: "rewards", label: "Rewards", d: "M4 11h16v10H4zM3 7h18v4H3zm9 0v14M12 7S10.5 3 8 3.5 6.5 7 12 7Zm0 0s1.5-4 4-3.5S17.5 7 12 7Z" },
  {
    href: "/assistant",
    label: "Assistant",
    d: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  },
];

function FbTabs() {
  const pathname = usePathname();
  // Shares the /api/help cache the HelpBeacon keeps fresh — no extra polling here.
  const { data: helpData } = useApi("/api/help");
  const sos = (helpData?.requests ?? []).filter((r) => !r.mine).length;
  const tabParam = useSearchParams().get("tab");
  const t = useT();
  return (
    <nav className="fbtabs" aria-label="Main navigation">
      {TABS.map((tab) => {
        const active = tab.match ? pathname === "/profile" && tabParam === tab.match : pathname.startsWith(tab.href);
        const label = t(tab.label);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`fbtab${active ? " on" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={tab.d} />
            </svg>
            <span className="fbtab__label">{label}</span>
            {tab.href === "/map" && sos > 0 && (
              <span className="fbtab__sos" aria-label={`${sos} ${sos === 1 ? "person needs" : "people need"} help`}>
                {sos}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// Facebook-style header: logo + search (left) · icon tabs (centre) · status & account (right).
// On phones the tabs drop to a second row under the header.
export default function Topbar() {
  const [lang, setLang] = useLang();

  return (
    <header className="topbar topbar--fb">
      <div className="topbar__inner">
        <div className="topbar__left">
          <BrandLogo />
          <Search />
        </div>

        <Suspense fallback={<nav className="fbtabs" aria-label="Main navigation" />}>
          <FbTabs />
        </Suspense>

        <div className="topbar__right">
          <Link href="/assistant" className="pill pill--aqi" title={`AQI ${LIVE.aqi}: ${LIVE.aqiLabel}`}>
            <span className="dot"></span>AQI {LIVE.aqi}
          </Link>
          <div className="lang" role="group" aria-label="Language">
            <button className={lang === "en" ? "on" : undefined} type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              EN
            </button>
            <button className={lang === "bn" ? "on" : undefined} type="button" aria-pressed={lang === "bn"} onClick={() => setLang("bn")}>
              বাং
            </button>
          </div>
          <Notifications />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
