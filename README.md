# Origin Gemstone Operations

Full-stack workspace for gemstone intake, custody, processing,
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

The frontend uses `http://127.0.0.1:3500`; the backend uses
`http://127.0.0.1:4500`. Configure MySQL using `backend/.env.example`, then run
`npm run db:migrate --workspace backend` before using database-backed endpoints.

For the aaPanel, PM2, Cloudflare, and MySQL production procedure, see
[`DEPLOYMENT.md`](DEPLOYMENT.md).
