# LoreDrop

LoreDrop is an IIT Kanpur-focused campus event platform with:
- discovery feed for students
- organization pages and follows
- calendar save and RSVP flows
- organizer workspace (event creation, tasks, analytics, messaging)
- admin workflows for access approvals and organization admin management

## Monorepo structure

```text
.
|- frontend/   # React + Vite app
|- backend/    # Express + MongoDB API
|- README.md
|- USER_MANUAL_LOREDROP_DRAFT.md
```

## Tech stack

- Frontend: React 19, TypeScript, Vite, Tailwind, Radix UI
- Backend: Node.js, Express, TypeScript, Mongoose
- Database: MongoDB
- Auth: Email verification + password sessions (IITK email domain restricted)
- Messaging/Organizer: custom API routes under `/api/organizer`

## Prerequisites

- Node.js 20+
- pnpm (recommended)
- MongoDB instance (local or Atlas)
- SMTP credentials (for verification code emails)

## Environment setup

1. Copy env templates:

```powershell
copy backend/.env.example backend/.env
copy frontend/.env.example frontend/.env
```

2. Update values in `backend/.env`:

- `MONGODB_URI`
- `PORT` (default `3001`)
- `CLIENT_URL` (default `http://localhost:5173`)
- SMTP values (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`)
- auth token values (`AUTH_TOKEN_SECRET`, etc.)
- Firebase service account fields (required for Firebase-dependent flows)

3. Update values in `frontend/.env`:

- `VITE_API_URL` (default `http://localhost:3001/api`)
- optional Firebase web config keys

## Install dependencies

From repo root:

```powershell
pnpm install
```

## Run locally

Run backend and frontend in separate terminals.

Terminal 1 (backend):

```powershell
pnpm -C backend run dev
```

Terminal 2 (frontend):

```powershell
pnpm -C frontend run dev
```

Open: `http://localhost:5173`

Health endpoint: `http://localhost:3001/health`

## Build commands

```powershell
pnpm -C backend run build
pnpm -C frontend run build
pnpm -w -r run build
```

## Optional seed data

```powershell
pnpm -C backend run seed
```

This script creates IITK organizations and sample events.

## Key product notes

- Authentication only allows `@iitk.ac.in` emails.
- Email verification is required before password setup/login.
- Organizer dashboard is at `/admin`.
- Organization management page is at `/organizations/:slug/manage`.
- Organizer messaging supports organization and event channels.

## API route groups

- `/api/auth`
- `/api/events`
- `/api/interactions`
- `/api/organizations`
- `/api/organization-requests`
- `/api/organizer`

## Troubleshooting

- `Failed to send verification code`:
  - verify SMTP credentials in `backend/.env`
  - check backend logs for transporter/auth errors
- frontend cannot connect to backend:
  - confirm backend running on `PORT`
  - confirm `VITE_API_URL` points to `/api`
- build issues:
  - run `pnpm install` again
  - run workspace builds individually to isolate errors

## Additional docs

Detailed functional and user-flow documentation:
- [USER_MANUAL_LOREDROP_DRAFT.md](./USER_MANUAL_LOREDROP_DRAFT.md)

## Security

- Do not commit `.env` files or live credentials.
- If any secrets were previously exposed, rotate them immediately (SMTP, Firebase, JWT/auth secrets, DB credentials).
