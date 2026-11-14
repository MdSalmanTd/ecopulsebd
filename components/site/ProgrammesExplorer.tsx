"use client";

import { useState } from "react";
import ProgrammeCard from "./ProgrammeCard";
import { PROGRAMMES } from "./data";

const TABS = ["All", "Ongoing", "Upcoming", "Completed"];

export default function ProgrammesExplorer() {
  const [tab, setTab] = useState("All");
  const list = tab === "All" ? PROGRAMMES : PROGRAMMES.filter((p) => p.status === tab);

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Filter programmes">
        {TABS.map((t) => {
          const n = t === "All" ? PROGRAMMES.length : PROGRAMMES.filter((p) => p.status === t).length;
          return (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "is-on" : undefined} onClick={() => setTab(t)}>
              {t} <span>{n}</span>
            </button>
          );
        })}
      </div>
      <div className="cards3" key={tab}>
        {list.map((p) => (
          <ProgrammeCard key={p.title} {...p} />
        ))}
      </div>
    </>
  );
}
