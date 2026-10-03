# Origin Gemstone Operations

Local-only full-stack workspace for gemstone intake, custody, processing,
inventory, sales, payments, and lifecycle reporting.

## Structure

- `frontend/` — existing Next.js presentation interface
- `backend/` — Node.js, Express, TypeScript, and MySQL API

## Local development

Node.js 22.13 or later is required.

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

The frontend uses `http://127.0.0.1:5173`; the backend uses
`http://127.0.0.1:4000`. Configure MySQL using `backend/.env.example`, then run
`npm run db:migrate --workspace backend` before using database-backed endpoints.

This repository remains localhost-only and contains no hosting configuration.
