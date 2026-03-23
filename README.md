# NovaTech Supply

NovaTech Supply is an enterprise procurement storefront built for internal hardware and software purchasing. It combines a clean catalog experience with secure checkout and admin-ready order management.

## Capabilities
- Secure login with JWT and rate-limited auth
- Enterprise catalog with real-time inventory visibility
- Server-side order totals and stock enforcement
- Admin order management with status tracking
- Responsive, modern UI optimized for procurement teams

## Technology
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite (swap-in ready for PostgreSQL)
- Security: Helmet, rate limiting, JWT, hashed passwords

## Architecture
```
React UI -> Express API -> SQLite
```

## Local Setup

### Backend
```
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

API: `http://localhost:4100`

### Frontend
```
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend: `http://localhost:5173`

### Demo Access
- Admin: `admin@commercesuite.dev` / `demo123`
- Buyer: `buyer@commercesuite.dev` / `demo123`

## Notes
- Update `CORS_ORIGIN` in `backend/.env` if the frontend URL changes.
- For production, replace SQLite with PostgreSQL and use environment-based secrets.
