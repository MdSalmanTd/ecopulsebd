"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo, ArrowUpRight } from "./ui";
import { initials, useSignedIn, useUserName } from "@/lib/useUser";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/programmes", label: "Programmes" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const signedIn = useSignedIn();
  const name = useUserName();

  return (
    <header className={`snav${open ? " is-open" : ""}`}>
      <div className="wrap snav__inner">
        <Logo />

        <nav className="snav__links" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "is-active" : undefined}
              aria-current={pathname === l.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="snav__actions">
          {signedIn ? (
            <a href="/profile" className="snav__me" title={`Signed in as ${name}`}>
              <span className="snav__avatar">{initials(name)}</span>
              <span className="snav__name">{name.split(" ")[0]}</span>
            </a>
          ) : (
            <a href="/sign-in" className="snav__signin">
              Sign in
            </a>
          )}
          <a href={signedIn ? "/feed" : "/sign-in?mode=signup&next=%2Ffeed"} className="pill-btn pill-btn--dark">
            {signedIn ? "Go to the app" : "Get started"} <ArrowUpRight />
          </a>
          <button
            type="button"
            className="snav__toggle"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
