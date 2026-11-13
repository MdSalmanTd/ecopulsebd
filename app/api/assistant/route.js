import Anthropic from "@anthropic-ai/sdk";
import { withUser, readJson, limit, HttpError } from "@/lib/server/auth";
import { listMissions } from "@/lib/server/data";
import { AI_MODEL, aiEnabled, askAI } from "@/lib/server/ai";
import { answer } from "@/lib/assistant";

// GET /api/assistant → is the AI model configured?
export const GET = withUser(async () => Response.json({ ai: aiEnabled(), model: aiEnabled() ? AI_MODEL : null }));

// POST /api/assistant { messages: [{ role: "user"|"assistant", content }] } → { text, links?, source }
export const POST = withUser(async (req, _ctx, user) => {
  await limit(`assistant:${user.id}`, 30, 10 * 60, "questions");
  const { messages } = await readJson(req);

  if (!Array.isArray(messages) || !messages.length) throw new HttpError(400, "Send at least one message.");
  const history = messages.slice(-12).map((m) => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: String(m?.content ?? "").slice(0, 2000),
  }));
  if (history.at(-1).role !== "user" || !history.at(-1).content.trim()) throw new HttpError(400, "The last message must be your question.");
  while (history.length && history[0].role !== "user") history.shift(); // conversation must start with the user

  const missions = await listMissions(user.id);
  const ctx = {
    name: user.name,
    missions,
    joined: missions.filter((m) => m.isJoined).map((m) => m.id),
    isOrganizer: user.role === "organizer",
  };

  if (aiEnabled()) {
    try {
      const { text } = await askAI(history, ctx);
      return Response.json({ text, source: "ai" });
    } catch (e) {
      // Log the reason, then fall back to built-in answers so the chat keeps working.
      if (e instanceof Anthropic.AuthenticationError) console.error("[assistant] invalid ANTHROPIC_API_KEY");
      else if (e instanceof Anthropic.RateLimitError) console.error("[assistant] AI rate limited");
      else if (e instanceof Anthropic.APIError) console.error(`[assistant] AI error ${e.status}: ${e.message}`);
      else console.error("[assistant]", e);
    }
  }

  const reply = answer(history.at(-1).content, ctx);
  return Response.json({ ...reply, source: "rules" });
});
