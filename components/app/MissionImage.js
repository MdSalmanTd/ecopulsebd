"use client";

import { useState } from "react";

// Local illustrations used if a mission's photo can't load (offline, blocked CDN, bad URL).
const FALLBACK = {
  trees: "/images/post-park.svg",
  waste: "/images/post-river.svg",
  drainage: "/images/report-drain.svg",
  plastic: "/images/post-dumping.svg",
};

export default function MissionImage({ mission, className, eager = false }) {
  const [failed, setFailed] = useState(false);
  const src = failed || !mission.image ? FALLBACK[mission.category] ?? FALLBACK.trees : mission.image;
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
