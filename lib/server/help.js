import "server-only";
import { query, tx } from "./db";
import { HttpError } from "./errors";
import { avatarUrl } from "./data";

export const HELP_KINDS = ["flood", "rescue", "medical", "supplies", "other"];
const ACTIVE = "r.status = 'active' AND r.expires_at > now()";

// $1 = viewer id
const SELECT = `
  SELECT r.id, r.user_id, r.kind, r.note, r.people, r.lat, r.lng, r.accuracy, r.status,
         r.created_at, r.located_at, r.expires_at,
         u.name AS user_name, (u.avatar IS NOT NULL) AS has_avatar, u.photo_version,
         (SELECT COUNT(*) FROM help_responders h WHERE h.request_id = r.id)::int AS responders,
         EXISTS (SELECT 1 FROM help_responders h WHERE h.request_id = r.id AND h.user_id = $1) AS responding
  FROM help_requests r JOIN users u ON u.id = r.user_id`;

function toHelp(r, viewerId) {
  return {
    id: r.id,
    kind: r.kind,
    note: r.note,
    people: r.people,
    at: [Number(r.lng), Number(r.lat)],
    accuracy: r.accuracy == null ? null : Math.round(Number(r.accuracy)),
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
    locatedAt: new Date(r.located_at).toISOString(),
    expiresAt: new Date(r.expires_at).toISOString(),
    user: { name: r.user_name, avatar: avatarUrl(r.user_id, r.has_avatar, r.photo_version) },
    responders: Number(r.responders),
    responding: Boolean(r.responding),
    mine: r.user_id === viewerId,
  };
}

/** Active (not expired) requests, newest first, plus the viewer's own active one. */
export async function listHelp(userId) {
  const rows = await query(`${SELECT} WHERE ${ACTIVE} ORDER BY r.created_at DESC LIMIT 200`, [userId]);
  const requests = rows.map((r) => toHelp(r, userId));
  return { requests, mine: requests.find((r) => r.mine) ?? null };
}

async function getHelp(userId, id, q = query) {
  const [r] = await q(`${SELECT} WHERE r.id = $2`, [userId, Number(id) || 0]);
  if (!r) throw new HttpError(404, "Help request not found.");
  return toHelp(r, userId);
}

function checkPoint(lat, lng, accuracy) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
    throw new HttpError(400, "We need your location to share it with helpers.");
  }
  const acc = accuracy == null ? null : Math.max(0, Math.min(100000, Number(accuracy) || 0));
  return [la, ln, acc];
}

export async function createHelp(userId, input) {
  const kind = HELP_KINDS.includes(input.kind) ? input.kind : null;
  if (!kind) throw new HttpError(400, "Choose what kind of help you need.");
  const note = String(input.note ?? "").trim().slice(0, 300);
  const people = Math.round(Number(input.people) || 1);
  if (people < 1 || people > 500) throw new HttpError(400, "Number of people must be between 1 and 500.");
  const [lat, lng, acc] = checkPoint(input.lat, input.lng, input.accuracy);

  return tx(async (q) => {
    const existing = await q(`SELECT id FROM help_requests r WHERE r.user_id = $1 AND ${ACTIVE}`, [userId]);
    if (existing.length) throw new HttpError(409, "You already have an active help request. Update or stop it first.");
    const [{ id }] = await q(
      `INSERT INTO help_requests (user_id, kind, note, people, lat, lng, accuracy) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [userId, kind, note, people, lat, lng, acc],
    );
    return getHelp(userId, id, q);
  });
}

/** Owner-only: update live location, and/or finish the request ("resolved" = safe, "cancelled"). */
export async function updateHelp(userId, id, input) {
  const [r] = await query(`SELECT user_id, status, expires_at > now() AS live FROM help_requests WHERE id = $1`, [Number(id) || 0]);
  if (!r || r.user_id !== userId) throw new HttpError(404, "Help request not found.");
  if (r.status !== "active" || !r.live) throw new HttpError(409, "This help request has already ended.");

  if (input.status) {
    if (!["resolved", "cancelled"].includes(input.status)) throw new HttpError(400, "Unknown status.");
    await query("UPDATE help_requests SET status = $2 WHERE id = $1", [Number(id), input.status]);
  } else {
    const [lat, lng, acc] = checkPoint(input.lat, input.lng, input.accuracy);
    await query("UPDATE help_requests SET lat = $2, lng = $3, accuracy = $4, located_at = now() WHERE id = $1", [Number(id), lat, lng, acc]);
  }
  return getHelp(userId, id);
}

export async function setResponding(userId, id, on) {
  const help = await getHelp(userId, id);
  if (help.mine) throw new HttpError(409, "You can’t respond to your own request.");
  if (help.status !== "active" || new Date(help.expiresAt) < new Date()) throw new HttpError(409, "This help request has ended.");
  if (on) await query("INSERT INTO help_responders (request_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [Number(id), userId]);
  else await query("DELETE FROM help_responders WHERE request_id = $1 AND user_id = $2", [Number(id), userId]);
  return getHelp(userId, id);
}
