import "server-only";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { hashPassword } from "./password";
import { SEED_MISSIONS, SEED_REPORTS } from "../app-data";
import { SEED_PARTNERS, SEED_PRODUCTS, SEED_VOUCHERS } from "../shop";

/*
 * PostgreSQL access.
 *  - DATABASE_URL set   → real Postgres via `pg` (Neon, Supabase, Railway, local, …).
 *  - DATABASE_URL unset → PGlite, an embedded Postgres saved in ./data/pglite (dev fallback).
 * Both expose the same tiny interface: query(sql, params) → rows, and tx(fn).
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL,
  login         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue       TEXT NOT NULL CHECK (issue IN ('illegal-dumping','blocked-drain','tree-damage')),
  status      TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','review','resolved')),
  location    TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  photo       BYTEA,
  photo_type  TEXT,
  image_url   TEXT,
  note        TEXT NOT NULL DEFAULT 'Submitted online',
  detail      TEXT NOT NULL DEFAULT 'Awaiting verification by the local team',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_user_idx ON reports (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS missions (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('trees','waste','drainage','plastic')),
  description  TEXT NOT NULL,
  location     TEXT NOT NULL,
  start_date   TEXT NOT NULL,
  end_date     TEXT NOT NULL,
  capacity     INTEGER NOT NULL CHECK (capacity > 0),
  base_joined  INTEGER NOT NULL DEFAULT 0,
  xp           INTEGER NOT NULL DEFAULT 50,
  image        TEXT NOT NULL,
  organizer    TEXT NOT NULL,
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mission_members (
  mission_id TEXT    NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, user_id)
);

CREATE TABLE IF NOT EXISTS saved_missions (
  mission_id TEXT    NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,   -- NULL for seeded/official posts
  author_name   TEXT NOT NULL,
  author_color  TEXT NOT NULL DEFAULT '#3f7d55',
  author_badge  TEXT,                                            -- 'Organizer', 'Official', …
  action        TEXT NOT NULL DEFAULT 'shared an update',
  area          TEXT NOT NULL DEFAULT '',
  community     TEXT,
  body          TEXT NOT NULL,
  photo         BYTEA,
  photo_type    TEXT,
  image_url     TEXT,
  media_label   TEXT,
  attachment    JSONB,                                           -- linked mission / report / alert
  base_likes    INTEGER NOT NULL DEFAULT 0,
  shares        INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts (created_at DESC);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS post_comments_post_idx ON post_comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS saved_posts (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

-- Account roles: citizens post & report; organizers can also create missions.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'citizen';
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT 'Mirpur 10';
-- Profile photo (version bumps on every change so browsers fetch the new image).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_version INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('citizen', 'organizer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A post created from a report (deleted automatically if the report is withdrawn).
ALTER TABLE posts ADD COLUMN IF NOT EXISTS report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE;

-- Help requests (SOS) with a live location shared by the person who needs help.
CREATE TABLE IF NOT EXISTS help_requests (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('flood','rescue','medical','supplies','other')),
  note        TEXT NOT NULL DEFAULT '',
  people      INTEGER NOT NULL DEFAULT 1 CHECK (people BETWEEN 1 AND 500),
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  accuracy    DOUBLE PRECISION,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  located_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '6 hours')
);
CREATE INDEX IF NOT EXISTS help_active_idx ON help_requests (status, expires_at);

CREATE TABLE IF NOT EXISTS help_responders (
  request_id INTEGER NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, user_id)
);

CREATE TABLE IF NOT EXISTS follows (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  volunteer TEXT    NOT NULL,
  PRIMARY KEY (user_id, volunteer)
);

CREATE TABLE IF NOT EXISTS notification_reads (
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id TEXT    NOT NULL,
  PRIMARY KEY (user_id, notification_id)
);

-- ---------- Eco Shop ----------
-- Eco Coins: spent in the shop (1 coin = 1 taka off) and on partner vouchers.
ALTER TABLE users ADD COLUMN IF NOT EXISTS eco_coins INTEGER NOT NULL DEFAULT 380;
DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_eco_coins_check CHECK (eco_coins >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS partners (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL,
  blurb      TEXT NOT NULL DEFAULT '',
  area       TEXT NOT NULL DEFAULT '',
  color      TEXT NOT NULL DEFAULT '#3f7d55',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('zero-waste','food','home','clothing')),
  description TEXT NOT NULL,
  price       INTEGER NOT NULL CHECK (price > 0),
  unit        TEXT NOT NULL DEFAULT '',
  photo       TEXT NOT NULL,
  partner_id  TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  badge       TEXT,
  sort        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vouchers (
  code         TEXT PRIMARY KEY,
  partner_id   TEXT REFERENCES partners(id) ON DELETE CASCADE,   -- NULL = works on every item
  title        TEXT NOT NULL,
  percent      INTEGER NOT NULL CHECK (percent BETWEEN 1 AND 100),
  min_spend    INTEGER NOT NULL DEFAULT 0,
  max_discount INTEGER,
  coin_cost    INTEGER NOT NULL DEFAULT 0 CHECK (coin_cost >= 0),
  in_store     BOOLEAN NOT NULL DEFAULT false,
  active       BOOLEAN NOT NULL DEFAULT true,
  sort         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items            JSONB NOT NULL,
  subtotal         INTEGER NOT NULL,
  voucher_code     TEXT,
  voucher_discount INTEGER NOT NULL DEFAULT 0,
  coins_used       INTEGER NOT NULL DEFAULT 0,
  delivery         INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL CHECK (total >= 0),
  payment          TEXT NOT NULL CHECK (payment IN ('cod','online','coins')),
  paid             BOOLEAN NOT NULL DEFAULT false,
  pay_channel      TEXT,
  status           TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','cancelled')),
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  address          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC);

-- A voucher a user has claimed; used_order is set once it is spent on an order.
CREATE TABLE IF NOT EXISTS user_vouchers (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code       TEXT    NOT NULL REFERENCES vouchers(code) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_order INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, code)
);

-- "Be our partner" applications from the public site (reviewed by the team).
CREATE TABLE IF NOT EXISTS partner_applications (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  business   TEXT NOT NULL,
  contact    TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,
  kind       TEXT NOT NULL,
  offer      TEXT NOT NULL CHECK (offer IN ('products','voucher','both')),
  percent    INTEGER,
  message    TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

// Demo account so the app has data out of the box (disable with SEED_DEMO=false).
export const DEMO_LOGIN = "nadia@example.com";
export const DEMO_PASSWORD = "ecopulse123";
export const DEMO_ORGANIZER_LOGIN = "tanvir@example.com";

/** A database row. Columns come straight from SQL, so they are loosely typed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export type QueryFn = <T = Row>(sql: string, params?: unknown[]) => Promise<T[]>;

interface Db {
  kind: "postgres" | "pglite";
  exec(sql: string): Promise<unknown>;
  query: QueryFn;
  tx<T>(fn: (q: QueryFn) => Promise<T>): Promise<T>;
}

async function connectPg(url: string): Promise<Db> {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url, max: Number(process.env.PG_POOL_MAX || 5) });
  return {
    kind: "postgres",
    exec: (sql) => pool.query(sql),
    query: async (sql, params) => (await pool.query(sql, params as unknown[])).rows,
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn(async (sql, params) => (await client.query(sql, params as unknown[])).rows);
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

/**
 * PGlite is single-process: two servers writing the same folder corrupt it.
 * Take a simple PID lock and refuse to start if another live process holds it.
 */
function lockPgliteDir(dir: string) {
  const lock = `${dir}.lock`;
  if (existsSync(lock)) {
    const pid = Number(readFileSync(lock, "utf8"));
    let alive = false;
    if (pid && pid !== process.pid) {
      try {
        process.kill(pid, 0); // throws if the process is gone
        alive = true;
      } catch {}
    }
    if (alive) {
      throw new Error(
        `The local database (${dir}) is already in use by another server (process ${pid}). ` +
          "Stop that server first, or set DATABASE_URL to use PostgreSQL.",
      );
    }
  }
  writeFileSync(lock, String(process.pid));
  const release = () => {
    try {
      if (Number(readFileSync(lock, "utf8")) === process.pid) unlinkSync(lock);
    } catch {}
  };
  process.once("exit", release);
}

async function connectPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), "data", "pglite");
  mkdirSync(dir, { recursive: true });
  lockPgliteDir(dir);
  const db = await PGlite.create(dir);
  return {
    kind: "pglite",
    exec: (sql) => db.exec(sql),
    query: async <T,>(sql: string, params?: unknown[]) => (await db.query<T>(sql, params)).rows,
    tx: (fn) => db.transaction((t) => fn(async <T,>(sql: string, params?: unknown[]) => (await t.query<T>(sql, params)).rows)),
  };
}

// The community posts from the original EcoPulse feed design.
const SEED_POSTS = [
  {
    author: "Dhanmondi Lake Keepers · Tasnia Jamal",
    name: "Tasnia Jamal",
    color: "#b0455e",
    action: "shared a clean-up",
    area: "Dhanmondi",
    community: "Dhanmondi Lake Keepers",
    body: "Spent the morning on the boat with the lake crew. We pulled out 40 kg of plastic from the north bank. Next one is in two weeks — bring sun hats! #LakeKeepers #PlasticFree",
    image: "/images/post-river.svg",
    label: "CLEAN UP",
    likes: 41,
    shares: 5,
    hoursAgo: 26,
    comments: [["Rakib Hasan", "40 kg in one morning is amazing. Count me in for the next one!"]],
  },
  {
    name: "DNCC Ward 4 Office",
    color: "#b07a2c",
    badge: "Official",
    action: "resolved a community report",
    area: "Agargaon",
    body: "The dumping spot behind the Agargaon bus stand has been cleared. Thanks to Rakib for the photos and precise location. A cleaner is posted there from 6 AM daily. #CleanDhaka",
    image: "/images/post-dumping.svg",
    label: "BEFORE RESOLVED",
    attachment: { kind: "report", title: "R-1023 · Illegal dumping", sub: "Reported 2 days ago", status: "Resolved", href: "/reports" },
    likes: 54,
    shares: 3,
    hoursAgo: 5,
    comments: [
      ["Farhana Akter", "Walked past this morning — it's spotless. Thank you!"],
      ["Rakib Hasan", "Happy to help. Let's keep it that way."],
    ],
  },
  {
    name: "EcoPulse BD",
    color: "#1c3a29",
    badge: "Official",
    action: "posted an air quality alert",
    area: "Mirpur 10",
    body: "AQI has reached 142 in Mirpur 10, which is unhealthy for sensitive groups. Keep outdoor exercise short before 5 PM and wear a mask if you have asthma. #AirQuality",
    attachment: { kind: "alert", title: "AQI 142 · Unhealthy for sensitive groups", sub: "Updated 15 min ago · source: DoE monitor, Mirpur" },
    likes: 18,
    shares: 11,
    hoursAgo: 3,
    comments: [["Sumaiya Islam", "Moving my kids' football practice indoors today. Thanks for the heads-up."]],
  },
  {
    name: "Tanvir Ahmed",
    color: "#7b5ea7",
    badge: "Organizer",
    action: "shared a mission update",
    area: "Mirpur 10",
    community: "Green Mirpur",
    body: "60 saplings in the ground on Section 10 park. The soil was harder than we planned but our crew stuck with it till sundown. Next drive on Saturday — bring gloves! #GreenMirpur #TreeDrive",
    image: "/images/post-park.svg",
    label: "MISSION UPDATE",
    attachment: { kind: "mission", missionId: "green-mirpur", title: "Green Mirpur Drive", sub: "15 – 20 Nov · Mirpur, Dhaka" },
    likes: 32,
    shares: 2,
    hoursAgo: 2,
    comments: [["Arif Hossain", "Great work everyone! I'll bring extra gloves on Saturday."]],
  },
];

async function seedPosts(db: Db) {
  const [{ n }] = await db.query("SELECT COUNT(*)::int AS n FROM posts");
  if (n > 0) return;
  for (const p of SEED_POSTS) {
    const created = new Date(Date.now() - p.hoursAgo * 3600 * 1000).toISOString();
    const [{ id }] = await db.query(
      `INSERT INTO posts (author_name, author_color, author_badge, action, area, community, body, image_url, media_label, attachment, base_likes, shares, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [p.name, p.color, p.badge ?? null, p.action, p.area, p.community ?? null, p.body, p.image ?? null, p.label ?? null,
        p.attachment ? JSON.stringify(p.attachment) : null, p.likes, p.shares, created],
    );
    let t = new Date(created).getTime();
    for (const [author, body] of p.comments) {
      t += 20 * 60 * 1000;
      await db.query("INSERT INTO post_comments (post_id, author_name, body, created_at) VALUES ($1, $2, $3, $4)", [id, author, body, new Date(t).toISOString()]);
    }
  }
}

async function seedShop(db: Db) {
  for (const p of SEED_PARTNERS) {
    await db.query(
      "INSERT INTO partners (id, name, kind, blurb, area, color) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING",
      [p.id, p.name, p.kind, p.blurb, p.area, p.color],
    );
  }
  for (const [i, p] of SEED_PRODUCTS.entries()) {
    await db.query(
      `INSERT INTO products (id, name, category, description, price, unit, photo, partner_id, stock, badge, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      [p.id, p.name, p.category, p.description, p.price, p.unit, p.photo, p.partnerId, p.stock, p.badge, i],
    );
  }
  for (const [i, v] of SEED_VOUCHERS.entries()) {
    await db.query(
      `INSERT INTO vouchers (code, partner_id, title, percent, min_spend, max_discount, coin_cost, in_store, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (code) DO NOTHING`,
      [v.code, v.partnerId, v.title, v.percent, v.minSpend, v.maxDiscount, v.coinCost, v.inStore, i],
    );
  }
}

async function seed(db: Db) {
  for (const m of SEED_MISSIONS) {
    await db.query(
      `INSERT INTO missions (id, title, category, description, location, start_date, end_date, capacity, base_joined, xp, image, organizer)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
      [m.id, m.title, m.category, m.description, m.location, m.start, m.end, m.capacity, m.joined, m.xp, m.image, m.organizer],
    );
  }
  await seedPosts(db);
  await seedShop(db);
  if (process.env.SEED_DEMO === "false") return;

  // Demo organizer (can create missions); "Mirpur Green Team" missions belong to this account.
  const org = await db.query(
    `INSERT INTO users (name, login, password_hash, role, organization) VALUES ($1, $2, $3, 'organizer', $4)
     ON CONFLICT (login) DO NOTHING RETURNING id`,
    ["Tanvir Ahmed", DEMO_ORGANIZER_LOGIN, hashPassword(DEMO_PASSWORD), "Mirpur Green Team"],
  );
  if (org.length) {
    await db.query("UPDATE missions SET organizer_id = $1 WHERE organizer = 'Mirpur Green Team'", [org[0].id]);
    await db.query(
      `INSERT INTO mission_members (mission_id, user_id)
       SELECT id, $1 FROM missions WHERE organizer_id = $1 ON CONFLICT DO NOTHING`,
      [org[0].id],
    );
  }

  const created = await db.query(
    `INSERT INTO users (name, login, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (login) DO NOTHING RETURNING id`,
    ["Nadia Rahman", DEMO_LOGIN, hashPassword(DEMO_PASSWORD)],
  );
  if (!created.length) return; // demo user already existed
  const uid = created[0].id;
  for (const r of [...SEED_REPORTS].reverse()) {
    await db.query(
      `INSERT INTO reports (user_id, issue, status, location, image_url, note, detail, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [uid, r.issue, r.status, r.place, r.image, r.note, r.detail, r.createdAt],
    );
  }
  for (const mid of ["green-mirpur", "polythene-week"]) {
    await db.query("INSERT INTO mission_members (mission_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [mid, uid]);
  }
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  const db = url ? await connectPg(url) : await connectPglite();
  if (process.env.NODE_ENV !== "production") console.log(`[db] connected (${db.kind})`);
  return db;
}

/** Applies the schema (idempotent: CREATE/ALTER … IF NOT EXISTS) and seed data. */
async function migrate(db: Db): Promise<Db> {
  await db.exec(SCHEMA);
  await seed(db);
  return db;
}

// Changes whenever SCHEMA or the seed code changes, so a running dev server re-applies them
// after a hot reload instead of querying columns that don't exist yet.
const SCHEMA_KEY = `${SCHEMA.length}:${[...SCHEMA].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)}:${seed.toString().length}:${seedShop.toString().length}:${SEED_PRODUCTS.length}`;

// One connection pool per server process (survives dev hot-reloads).
const g = globalThis as typeof globalThis & {
  __ecopulseConn?: Promise<Db> | null;
  __ecopulseDb?: Promise<Db> | null;
  __ecopulseSchemaKey?: string | null;
};
function ready(): Promise<Db> {
  // A server started on an older version of this file kept its connection here — reuse it.
  if (!g.__ecopulseConn && g.__ecopulseDb) g.__ecopulseConn = g.__ecopulseDb;
  if (!g.__ecopulseConn) {
    g.__ecopulseConn = connect().catch((e) => {
      g.__ecopulseConn = null; // allow retry on next request
      throw e;
    });
  }
  if (!g.__ecopulseDb || g.__ecopulseSchemaKey !== SCHEMA_KEY) {
    g.__ecopulseSchemaKey = SCHEMA_KEY;
    g.__ecopulseDb = g.__ecopulseConn.then(migrate).catch((e) => {
      g.__ecopulseDb = null;
      g.__ecopulseSchemaKey = null; // retry on next request
      throw e;
    });
  }
  return g.__ecopulseDb!;
}

/** Runs a query and returns the rows. Use $1, $2… placeholders. */
export async function query<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await ready()).query<T>(sql, params);
}

/** Runs fn(q) in a transaction; q has the same signature as query(). */
export async function tx<T>(fn: (q: QueryFn) => Promise<T>): Promise<T> {
  return (await ready()).tx(fn);
}
