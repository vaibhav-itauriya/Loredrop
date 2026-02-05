# LoredROP monorepo

This repository contains two packages:

- `frontend/` — Vite + React frontend
- `backend/` — Express + TypeScript backend

Quick start

Install dependencies for both packages (pnpm workspace):

```bash
pnpm install
```

Run development servers in parallel:

```bash
pnpm run dev
# or to run separately
pnpm run start:backend
pnpm run start:frontend
```

Notes

- Frontend uses `VITE_API_URL` env var. Put it in `frontend/.env.local` (e.g. `VITE_API_URL=http://localhost:3001/api`).
- Backend uses `backend/.env` for SMTP, MongoDB, and Firebase credentials.
