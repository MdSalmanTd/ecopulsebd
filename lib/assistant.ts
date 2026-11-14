// Rule-based assistant that answers from the live readings and app data.
// Stand-in until a real AI backend is connected — it only knows what is in this file's inputs.

import { LIVE, RECYCLING_POINTS, MISSION_CATEGORIES } from "./app-data";
import type { Mission } from "./types";

export interface AssistantLink {
  label: string;
  href: string;
}

/** A rule-based reply (the API adds `source`). */
export interface AssistantReply {
  text: string;
  links?: AssistantLink[];
}

/** What answer() knows about the asking user. */
export interface AssistantContext {
  name: string;
  missions: Mission[];
  /** ids of missions the user has joined */
  joined: string[];
  isOrganizer?: boolean;
}

const CATEGORY_LABELS: Record<string, string | undefined> = MISSION_CATEGORIES;

// Matches whole words / word starts, so "hi" doesn't match "this" and "hot" doesn't match "photo".
const esc = (w: string): string => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const day = (d: string): string =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
const has = (text: string, ...words: string[]): boolean =>
  words.some((w) => new RegExp(`\\b${esc(w.trim())}`, "i").test(text));

function aqiAdvice(aqi: number): string {
  if (aqi <= 50) return "Air is good — enjoy being outside.";
  if (aqi <= 100)
    return "Air is moderate. Most people are fine; very sensitive people should take it easy.";
  if (aqi <= 150)
    return "Air is unhealthy for sensitive groups. If you have asthma, heart or lung conditions, or you're older or pregnant, keep outdoor exercise short and wear an N95 mask.";
  if (aqi <= 200)
    return "Air is unhealthy for everyone. Move workouts indoors and wear an N95 mask outside.";
  return "Air is very unhealthy. Stay indoors with windows closed if you can.";
}

/** Answers `input` (the user's question) from live readings and the user's missions. */
export function answer(input: string, ctx: AssistantContext): AssistantReply {
  const q = input.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = ctx.missions.filter((m) => m.end >= today);

  if (/^(hi|hello|hey|salam|assalamu)\b/.test(q)) {
    return {
      text: `Hi ${ctx.name.split(" ")[0]}! Ask me about air quality, flood risk, missions or recycling near ${LIVE.area}.`,
    };
  }

  if (
    has(
      q,
      "jog",
      "run",
      "exercise",
      "walk",
      "cycle",
      "outside",
      "outdoor",
      "safe",
    )
  ) {
    return {
      text: `Right now the AQI in ${LIVE.area} is ${LIVE.aqi} (${LIVE.aqiLabel}), PM2.5 ${LIVE.pm25} µg/m³. ${aqiAdvice(LIVE.aqi)} Early morning or after rain is usually cleaner. UV is ${LIVE.uv}, so if you go out after 10am bring shade and water.`,
    };
  }

  if (has(q, "aqi", "air", "pollution", "smog", "mask", "pm2", "pm 2")) {
    return {
      text: `AQI ${LIVE.aqi} in ${LIVE.area} (updated ${LIVE.updated}). ${aqiAdvice(LIVE.aqi)} AQI scale: 0–50 good, 51–100 moderate, 101–150 unhealthy for sensitive groups, 151–200 unhealthy, 200+ very unhealthy.`,
    };
  }

  if (has(q, "uv", "sun", "sunscreen", "heat", "hot", "temperature")) {
    return {
      text: `UV index today is ${LIVE.uv} — that's "very high" (8–10). Unprotected skin can burn in about 15–20 minutes. Use SPF 30+, a hat and sunglasses, and seek shade between 10am and 3pm. It's ${LIVE.tempC}°C with ${LIVE.humidity}% humidity, so drink plenty of water.`,
    };
  }

  if (has(q, "flood", "rain", "monsoon", "waterlog", "water-log", "drain")) {
    return {
      text: `Flood risk in ${LIVE.area} is ${LIVE.floodRisk.toLowerCase()} today, with a ${LIVE.rainChance}% chance of rain. Keep phones charged, move valuables off the floor, and avoid walking through moving water. If you see a blocked drain, report it so the ward team can clear it. For official warnings, follow BWDB and your local authorities.`,
      links: [{ label: "Report a blocked drain", href: "/reports" }],
    };
  }

  if (
    has(
      q,
      "recycl",
      "bottle",
      "plastic",
      "e-waste",
      "battery",
      "batteries",
      "trash",
      "garbage",
      "waste",
    )
  ) {
    const pts = RECYCLING_POINTS.map(
      (p) => `• ${p.name} (${p.distance}) — ${p.accepts}; ${p.hours}`,
    ).join("\n");
    return {
      text: `Nearest recycling points to ${LIVE.area}:\n${pts}`,
      links: [{ label: "See waste clean-up missions", href: "/missions" }],
    };
  }

  if (has(q, "tree", "plant", "green", "sapling")) {
    const trees = upcoming.filter((m) => m.category === "trees");
    if (trees.length) {
      return {
        text: `You can plant with these upcoming missions:\n${trees.map((m) => `• ${m.title} — ${m.location}, from ${day(m.start)}`).join("\n")}\nSaplings and tools are provided by organizers.`,
        links: trees
          .slice(0, 2)
          .map((m) => ({
            label: `Open “${m.title}”`,
            href: `/missions?open=${m.id}`,
          })),
      };
    }
    return ctx.isOrganizer
      ? {
          text: "There are no tree-planting missions scheduled right now. As an organizer, you can start one.",
          links: [{ label: "Create a mission", href: "/missions?create=1" }],
        }
      : {
          text: "There are no tree-planting missions scheduled right now. Organizers post new ones often — check back soon, or post a tree-planting idea on the feed.",
          links: [{ label: "Go to the feed", href: "/feed" }],
        };
  }

  if (has(q, "mission", "volunteer", "join", "event", "clean-up", "cleanup")) {
    const mine = upcoming.filter((m) => ctx.joined.includes(m.id));
    const open = upcoming
      .filter((m) => !ctx.joined.includes(m.id) && m.joined < m.capacity)
      .slice(0, 3);
    const lines: string[] = [];
    if (mine.length)
      lines.push(`You've joined: ${mine.map((m) => m.title).join(", ")}.`);
    if (open.length)
      lines.push(
        `Open near you:\n${open.map((m) => `• ${m.title} (${CATEGORY_LABELS[m.category]}) — ${m.location}`).join("\n")}`,
      );
    return {
      text: lines.join("\n") || "No open missions right now — check back soon.",
      links: [{ label: "Browse missions", href: "/missions" }],
    };
  }

  if (has(q, "report", "dumping", "complain")) {
    return {
      text: "To report a problem: pick what you saw, add a photo, choose the location and send. Neighbours verify it and it goes to the local team. You earn XP once it's verified.",
      links: [{ label: "Submit a report", href: "/reports" }],
    };
  }

  if (has(q, "xp", "point", "badge", "reward", "coin", "level", "score")) {
    return {
      text: "You earn XP and Eco Coins for verified reports and completed missions. You're Level 4 with 1,420 XP — 180 more to reach Level 5.",
      links: [{ label: "View rewards", href: "/profile?tab=rewards" }],
    };
  }

  return {
    text: `I can help with air quality, UV and heat, flood risk, recycling points, missions and reports for ${LIVE.area}. Try one of the suggestions below.`,
  };
}
