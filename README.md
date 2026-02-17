# Office Presence — Admin Dashboard

Production-ready Admin Dashboard for an Office Presence system. The mobile app sends presence events; the dashboard computes working time from **status transitions** (IN_OFFICE → OUT_OF_OFFICE), not from periodic ticks.

## Stack

- **Frontend:** Next.js 14 (App Router), TailwindCSS, shadcn/ui, Recharts
- **Backend:** Next.js Route Handlers
- **DB:** Neon (PostgreSQL)
- **ORM:** Prisma (singleton client for serverless)
- **Auth:** Dashboard uses JWT in httpOnly cookies; mobile uses Bearer JWT (see [Mobile auth](#mobile-auth-bearer-token) below)
- **Validation:** Zod

## Environment variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon **pooled** connection string (for serverless) |
| `DIRECT_URL` | Neon **direct** connection string (for migrations) |
| `JWT_SECRET` | Long random secret (min 32 characters); used for both cookie session and Bearer access tokens |
| `ADMIN_SEED_EMAIL` | Admin email for seed |
| `ADMIN_SEED_PASSWORD` | Admin password for seed |
| `SESSION_TIMEOUT_MINUTES` | Session timeout for dashboard cookie (default 30) |

**Neon:** Use the pooler URL for `DATABASE_URL` to avoid connection storms in serverless. Use the direct URL for `DIRECT_URL` when running migrations.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure Neon**

   - Create a project at [neon.tech](https://neon.tech).
   - Copy the pooled connection string → `DATABASE_URL`.
   - Copy the direct connection string → `DIRECT_URL`.

3. **Generate Prisma client**

   ```bash
   npm run db:generate
   ```

4. **Run migrations**

   Use the direct URL (or run from a environment where `DIRECT_URL` is set):

   ```bash
   npm run db:migrate:dev
   ```

   For production (e.g. CI):

   ```bash
   npm run db:migrate
   ```

5. **Seed admin user**

   ```bash
   npm run db:seed
   ```

   Log in at `/login` with `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`.

6. **Run dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Session calculation (core logic)

Working time is derived from **status transitions**:

- A **session starts** at the first `IN_OFFICE` after being out.
- A **session ends** at the first `OUT_OF_OFFICE` after being in.
- `UNKNOWN` events do not start or end a session; they are ignored for transitions.

**Timeout rule:** If the last known state is `IN_OFFICE` and there is no new event for `SESSION_TIMEOUT_MINUTES` (default 30), the session is closed at `min(now, lastEvent.timestamp + timeout)`.

Implementation: `src/lib/presence-service.ts` — `calculateSessions(events, now, timeoutMinutes)`.

## Deploy (Vercel + Neon)

1. **Neon:** Create a project and note pooled + direct URLs.
2. **Vercel:** Import the repo and set env vars:
   - `DATABASE_URL` (pooled)
   - `DIRECT_URL` (direct)
   - `JWT_SECRET`
   - `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`
   - `SESSION_TIMEOUT_MINUTES` (optional)
3. **Migrations:** Run in CI or locally before deploy:
   ```bash
   npm run db:migrate
   ```
4. **Seed:** Run once (e.g. locally with production `DATABASE_URL`) to create admin:
   ```bash
   npm run db:seed
   ```

## Mobile auth (Bearer token)

The Flutter mobile app authenticates with Bearer JWT; the dashboard continues to use httpOnly cookies. No changes are required in the dashboard UI.

1. **Login:** `POST /api/auth/login` with `{ "email", "password" }`.
   - Response: `{ ok: true, user: { id, name, email, role }, accessToken }`.
   - The server also sets the session cookie (unchanged) so browser login still works.
2. **Presence:** `POST /api/presence/event` with header `Authorization: Bearer <accessToken>`.
   - Accepts either the session cookie (dashboard) or the Bearer token (mobile).
   - Only EMPLOYEE and ADMIN may post; inactive or soft-deleted users receive 403.
3. **Token:** Access token is a JWT (payload: userId, role, email), signed with `JWT_SECRET`, expiry 7 days.

Required env vars for backend (including mobile): `JWT_SECRET`, `DATABASE_URL`, `DIRECT_URL`.

## API (summary)

- **Health:** `GET /api/health` → `{ ok: true }`
- **Auth:** `POST /api/auth/login` (returns `accessToken` in JSON and sets cookie), `POST /api/auth/logout`, `GET /api/auth/me`
- **Mobile:** `POST /api/presence/event` (cookie or `Authorization: Bearer <token>`; inserts presence event)
- **Admin:** `GET/POST /api/admin/users`, `PATCH/DELETE /api/admin/users/:id` (soft delete), `GET /api/admin/stats`, `GET /api/admin/employees`, `GET /api/admin/employees/:id`

## Tests

```bash
npm test
```

Runs unit tests for `PresenceService.calculateSessions` (edge cases: missing OUT, missing IN, UNKNOWN, multiple sessions).
