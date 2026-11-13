import "server-only";
import { query, tx } from "./db";
import { HttpError } from "./errors";
import { LOCATIONS, MISSION_CATEGORIES, SEED_NOTIFICATIONS } from "../app-data";

// ---------- Reports ----------

const reportId = (n) => `R-${1000 + Number(n)}`;
const parseReportId = (id) => {
  const m = /^R-(\d+)$/.exec(String(id));
  return m ? Number(m[1]) - 1000 : -1;
};

const REPORT_COLS = `id, issue, status, location, description, image_url, note, detail, created_at,
  (photo IS NOT NULL) AS has_photo`;

function toReport(r) {
  return {
    id: reportId(r.id),
    issue: r.issue,
    status: r.status,
    place: r.location,
    description: r.description,
    image: r.has_photo ? `/api/reports/${reportId(r.id)}/photo` : r.image_url,
    createdAt: new Date(r.created_at).toISOString(),
    note: r.note,
    detail: r.detail,
    canWithdraw: r.status === "submitted",
  };
}

export async function listReports(userId) {
  const rows = await query(
    `SELECT ${REPORT_COLS} FROM reports WHERE user_id = $1 ORDER BY created_at DESC, id DESC`,
    [userId],
  );
  return rows.map(toReport);
}

const MAX_PHOTO = 2 * 1024 * 1024; // 2 MB (the app shrinks photos before upload)

/** Checks the file's magic bytes, not just the declared type. */
function isImage(buf, type) {
  if (type === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === "image/png") return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return false;
}

const ISSUE_TEXT = {
  "illegal-dumping": "illegal dumping",
  "blocked-drain": "a blocked drain",
  "tree-damage": "tree damage",
};
const ISSUE_TITLE = { "illegal-dumping": "Illegal dumping", "blocked-drain": "Blocked drain", "tree-damage": "Tree damage" };
const PALETTE = ["#3f7d55", "#7b5ea7", "#c4663b", "#3d6fa8", "#a8476b", "#2c8a86", "#b07a2c"];

/**
 * Creates a report. With shareToFeed, it is also posted to the community feed in the same
 * transaction (the post is linked to the report, so it disappears if the report is withdrawn).
 */
export async function createReport(user, { issue, location, description, photo, photoType, shareToFeed = true }) {
  if (!["illegal-dumping", "blocked-drain", "tree-damage"].includes(issue)) throw new HttpError(400, "Choose what you saw.");
  const place = LOCATIONS[location];
  if (!place) throw new HttpError(400, "Choose a location.");
  const desc = String(description ?? "").trim();
  if (desc.length > 500) throw new HttpError(400, "Description must be 500 characters or fewer.");
  if (!photo || !photo.length) throw new HttpError(400, "Please add a photo of the problem.");
  if (photo.length > MAX_PHOTO) throw new HttpError(413, "That photo is too large (max 2 MB).");
  if (!["image/jpeg", "image/png"].includes(photoType)) throw new HttpError(415, "Photos must be JPG or PNG.");
  if (!isImage(photo, photoType)) throw new HttpError(415, "That file doesn't look like a JPG or PNG image.");

  return tx(async (q) => {
    const [row] = await q(
      `INSERT INTO reports (user_id, issue, location, description, photo, photo_type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${REPORT_COLS}`,
      [user.id, issue, place, desc, photo, photoType],
    );
    const report = toReport(row);
    if (shareToFeed) {
      const area = place.split(",")[0];
      await q(
        `INSERT INTO posts (user_id, report_id, author_name, author_color, action, area, body, photo, photo_type, media_label, attachment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          user.id,
          row.id,
          user.name,
          PALETTE[user.id % PALETTE.length],
          `reported ${ISSUE_TEXT[issue]}`,
          area,
          desc || `Spotted ${ISSUE_TEXT[issue]} at ${place}. Reported to the local team. #CleanDhaka`,
          photo,
          photoType,
          "COMMUNITY REPORT",
          JSON.stringify({ kind: "report", title: `${report.id} · ${ISSUE_TITLE[issue]}`, sub: place, href: "/reports" }),
        ],
      );
    }
    return { ...report, shared: Boolean(shareToFeed) };
  });
}

export async function withdrawReport(userId, id) {
  const [r] = await query("SELECT user_id, status FROM reports WHERE id = $1", [parseReportId(id)]);
  if (!r || r.user_id !== userId) throw new HttpError(404, "Report not found.");
  if (r.status !== "submitted") throw new HttpError(409, "Only reports that haven’t been reviewed yet can be withdrawn.");
  await query("DELETE FROM reports WHERE id = $1 AND user_id = $2", [parseReportId(id), userId]);
}

export async function reportPhoto(userId, id) {
  const [r] = await query("SELECT user_id, photo, photo_type FROM reports WHERE id = $1", [parseReportId(id)]);
  if (!r || r.user_id !== userId || !r.photo) return null;
  return { body: r.photo, type: r.photo_type };
}

// ---------- Missions ----------

function toMission(m) {
  return {
    id: m.id,
    title: m.title,
    category: m.category,
    description: m.description,
    location: m.location,
    start: m.start_date,
    end: m.end_date,
    capacity: m.capacity,
    joined: m.base_joined + Number(m.members),
    xp: m.xp,
    image: m.image,
    organizer: m.organizer,
    isJoined: Boolean(m.is_joined),
    isSaved: Boolean(m.is_saved),
    isOrganizer: m.organizer_id != null && m.organizer_id === m.viewer,
  };
}

// $1 = viewing user id
const MISSION_SELECT = `
  SELECT m.*, $1::int AS viewer,
    (SELECT COUNT(*) FROM mission_members mm WHERE mm.mission_id = m.id)::int AS members,
    EXISTS (SELECT 1 FROM mission_members mm WHERE mm.mission_id = m.id AND mm.user_id = $1) AS is_joined,
    EXISTS (SELECT 1 FROM saved_missions sm WHERE sm.mission_id = m.id AND sm.user_id = $1) AS is_saved
  FROM missions m`;

export async function listMissions(userId) {
  const rows = await query(
    `${MISSION_SELECT} ORDER BY (m.organizer_id IS NOT NULL) DESC, m.created_at DESC, m.start_date`,
    [userId],
  );
  return rows.map(toMission);
}

async function getMission(userId, id, q = query) {
  const [m] = await q(`${MISSION_SELECT} WHERE m.id = $2`, [userId, id]);
  if (!m) throw new HttpError(404, "Mission not found.");
  return toMission(m);
}

const CATEGORY_IMAGES = {
  trees: "1542601906990-b4d3fb778b09",
  waste: "1617953141905-b27fb1f17d88",
  drainage: "1547683905-f686c993aae5",
  plastic: "1595278069441-2cf29f8005a4",
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);

export async function createMission(user, input) {
  if (user.role !== "organizer") throw new HttpError(403, "Only organizer accounts can create missions.");
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const location = String(input.location ?? "").trim();
  const { category, start, end } = input;
  const capacity = Number(input.capacity);

  if (!title || title.length > 80) throw new HttpError(400, "Give the mission a name (up to 80 characters).");
  if (!MISSION_CATEGORIES[category]) throw new HttpError(400, "Choose a category.");
  if (!description || description.length > 400) throw new HttpError(400, "Add a description (up to 400 characters).");
  if (!location || location.length > 100) throw new HttpError(400, "Add a location.");
  if (!DATE.test(start) || !DATE.test(end)) throw new HttpError(400, "Choose start and end dates.");
  if (start < today()) throw new HttpError(400, "The start date can’t be in the past.");
  if (end < start) throw new HttpError(400, "The end date must be on or after the start date.");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) throw new HttpError(400, "Participant limit must be between 1 and 100,000.");

  const id = `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const image = `https://images.unsplash.com/photo-${CATEGORY_IMAGES[category]}?auto=format&fit=crop&q=70&w=800&h=450`;
  return tx(async (q) => {
    await q(
      `INSERT INTO missions (id, title, category, description, location, start_date, end_date, capacity, image, organizer, organizer_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, title, category, description, location, start, end, capacity, image, user.organization || user.name, user.id],
    );
    await q("INSERT INTO mission_members (mission_id, user_id) VALUES ($1, $2)", [id, user.id]);
    return getMission(user.id, id, q);
  });
}

export async function joinMission(userId, id) {
  return tx(async (q) => {
    // Lock the mission row so two people can't take the last spot at once.
    const locked = await q("SELECT id FROM missions WHERE id = $1 FOR UPDATE", [id]);
    if (!locked.length) throw new HttpError(404, "Mission not found.");
    const m = await getMission(userId, id, q);
    if (m.isJoined) return m;
    if (m.end < today()) throw new HttpError(409, "This mission has ended.");
    if (m.joined >= m.capacity) throw new HttpError(409, "This mission is full.");
    await q("INSERT INTO mission_members (mission_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, userId]);
    return getMission(userId, id, q);
  });
}

export async function leaveMission(userId, id) {
  const m = await getMission(userId, id);
  if (m.isOrganizer) throw new HttpError(409, "Organizers can’t leave their own mission.");
  await query("DELETE FROM mission_members WHERE mission_id = $1 AND user_id = $2", [id, userId]);
  return getMission(userId, id);
}

export async function setSaved(userId, id, saved) {
  await getMission(userId, id); // 404 if missing
  if (saved) {
    await query("INSERT INTO saved_missions (mission_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, userId]);
  } else {
    await query("DELETE FROM saved_missions WHERE mission_id = $1 AND user_id = $2", [id, userId]);
  }
  return getMission(userId, id);
}

// ---------- Notifications ----------

export async function listNotifications(userId) {
  const rows = await query("SELECT notification_id FROM notification_reads WHERE user_id = $1", [userId]);
  const read = new Set(rows.map((r) => r.notification_id));
  return SEED_NOTIFICATIONS.map((n) => ({ ...n, read: read.has(n.id) }));
}

export async function markNotificationsRead(userId, ids) {
  const valid = SEED_NOTIFICATIONS.map((n) => n.id);
  const wanted = (Array.isArray(ids) ? ids : []).filter((id) => valid.includes(id));
  if (wanted.length) {
    await query(
      `INSERT INTO notification_reads (user_id, notification_id)
       SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING`,
      [userId, wanted],
    );
  }
  return listNotifications(userId);
}

// ---------- Users ----------

export async function findUserByLogin(login) {
  const [u] = await query("SELECT id, name, login, role, organization, password_hash FROM users WHERE login = $1", [login]);
  return u ?? null;
}

export async function createUser(name, login, passwordHash, role = "citizen", organization = null) {
  const rows = await query(
    `INSERT INTO users (name, login, password_hash, role, organization) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (login) DO NOTHING RETURNING id, name, login, role, organization`,
    [name, login, passwordHash, role, role === "organizer" ? organization : null],
  );
  return rows[0] ?? null; // null → login already taken
}

export async function getUser(id) {
  const [u] = await query(
    `SELECT id, name, login, role, organization, bio, area, created_at, photo_version,
            (avatar IS NOT NULL) AS has_avatar
     FROM users WHERE id = $1`,
    [id],
  );
  return u ?? null;
}

// ---------- Profile ----------

export const PROFILE_AREAS = ["Mirpur 10", "Mirpur 2", "Shewrapara", "Agargaon", "Dhanmondi", "Mohammadpur", "Uttara", "Gulshan", "Banani", "Old Dhaka"];

/** The signed-in user's profile with activity counts. */
export async function getProfile(userId) {
  const u = await getUser(userId);
  if (!u) throw new HttpError(404, "User not found.");
  const [stats] = await query(
    `SELECT
       (SELECT COUNT(*) FROM posts WHERE user_id = $1)::int AS posts,
       (SELECT COUNT(*) FROM reports WHERE user_id = $1)::int AS reports,
       (SELECT COUNT(*) FROM reports WHERE user_id = $1 AND status = 'resolved')::int AS resolved,
       (SELECT COUNT(*) FROM mission_members WHERE user_id = $1)::int AS missions,
       (SELECT COUNT(*) FROM post_likes l JOIN posts p ON p.id = l.post_id WHERE p.user_id = $1)::int AS inspired,
       (SELECT COUNT(*) FROM follows WHERE user_id = $1)::int AS following`,
    [userId],
  );
  return {
    id: u.id,
    name: u.name,
    login: u.login,
    role: u.role,
    organization: u.organization,
    bio: u.bio,
    area: u.area,
    joinedAt: new Date(u.created_at).toISOString(),
    avatarUrl: avatarUrl(u.id, u.has_avatar, u.photo_version),
    stats,
  };
}

export async function updateProfile(user, input) {
  const name = String(input.name ?? user.name).trim();
  const bio = String(input.bio ?? "").trim();
  const area = String(input.area ?? "").trim();
  const organization = String(input.organization ?? "").trim();
  if (name.length < 2 || name.length > 60) throw new HttpError(400, "Name must be 2–60 characters.");
  if (bio.length > 200) throw new HttpError(400, "Bio can be up to 200 characters.");
  if (!PROFILE_AREAS.includes(area)) throw new HttpError(400, "Choose your area.");
  if (user.role === "organizer" && (organization.length < 2 || organization.length > 80)) {
    throw new HttpError(400, "Enter your group or organisation name.");
  }
  const org = user.role === "organizer" ? organization : null;
  await tx(async (q) => {
    await q("UPDATE users SET name = $2, bio = $3, area = $4, organization = $5 WHERE id = $1", [user.id, name, bio, area, org]);
    // Names are copied onto posts/comments/missions for display — keep them in sync.
    await q("UPDATE posts SET author_name = $2 WHERE user_id = $1", [user.id, name]);
    await q("UPDATE post_comments SET author_name = $2 WHERE user_id = $1", [user.id, name]);
    if (org) await q("UPDATE missions SET organizer = $2 WHERE organizer_id = $1", [user.id, org]);
  });
  return getProfile(user.id);
}

// ---------- Profile photo ----------

const AVATAR_MAX = 1024 * 1024; // 1 MB (the app crops & shrinks to 400×400 first)

/** URL for a user's profile photo, or null when they haven't uploaded one. */
export function avatarUrl(userId, hasAvatar, version) {
  return hasAvatar ? `/api/users/${userId}/avatar?v=${version}` : null;
}

/** Sets (or, with photo = null, removes) the user's profile photo. */
export async function setAvatar(userId, photo, type) {
  if (photo) {
    if (!photo.length) throw new HttpError(400, "Choose a photo.");
    if (photo.length > AVATAR_MAX) throw new HttpError(413, "That photo is too large (max 1 MB).");
    if (!isImage(photo, type)) throw new HttpError(415, "Photos must be JPG or PNG.");
  }
  await query("UPDATE users SET avatar = $2, avatar_type = $3, photo_version = photo_version + 1 WHERE id = $1", [
    userId,
    photo ?? null,
    photo ? type : null,
  ]);
  return getProfile(userId);
}

export async function getAvatar(userId) {
  const [r] = await query("SELECT avatar AS body, avatar_type AS type FROM users WHERE id = $1", [Number(userId) || 0]);
  return r?.body ? r : null;
}
