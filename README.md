# EcoPulse BD

Next.js (App Router) site and citizen app, with a REST API backed by PostgreSQL and Redis.

```bash
npm install
cp .env.example .env.local   # then fill in AUTH_SECRET, DATABASE_URL, REDIS_URL
npm run dev                  # http://localhost:3000
npm run build && npm start
```

Demo accounts (created automatically, disable with `SEED_DEMO=false`), password **ecopulse123**:
- **nadia@example.com** – citizen
- **tanvir@example.com** – organizer (Mirpur Green Team)

## Account roles

| Role | Can |
| --- | --- |
| Citizen (default) | post, comment, report problems, join/save missions |
| Organizer | everything above, plus **create missions** (`POST /api/missions` returns 403 for citizens) |

People choose the role at sign-up (`/sign-in?mode=signup&type=organizer` preselects Organizer).
Organizers must give a group/organisation name. To change someone's role later:
`UPDATE users SET role = 'organizer', organization = '…' WHERE login = '…';`

## Environment

| Variable       | Required | What it does |
| -------------- | -------- | ------------ |
| `AUTH_SECRET`  | yes (prod) | Signs the session cookie. |
| `DATABASE_URL` | recommended | PostgreSQL connection string. Tables are created on first request. If empty, an embedded Postgres (PGlite) in `./data/pglite` is used — handy for local dev, not for production. |
| `REDIS_URL`    | recommended | Redis for rate limiting (sign-in attempts, sign-ups, reports, missions, join/save clicks). If empty, limits are kept in memory per server process. |
| `ANTHROPIC_API_KEY` | optional | Turns on AI answers (Claude) on the Assistant page. Without it, built-in rule-based answers are used. |
| `ANTHROPIC_BASE_URL` | optional | API link — only to route requests through a proxy/gateway. Default: Anthropic's API. |
| `AI_MODEL` | optional | Model id for the assistant (default `claude-opus-5-5`). |
| `AI_FALLBACKS` | optional | `false` turns off server-side refusal fallbacks (for gateways that don't support them). |
| `SEED_DEMO`    | no | `false` skips creating the demo account. |

Check the connection at **`GET /api/health`** → `{ ok, database: "postgres" | "pglite", rateLimits: "redis" | "memory" }`.

## Structure

- `app/(site)/` – public website: `/`, `/how-it-works`, `/programmes`, `/about`, `/contact`, `/stories/[slug]`
- `app/(app)/` – citizen app (sign-in required): `/feed` (home after sign-in), `/profile` (incl. Rewards tab; `/rewards` redirects there), `/reports`, `/missions`, `/rewards`, `/assistant`
- `app/(auth)/sign-in/` – sign in / sign up (`?mode=signup`)
- `app/api/` – REST API (below)
- `lib/server/` – server-only code: `db.js` (Postgres/PGlite + schema + seed), `data.js` (queries),
  `auth.js` (session → user, route wrapper), `password.js` (scrypt), `redis.js` (rate limits)
- `lib/auth-actions.js` – sign-in / sign-up / sign-out server actions
- `lib/api-client.js`, `lib/app-state.js` – browser data hooks that call the API
- `proxy.js` – redirects signed-out visitors away from app pages
- `components/` – UI; `components/site/` – public-site components and content

## REST API

All endpoints need a signed-in session cookie (401 otherwise). Writes are same-origin only.

| Method & path | Body | Result |
| --- | --- | --- |
| `GET /api/me` | | `{ user, areas }` — profile (role, organisation, bio, area) + activity stats |
| `PATCH /api/me` | JSON: `name, bio, area, organization?` | `{ user }` — edit your profile |
| `PUT /api/me/avatar` · `DELETE /api/me/avatar` | multipart: `photo` (JPG/PNG ≤ 1 MB, cropped square in the app) | `{ user }` — set / remove your profile photo |
| `GET /api/users/:id/avatar` | | the user's profile photo |
| `GET /api/reports` | | `{ reports }` (your own) |
| `POST /api/reports` | multipart: `issue`, `location`, `description`, `photo` (JPG/PNG ≤ 2 MB), `shareToFeed` (`true`/`false`, default true) | `201 { report }` — also posted to the feed when shared |
| `DELETE /api/reports/:id` | | `204` (only while status is `submitted`) |
| `GET /api/reports/:id/photo` | | image (owner only) |
| `GET /api/missions` | | `{ missions }` with `isJoined`, `isSaved`, `isOrganizer` |
| `POST /api/missions` | JSON: `title, category, description, location, start, end, capacity` | `201 { mission }` |
| `POST` / `DELETE /api/missions/:id/join` | | `{ mission }` — join / leave |
| `POST` / `DELETE /api/missions/:id/save` | | `{ mission }` — bookmark / remove |
| `GET /api/posts?filter=all\|nearby\|saved\|mine` | | `{ posts }` with `liked`, `saved`, `mine` |
| `POST /api/posts` | multipart: `body`, `area`, `photo?` | `201 { post }` |
| `DELETE /api/posts/:id` | | `204` (own posts only) |
| `POST` / `DELETE /api/posts/:id/like` | | `{ post }` — inspire / undo |
| `POST` / `DELETE /api/posts/:id/save` | | `{ post }` — save / unsave |
| `POST /api/posts/:id/share` | | `{ post }` — counts a share |
| `GET /api/posts/:id/photo` | | image |
| `GET` / `POST /api/posts/:id/comments` | JSON: `{ body }` | `{ comments }` / `201 { comment, post }` |
| `DELETE /api/posts/:id/comments/:commentId` | | `{ post }` (own comments only) |
| `GET /api/volunteers` · `POST` / `DELETE /api/volunteers/:id/follow` | | `{ volunteers }` with `following` |
| `GET /api/notifications` | | `{ notifications }` with `read` |
| `POST /api/notifications` | JSON: `{ read: ["n1", …] }` | `{ notifications }` |
| `GET /api/help` | | `{ requests, mine }` — active help requests with live locations |
| `POST /api/help` | JSON: `kind (flood/rescue/medical/supplies/other), people, note, lat, lng, accuracy` | `201 { help }` — one active request per person, expires after 6 h |
| `PATCH /api/help/:id` | JSON: `{ lat, lng, accuracy }` or `{ status: "resolved" \| "cancelled" }` | `{ help }` — owner only: live location update / I'm safe / stop |
| `POST` / `DELETE /api/help/:id/respond` | | `{ help }` — "I'm on my way" / undo |
| `GET /api/assistant` | | `{ ai, model }` — whether AI answers are on |
| `POST /api/assistant` | JSON: `{ messages: [{ role, content }] }` (last one is the question) | `{ text, links?, source: "ai" \| "rules" }` |
| `GET /api/health` | (no auth) | database / Redis status |

Errors come back as `{ "error": "message" }` with a matching status (400, 401, 403, 404, 409, 413, 415, 429).

## Security notes

- Passwords are hashed with scrypt (per-user salt); sign-in uses a constant-time check.
- Sessions are HMAC-signed, httpOnly, SameSite=Lax cookies (7 days with "Keep me signed in").
- Sign-in is rate-limited per account (8 / 15 min) and per IP (30 / 15 min); sign-up per IP (5 / hour).
- Uploaded photos are checked by content (magic bytes), size-limited, and only served to their owner.

## Not built yet

- The assistant uses Claude when `ANTHROPIC_API_KEY` is set (falls back to the rules in `lib/assistant.js` otherwise or on errors); readings are still sample data, not live sensors.
- Report status changes (review → resolved), XP and badges have no admin tools yet; Rewards numbers are sample data.
- Contact and newsletter forms on the public site only show a confirmation.
