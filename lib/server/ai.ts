import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { LIVE, MISSION_CATEGORIES, RECYCLING_POINTS } from "../app-data";
import type { Mission } from "../types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Per-request facts about the user, given to the model alongside the question. */
export interface AssistantContext {
  name: string;
  missions: Mission[];
  /** Ids of missions the user has joined. */
  joined: string[];
  isOrganizer: boolean;
}

/*
 * AI assistant (Claude).
 *   ANTHROPIC_API_KEY   – turns the AI on. Without it the app falls back to built-in answers.
 *   ANTHROPIC_BASE_URL  – optional API link (proxy / gateway). The SDK reads it automatically.
 *   AI_MODEL            – optional model id (default: claude-opus-5-5).
 */

export const AI_MODEL = process.env.AI_MODEL || "claude-opus-5-5";
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const g = globalThis as typeof globalThis & { __ecopulseAnthropic?: Anthropic };
function client(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the environment. An empty ANTHROPIC_BASE_URL= line (copied from
  // .env.example) must not override the default API address, so pass it explicitly.
  return (g.__ecopulseAnthropic ??= new Anthropic({
    baseURL: process.env.ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com",
  }));
}

/** Stable instructions (cached by the API across requests). */
const SYSTEM = `You are the EcoPulse BD assistant, a friendly helper for residents of Dhaka, Bangladesh, inside the EcoPulse BD app.
You help with air quality, heat and UV, flood readiness, waste and recycling, tree planting, community missions and problem reports.

How to answer:
- Use the live readings and app data given to you. Do not invent readings, places or missions that are not in the data.
- Keep answers short and practical: 2–5 sentences, or a few bullet points when listing things.
- Reply in the same language the user writes in (English or Bangla).
- For safety-critical situations (floods, storms, fires, medical issues) remind people to follow official alerts from BWDB, the Department of Environment and local authorities, and to call 999 in an emergency. You give guidance, not official warnings.
- You can point people to app pages by name: Feed, Missions, Reports, Profile (Rewards tab), Assistant.`;

function contextBlock({ name, missions = [], joined = [], isOrganizer }: AssistantContext): string {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = missions
    .filter((m) => m.end >= today)
    .slice(0, 10)
    .map(
      (m) =>
        `- ${m.title} (${MISSION_CATEGORIES[m.category] ?? m.category}) · ${m.location} · ${m.start} to ${m.end} · ${m.joined}/${m.capacity} joined${
          joined.includes(m.id) ? " · USER HAS JOINED" : ""
        }`,
    )
    .join("\n");
  const recycling = RECYCLING_POINTS.map((p) => `- ${p.name} (${p.distance}): ${p.accepts}; ${p.hours}`).join("\n");

  return `Current context (today is ${today}):
User: ${name} (${isOrganizer ? "organizer — can create missions" : "citizen — can post, report and join missions; only organizers create missions"})
Area: ${LIVE.area}
Live readings (updated ${LIVE.updated}): AQI ${LIVE.aqi} (${LIVE.aqiLabel}), PM2.5 ${LIVE.pm25} µg/m³, UV index ${LIVE.uv}, temperature ${LIVE.tempC}°C, humidity ${LIVE.humidity}%, flood risk ${LIVE.floodRisk}, chance of rain ${LIVE.rainChance}%.
Upcoming missions:
${upcoming || "- none"}
Nearby recycling points:
${recycling}`;
}

/**
 * history: [{ role: "user" | "assistant", content: string }, ...] ending with the user's question.
 * Returns { text } or throws.
 */
export async function askAI(history: ChatMessage[], ctx: AssistantContext): Promise<{ text: string }> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    // Per-request context goes in the conversation (after the cached system prompt).
    { role: "user", content: contextBlock(ctx) },
    { role: "assistant", content: "Thanks — I'll use this context." },
    ...history,
  ];

  const response = await client().beta.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    // Short chat answers: low effort keeps replies fast and inexpensive.
    output_config: { effort: "low" },
    // If the model declines on a safety policy, the API retries on a suitable fallback model.
    // Only these models accept the "default" fallback form; set AI_FALLBACKS=false to turn it off
    // (e.g. when ANTHROPIC_BASE_URL points at a gateway that doesn't support it).
    ...(FALLBACK_MODELS.has(AI_MODEL) && process.env.AI_FALLBACKS !== "false"
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
      : {}),
    messages,
  });

  if (response.stop_reason === "refusal") {
    return { text: "Sorry, I can’t help with that one. Try asking about air quality, floods, recycling or missions." };
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return { text: text || "Sorry, I couldn’t come up with an answer. Please try rephrasing." };
}
