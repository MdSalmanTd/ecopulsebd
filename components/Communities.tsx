"use client";

import Link from "next/link";
import { useT } from "@/lib/hooks";

interface Community {
  name: string;
  members: string;
  tone: string;
  icon: string;
  q: string;
}

const COMMUNITIES: Community[] = [
  { name: "Green Mirpur", members: "1,204 members", tone: "green", icon: "/icons/leaf-white.svg", q: "Mirpur" },
  { name: "Dhanmondi Lake Keepers", members: "612 members", tone: "blue", icon: "/icons/flag-white.svg", q: "Dhanmondi" },
];

export default function Communities() {
  const t = useT();
  return (
    <section className="communities">
      <h2>{t("Your communities")}</h2>
      {COMMUNITIES.map((c) => (
        <Link key={c.name} href={`/missions?q=${encodeURIComponent(c.q)}`} className="community">
          <span className={`sq sq--${c.tone}`}>
            <img className="ic" src={c.icon} alt="" />
          </span>
          <span>
            <strong>{c.name}</strong>
            <small>{c.members}</small>
          </span>
        </Link>
      ))}
    </section>
  );
}
