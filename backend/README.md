# Origin backend

Node.js and MySQL API for the Origin gemstone lifecycle application.

## Local setup

1. Use Node.js 22.13 or later.
2. Create a MySQL database and a least-privilege application user.
3. Copy `.env.example` to `.env` and update the database credentials.
4. From the repository root, run `npm install`.
5. Run `npm run db:migrate --workspace backend`.
6. Run `npm run dev:backend`.

The API listens on `http://127.0.0.1:4500` by default. Its health endpoint is
`GET /api/v1/health`.

## Current API foundation

- Stone intake with permanent Stone ID generation
- Stone register and detail lookup
- Append-only lifecycle-event retrieval
- Transactional custody transfers
- Transactional placement and clearance of exception holds
- Contact and location reference data
- Optimistic version checks to prevent accidental overwrites

The initial schema also defines workshop jobs, reservations, sales, and payments so
the next backend modules can be added without redesigning the database.
