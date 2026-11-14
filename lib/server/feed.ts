import "server-only";
import { query, tx, type QueryFn, type Row } from "./db";
import { HttpError } from "./errors";
import { avatarUrl, type StoredPhoto } from "./data";
import type { Comment, Post, PostAttachment, ReportStatus, User, Volunteer } from "../types";

const MAX_PHOTO = 2 * 1024 * 1024;
const PALETTE = ["#3f7d55", "#7b5ea7", "#c4663b", "#3d6fa8", "#a8476b", "#2c8a86", "#b07a2c"];

function isImage(buf: Uint8Array, type: string | null | undefined): boolean {
  if (type === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (type === "image/png") return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return false;
}

// $1 = viewer id
const POST_SELECT = `
  SELECT p.id, p.user_id, p.author_name, p.author_color, p.author_badge, p.action, p.area, p.community,
         p.body, p.image_url, p.media_label, p.attachment, p.shares, p.created_at,
         (p.photo IS NOT NULL) AS has_photo,
         p.base_likes + (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id)::int AS likes,
         (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id)::int AS comments,
         EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = $1) AS liked,
         EXISTS (SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = $1) AS saved,
         r.status AS report_status,
         (ua.avatar IS NOT NULL) AS author_has_avatar, ua.photo_version AS author_photo_version
  FROM posts p
  LEFT JOIN reports r ON r.id = p.report_id
  LEFT JOIN users ua ON ua.id = p.user_id`;

const STATUS_TEXT: Record<ReportStatus, string> = { submitted: "Submitted", review: "In review", resolved: "Resolved" };

/** Report cards on the feed always show the report's current status. */
function withReportStatus(attachment: PostAttachment | null, status: ReportStatus | null): PostAttachment | null {
  if (!attachment || attachment.kind !== "report" || !status) return attachment;
  return { ...attachment, status: STATUS_TEXT[status], statusKey: status };
}

function toPost(r: Row, viewerId: number): Post {
  return {
    id: r.id,
    author: {
      name: r.author_name,
      color: r.author_color,
      badge: r.author_badge,
      avatar: avatarUrl(r.user_id, r.author_has_avatar, r.author_photo_version),
    },
    action: r.action,
    area: r.area,
    community: r.community,
    body: r.body,
    image: r.has_photo ? `/api/posts/${r.id}/photo` : r.image_url,
    mediaLabel: r.media_label,
    attachment: withReportStatus(typeof r.attachment === "string" ? JSON.parse(r.attachment) : r.attachment, r.report_status),
    likes: Number(r.likes),
    comments: Number(r.comments),
    shares: r.shares,
    liked: Boolean(r.liked),
    saved: Boolean(r.saved),
    mine: r.user_id != null && r.user_id === viewerId,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/** filter: "all" | "saved" | "mine" | "nearby" (same area as the viewer's default, Mirpur) */
export async function listPosts(userId: number, filter: string = "all"): Promise<Post[]> {
  const filters: Partial<Record<string, string>> = {
    all: "",
    saved: "WHERE EXISTS (SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = $1)",
    mine: "WHERE p.user_id = $1",
    nearby: "WHERE p.area ILIKE '%Mirpur%'",
  };
  const where = filters[filter];
  if (where === undefined) throw new HttpError(400, "Unknown filter.");
  const rows = await query(`${POST_SELECT} ${where} ORDER BY p.created_at DESC, p.id DESC LIMIT 100`, [userId]);
  return rows.map((r) => toPost(r, userId));
}

async function getPost(userId: number, id: string | number, q: QueryFn = query): Promise<Post> {
  const [r] = await q(`${POST_SELECT} WHERE p.id = $2`, [userId, Number(id) || 0]);
  if (!r) throw new HttpError(404, "Post not found.");
  return toPost(r, userId);
}

export interface NewPostInput {
  body: unknown;
  area: unknown;
  photo: Buffer | null;
  photoType: string | null;
}

export async function createPost(user: User, { body, area, photo, photoType }: NewPostInput): Promise<Post> {
  const text = String(body ?? "").trim();
  const place = String(area ?? "").trim().slice(0, 60);
  if (!text && !photo) throw new HttpError(400, "Write something or add a photo.");
  if (text.length > 1000) throw new HttpError(400, "Posts can be up to 1,000 characters.");
  if (photo) {
    if (photo.length > MAX_PHOTO) throw new HttpError(413, "That photo is too large (max 2 MB).");
    if (!isImage(photo, photoType)) throw new HttpError(415, "Photos must be JPG or PNG.");
  }
  const color = PALETTE[user.id % PALETTE.length];
  const [{ id }] = await query<{ id: number }>(
    `INSERT INTO posts (user_id, author_name, author_color, author_badge, action, area, body, photo, photo_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [user.id, user.name, color, user.role === "organizer" ? "Organizer" : null, photo ? "shared a photo" : "shared an update", place || "Dhaka", text, photo ?? null, photo ? photoType : null],
  );
  return getPost(user.id, id);
}

export async function deletePost(userId: number, id: string): Promise<void> {
  const rows = await query("DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id", [Number(id) || 0, userId]);
  if (!rows.length) throw new HttpError(404, "Post not found.");
}

export async function setLike(userId: number, id: string, on: boolean): Promise<Post> {
  await getPost(userId, id);
  if (on) await query("INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [Number(id), userId]);
  else await query("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", [Number(id), userId]);
  return getPost(userId, id);
}

export async function setSavedPost(userId: number, id: string, on: boolean): Promise<Post> {
  await getPost(userId, id);
  if (on) await query("INSERT INTO saved_posts (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [Number(id), userId]);
  else await query("DELETE FROM saved_posts WHERE post_id = $1 AND user_id = $2", [Number(id), userId]);
  return getPost(userId, id);
}

export async function sharePost(userId: number, id: string): Promise<Post> {
  await query("UPDATE posts SET shares = shares + 1 WHERE id = $1", [Number(id) || 0]);
  return getPost(userId, id);
}

export async function postPhoto(id: string): Promise<StoredPhoto | null> {
  const [r] = await query<{ photo: StoredPhoto["body"] | null; photo_type: string }>("SELECT photo, photo_type FROM posts WHERE id = $1", [Number(id) || 0]);
  return r?.photo ? { body: r.photo, type: r.photo_type } : null;
}

// ---- comments ----

function toComment(r: Row, viewerId: number): Comment {
  return {
    id: r.id,
    author: r.author_name,
    avatar: avatarUrl(r.user_id, r.has_avatar, r.photo_version),
    body: r.body,
    createdAt: new Date(r.created_at).toISOString(),
    mine: r.user_id != null && r.user_id === viewerId,
  };
}

export async function listComments(userId: number, postId: string): Promise<Comment[]> {
  await getPost(userId, postId);
  const rows = await query(
    `SELECT c.id, c.user_id, c.author_name, c.body, c.created_at, (u.avatar IS NOT NULL) AS has_avatar, u.photo_version
     FROM post_comments c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.post_id = $1 ORDER BY c.created_at, c.id`,
    [Number(postId)],
  );
  return rows.map((r) => toComment(r, userId));
}

export async function addComment(user: User, postId: string, body: unknown): Promise<{ comment: Comment; post: Post }> {
  const text = String(body ?? "").trim();
  if (!text) throw new HttpError(400, "Write a comment first.");
  if (text.length > 500) throw new HttpError(400, "Comments can be up to 500 characters.");
  return tx(async (q) => {
    await getPost(user.id, postId, q);
    const [row] = await q(
      `INSERT INTO post_comments (post_id, user_id, author_name, body) VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, author_name, body, created_at,
         (SELECT avatar IS NOT NULL FROM users WHERE id = $2) AS has_avatar,
         (SELECT photo_version FROM users WHERE id = $2) AS photo_version`,
      [Number(postId), user.id, user.name, text],
    );
    return { comment: toComment(row, user.id), post: await getPost(user.id, postId, q) };
  });
}

export async function deleteComment(userId: number, postId: string, commentId: string): Promise<Post> {
  const rows = await query("DELETE FROM post_comments WHERE id = $1 AND post_id = $2 AND user_id = $3 RETURNING id", [
    Number(commentId) || 0,
    Number(postId) || 0,
    userId,
  ]);
  if (!rows.length) throw new HttpError(404, "Comment not found.");
  return getPost(userId, postId);
}

// ---- follows ----

export const VOLUNTEERS: Volunteer[] = [
  { id: "farhana-selim", name: "Farhana Selim", sub: "Gulshan · 12 missions", color: "#c4663b" },
  { id: "rakib-hasan", name: "Rakib Hasan", sub: "Agargaon · 9 reports", color: "#3d6fa8" },
  { id: "ahmed-hossain", name: "Ahmed Hossain", sub: "Uttara · 7 missions", color: "#2f7d5b" },
  { id: "arif-chowdhury", name: "Arif Chowdhury", sub: "Mohammadpur · 5 missions", color: "#8a5aa8" },
];

export async function listVolunteers(userId: number): Promise<Volunteer[]> {
  const rows = await query<{ volunteer: string }>("SELECT volunteer FROM follows WHERE user_id = $1", [userId]);
  const following = new Set(rows.map((r) => r.volunteer));
  return VOLUNTEERS.map((v) => ({ ...v, following: following.has(v.id) }));
}

export async function setFollow(userId: number, volunteerId: string, on: boolean): Promise<Volunteer[]> {
  if (!VOLUNTEERS.some((v) => v.id === volunteerId)) throw new HttpError(404, "Volunteer not found.");
  if (on) await query("INSERT INTO follows (user_id, volunteer) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, volunteerId]);
  else await query("DELETE FROM follows WHERE user_id = $1 AND volunteer = $2", [userId, volunteerId]);
  return listVolunteers(userId);
}
