# Thesis Tracker (KTH)

Self-hosted thesis tracker for a KTH master thesis project with:
- Username/password authentication (Auth.js credentials)
- Per-user workspace persistence
- Kanban board (`dnd-kit`)
- Timeline/Gantt visualization (Frappe Gantt)
- Deliverables linked to tasks
- SQLite + Drizzle ORM

## v1 Runtime Stack
- `app` (Next.js full-stack app)
- `sqlite` file persisted on disk/volume (`thesis-tracker.db`)

No Supabase, Kong, GoTrue, PostgREST, Realtime, or Studio.

## Docker Deployment
1. Copy Docker env template:
   - `cp .env.docker.example .env`
2. Set `AUTH_SECRET` in `.env` (at least 32 chars).
   - Docker Compose now fails fast if this is missing.
3. If you run behind Caddy/domain, set:
   - `AUTH_URL=https://your-domain.example`
   - `NEXT_PUBLIC_SITE_URL=https://your-domain.example`
   - `AUTH_TRUST_HOST=true`
4. Start app:
   - `docker compose up -d --build`
5. Open local:
   - `http://localhost:3000`

SQLite persists in a named Docker volume `sqlite-data`.
`DATABASE_FILE` is fixed to `/app/data/thesis-tracker.db` in `docker-compose.yml`.

Why two env templates:
- `.env.docker.example`: container paths/defaults for Docker hosting.
- `.env.example`: local development defaults (`npm run dev`).

## Deploying Behind Caddy
- Dockerized app listens on `127.0.0.1:3000` by default.
- Configure Caddy to reverse proxy your domain to `127.0.0.1:3000`.
- Use HTTPS in `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` for stable auth cookies.

Example Caddy snippet:

```caddy
thesis.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

## Local Development (Optional)
1. Copy env:
   - `cp .env.example .env`
2. Set `AUTH_SECRET` in `.env`.
3. Install dependencies:
   - `npm install`
4. Initialize SQLite schema:
   - `npm run db:migrate`
5. Start app:
   - `npm run dev`

## Backup and Restore (Docker)
- Find the volume path:
  - `docker volume inspect thesis-tracker_sqlite-data`
- Backup DB file from the mounted volume (`thesis-tracker.db`, plus `-wal`/`-shm` if present).
- Restore by stopping the app and placing files back into the same volume path.

## API Contracts Implemented
- `POST /api/bootstrap`
- `GET /api/board`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/reorder`
- `POST /api/tasks/:id/link-deliverable`
- `DELETE /api/tasks/:id/link-deliverable/:deliverableId`
- `GET /api/timeline`
- `GET /api/deliverables`
- `POST /api/deliverables`
- `PATCH /api/deliverables/:id`

## Security Model (v1)
- Session auth via Auth.js (`next-auth`) credentials provider
- Passwords hashed with bcrypt
- Data ownership enforced in service-layer queries by `owner_id`

## Tests
- Unit tests: phase sequence, task date validation, reorder logic, seed template
- Integration tests: route auth + bootstrap/task contracts (mocked service layer)
- E2E specs: kanban/timeline-deliverables flows (gated by `E2E_BYPASS_AUTH`)

Run:
- `npm test`
- `npm run test:e2e`
