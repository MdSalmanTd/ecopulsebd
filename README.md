# EcoPulse BD — Sustainability for a Greener Bangladesh

EcoPulse BD is a community-driven environmental monitoring and civic-action platform for Bangladesh.
Citizens report environmental problems with a photo and location, join local missions such as tree
planting and drain clean-ups, ask for and offer help during floods, and earn Eco Score, Eco Coins and
badges that they can spend in an Eco Shop of sustainable products. An AI Assistant answers questions
about local conditions, and the whole interface works in **Bangla and English**.

Version 1.0 is a responsive web app built with **Next.js (React)** and **PostgreSQL**.

## Team Nature Squad

University of Information Technology & Sciences (UITS) · Department of CSE · Batch 57 · Autumn 2026

| Name | Student ID | Role |
| --- | --- | --- |
| Md. Mahidul Islam | 04325105101035 | Front-End Developer |
| Md. Salman Talukdar | 04325105101036 | Full Stack & Project Manager |
| Samiya Sultana | 04325105101133 | UI/UX Designer |
| Jannatul Mawya | 04325105101138 | Front-End Developer & UI/UX Designer |

**Instructors:** Md. Faysal (Lecturer) and Shad Ahmed (Lecturer), Department of CSE

## Project documents

All in [`projectdata/`](projectdata/):

| Document | Contents |
| --- | --- |
| [Project proposal](projectdata/ProjectProposal.pdf) | Problem, objectives, scope, feasibility, architecture, timeline, risks |
| [Software Requirements Specification (SRS)](projectdata/SRS.pdf) | Version 1.0 requirements (Karl E. Wiegers template) |
| [UML diagrams](projectdata/UML%20DIAGRAMS.pdf) | ER, use case, sequence (report, mission), state (report, mission), class, DFD level 0 and 1 |
| [Project report](projectdata/EcoPulse_BD_Project%20report_035_036_133_138.pdf) | Requirements traceability, design, implementation, testing and future work |
| [Testing report](projectdata/EcoPulse_BD_Testing%20report_035_036_133_138.pdf) | 83-case manual test plan and first-round results |
| [Presentation (Google Drive)](https://drive.google.com/drive/folders/1H08AdMNgVPr1XI2B8m_yTACkdSFx0RFu) | Project presentation slides |
| [Screen recording (Google Drive)](https://drive.google.com/drive/folders/1H08AdMNgVPr1XI2B8m_yTACkdSFx0RFu) | Walkthrough of the app |

The presentation and screen recording are too large for GitHub (over 100 MB each), so they are
kept in this [Google Drive folder](https://drive.google.com/drive/folders/1H08AdMNgVPr1XI2B8m_yTACkdSFx0RFu).

## The problem

Bangladesh faces worsening air quality, recurring floods, poor drainage and unmanaged waste, and no
single agency can solve these alone. Today there is no one place where people can:

- report an environmental problem with a photo and location and follow what happens to it;
- discover and join local environmental missions run by organised groups;
- ask for or offer help quickly during floods and other emergencies;
- see their contribution recognised in a way that keeps them involved.

## Features

| Area | What it does |
| --- | --- |
| Accounts | Sign up with email or a Bangladeshi mobile number. Citizen, Organizer and Partner roles. Profile with photo, bio, area and activity stats |
| Community feed | Posts with photos, Inspire reactions, comments, sharing, saved posts |
| Reports | File illegal dumping, blocked drains or tree damage with a photo and location. Each gets an ID like R-1024 and a status (Submitted, In review, Resolved). Can be shared to the feed |
| Missions | Browse, join, leave and save missions. Organizers create them, with date checks |
| Map | Map of Dhaka with layers for reports, missions, recycling points, air quality, flood zones and help requests |
| Help requests | Ask for help at your live location during a flood; others can respond |
| Rewards | Eco Score (XP), badges, leaderboard and Eco Coins |
| AI Assistant | Answers questions like “What is the air quality in Mirpur?” using Claude, or built-in rules without an API key |
| Eco Shop | Products from partner businesses, cart, checkout with cash on delivery or demo online payment (bKash, Nagad), Eco Coin discounts, free delivery from ৳1,500 |
| Vouchers & partners | Partner vouchers claimed free or for Eco Coins. Businesses apply through a public form; partner accounts manage their own products and vouchers |
| Public website | Home, About, How it works, Programmes, Partners, Stories, Contact and newsletter sign-up |
| Language | Full Bangla / English switch, mobile-friendly layout |

Features added beyond the SRS: the community feed, help requests, and the Eco Shop with checkout
and partner dashboard.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in AUTH_SECRET, DATABASE_URL, REDIS_URL
npm run dev                  # http://localhost:3000
npm run build && npm start
```

Demo accounts (created automatically, disable with `SEED_DEMO=false`), password **ecopulse123**:
- **nadia@example.com** – citizen
- **tanvir@example.com** – organizer (Mirpur Green Team)
- **bamboo@example.com** – partner (manages the Bamboo & Co. store at `/partner`)

These are for testing only. Turn them off or change the password before going live.

## Tech stack

| Layer | Technology |
| --- | --- |
| Front end | Next.js (React), responsive CSS |
| Back end | Next.js API routes (REST) |
| Database | PostgreSQL (PGlite as a local fallback) |
| Rate limiting | Redis (in-memory fallback) |
| Map | MapLibre with OpenStreetMap tiles |
| AI Assistant | Claude via the Anthropic API, rule-based fallback |
| Payments | Cash on delivery; demo online-payment flow (bKash, Nagad, card) |
| Tools | Node.js, npm, Git |

## Account roles

| Role | Can |
| --- | --- |
| Citizen (default) | post, comment, report problems, join/save missions, shop |
| Organizer | everything above, plus **create missions** (`POST /api/missions` returns 403 for citizens) |
| Partner | everything a citizen can, plus the **partner dashboard** (`/partner`): sales, orders for their store's items, **add products** (with photo), edit price/stock, hide/show products, and **create vouchers** and turn them on/off |

People choose the role at sign-up (`/sign-in?mode=signup&type=organizer` preselects Organizer).
Organizers must give a group/organisation name. To change someone's role later:
`UPDATE users SET role = 'organizer', organization = '…' WHERE login = '…';`

Partner accounts can't be chosen at sign-up (anyone could claim a store). After approving a
"Be our partner" application, link an existing account to the store:
`UPDATE users SET role = 'partner', partner_id = 'bamboo-bd', organization = 'Bamboo & Co.' WHERE login = '…';`

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
| `SEED_DEMO`    | no | `false` skips creating the demo accounts. |
| `PAYMENTS_DEMO` | no | `false` turns off the demo online-payment step (cash on delivery only). |

Check the connection at **`GET /api/health`** → `{ ok, database: "postgres" | "pglite", rateLimits: "redis" | "memory" }`.

## Structure

- `app/(site)/` – public website: `/`, `/how-it-works`, `/programmes`, `/about`, `/partners`, `/contact`, `/stories/[slug]`, `/shop`, `/shop/checkout`, `/shop/orders`
- `app/(app)/` – signed-in app: `/feed` (home after sign-in), `/profile` (incl. Rewards tab; `/rewards` redirects there), `/reports`, `/missions`, `/map`, `/assistant`, `/partner`
- `app/(auth)/sign-in/` – sign in / sign up (`?mode=signup`)
- `app/api/` – REST API (below)
- `lib/server/` – server-only code: `db.ts` (Postgres/PGlite + schema + seed), `data.ts` (queries),
  `feed.ts`, `help.ts`, `shop.ts`, `partner.ts`, `ai.ts`, `auth.ts` (session → user, route wrapper),
  `password.ts` (scrypt), `redis.ts` (rate limits)
- `lib/auth-actions.ts` – sign-in / sign-up / sign-out server actions
- `lib/api-client.ts`, `lib/app-state.ts`, `lib/cart.ts` – browser data hooks that call the API
- `proxy.ts` – redirects signed-out visitors away from app pages
- `components/` – UI; `components/site/` – public-site components and content; `components/shop/` – shop
- `public/images/` – logos, illustrations and photos (stored locally so pages work offline)
- `projectdata/` – proposal, SRS, UML diagrams, project and testing reports (presentation and screen recording are on Google Drive)

## REST API

Endpoints need a signed-in session cookie (401 otherwise) unless marked public. Writes are same-origin only.

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
| `GET /api/shop` | (public) | `{ products, partners, vouchers, coins }` — coins and claimed vouchers only when signed in |
| `GET /api/shop/products/:id/photo` | (public) | a partner-uploaded product photo |
| `POST /api/shop/vouchers/:code/claim` | | `{ voucher, coins }` — claim a voucher (may cost Eco Coins) |
| `GET /api/shop/orders` | | `{ orders }` — your orders, newest first |
| `POST /api/shop/orders` | JSON: `items, name, phone, address, payment (cod/online), voucher?, coins?` | `201 { order, coins }` — prices, voucher and coins re-checked on the server |
| `POST /api/shop/orders/:id/pay` | JSON: `{ channel }` | `{ order }` — demo online payment |
| `DELETE /api/shop/orders/:id` | | `{ order, coins }` — cancel; stock, coins and voucher are returned |
| `POST /api/partners` | (public) JSON: business, contact, email, phone, kind, offer, percent?, message? | "Be our partner" application |
| `GET /api/partner` | | partner only: `{ partner, products, vouchers, orders, stats }` |
| `POST /api/partner/products` | multipart: `name, category, description, price, stock, unit?, badge?, photo` | partner only: add a product |
| `PATCH /api/partner/products/:id` | JSON: `{ price, stock, active? }` | partner only: edit / hide / show a product |
| `POST /api/partner/vouchers` | JSON: `code, title, percent, minSpend?, maxDiscount?, coinCost?, inStore?` | partner only: create a voucher |
| `PATCH /api/partner/vouchers/:code` | JSON: `{ active }` | partner only: turn a voucher on / off |
| `GET /api/health` | (public) | database / Redis status |

Errors come back as `{ "error": "message" }` with a matching status (400, 401, 403, 404, 409, 413, 415, 429).

## Security notes

- Passwords are hashed with scrypt (per-user salt); sign-in uses a constant-time check.
- Sessions are HMAC-signed, httpOnly, SameSite=Lax cookies (7 days with "Keep me signed in").
- Database queries are parameterised (SQL injection) and user text is escaped when shown (XSS).
- Sign-in is rate-limited per account (8 / 15 min) and per IP (30 / 15 min); sign-up per IP (5 / hour); posting, orders and partner changes are limited per hour.
- Uploaded photos are checked by content (magic bytes) and size; report photos are only served to their owner.
- Order totals, vouchers and Eco Coin balances are always recalculated on the server.

## Testing

A manual test plan of **83 test cases across 10 areas** was written (see the
[testing report](projectdata/EcoPulse_BD_Testing%20report_035_036_133_138.pdf)). Testers: Samiya
Sultana, Jannatul Mawya and Md. Mahidul Islam, on desktop Chrome and a phone browser.

**First round:** 52 cases run, **51 passed (98%)**, 1 failed, 31 not run yet.

| Area | Cases | Pass | Fail | Not run |
| --- | --- | --- | --- | --- |
| 1. Sign-in, sign-up and access | 9 | 8 | 0 | 1 |
| 2. Community feed | 9 | 9 | 0 | 0 |
| 3. Reports | 8 | 5 | 1 | 2 |
| 4. Missions | 8 | 8 | 0 | 0 |
| 5. Map and help requests | 7 | 7 | 0 | 0 |
| 6. Profile, rewards, notifications, assistant | 9 | 9 | 0 | 0 |
| 7. Public site | 5 | 5 | 0 | 0 |
| 8. Security and limits | 5 | 0 | 0 | 5 |
| 9. Eco Shop and checkout | 14 | 0 | 0 | 14 |
| 10. Vouchers, Eco Coins and partners | 9 | 0 | 0 | 9 |
| **Total** | **83** | **51** | **1** | **31** |

**Open defect — TC_24:** submitting a report without choosing a location should show “Choose a
location.”, but the location is filled in automatically, so the message never appears. Low
severity: reports always have a location.

The security tests (TC_56–60) and the shop, voucher and partner tests (TC_61–83) are planned for
the next round.

## Limitations and future work

**Not built yet:**
- Native Android and iOS apps and push notifications (the SRS describes them alongside the web app).
- Dashboard cards with live AQI, temperature, rain, UV and flood-risk readings; readings are still sample data, not live sensors.
- Marking missions complete with reward distribution, and canopy-growth tracking.
- An admin report queue (Verified / In progress / Resolved) and admin tools for XP and badges; Rewards numbers are partly sample data.
- An admin page to review “Be our partner” applications (partners are linked by hand, see above).
- Real bKash, Nagad and card payments — online payment is a demo flow.
- Contact and newsletter forms on the public site only show a confirmation.

**Planned next:**
- Live air-quality and flood-warning data feeds with area-based alerts.
- Two-step verification and verified organizer/admin accounts (SRS 5.3.4–5.3.5).
- Automated unit, API and end-to-end tests alongside the manual test plan.
- Analytics on the environmental impact of missions and resolved reports.

## References

- Team Nature Squad, *EcoPulse BD — Software Requirements Specification, Version 1.0*, UITS, 2026.
- Karl E. Wiegers, *Software Requirements Specification template*.
- World Air Quality Index (AQI) reporting conventions.
- Bangladesh Water Development Board (BWDB) flood-forecasting bulletins.
- Photos from [Unsplash](https://unsplash.com/) (Unsplash License).
