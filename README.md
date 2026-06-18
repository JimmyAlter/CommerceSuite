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

---

## 🛡️ Security & Architecture Model

In accordance with community security code review, the platform is designed with the following security boundaries:

1.  **SQL Injection Mitigation (100% Parameterized Queries):** 
    All SQLite database queries (including user auth, product catalog retrieval, order inserts, order items records, and status patches) are written using parameterized prepared statements via the SQLite engine (`db.prepare(...)` with placeholder `?`). Raw input string concatenation is never used, completely neutralizing SQL injection vectors.
2.  **API Rate Limiting & Hardening:**
    The login endpoint (`/api/auth/login`) is gated by rate-limiting middleware (`express-rate-limit`) to prevent automated dictionary attacks. The backend uses `helmet` headers for basic security sanitization (CSP, clickjacking prevention, X-Content-Type-Options) and restricts JSON payloads to `200kb`.
3.  **Role-Based Access Control (RBAC):**
    Authentication is verified via secure JWT signatures. Specific administrative endpoints (like adding products, listing all orders, and patching order statuses) are protected by a server-side RBAC middleware (`requireRole('admin')`), ensuring that client-side route hiding is backed by strict backend validation.

---

## 🌐 Deployment & Persistence Model (SQLite Free-Tier Warning)

By default, this project deploys SQLite on Render's free tier:
*   **Ephemeral Filesystem:** Because free Render instances lack persistent disk volume attachments, the SQLite database (`.db`) is stored in the writable ephemeral container space.
*   **Safety Recycle:** Whenever the dyno goes to sleep due to inactivity or recycles during deployments, the database resets to its default seeded state. For public showcase demos, this acts as a natural security feature, clearing user-submitted spam.
*   **Production Upgrade:** For a production-ready deployment, it is highly recommended to provision PostgreSQL on Render (which is natively supported by swap-in client layers in `db.js`) or use a remote DB provider (like Neon, Turso/LibSQL, or Supabase).

---

## ⚙️ Environment Variables

### Backend Configuration (`/backend/.env`)
| Variable | Description | Default / Example | Required |
|---|---|---|---|
| `PORT` | Port for Express API | `4100` | No |
| `JWT_SECRET` | 256-bit cryptographically secure signature secret | `your_secure_jwt_secret_here` | **Yes (Prod)** |
| `CORS_ORIGIN` | Allowed origin for incoming requests | `https://commercesuite-demo.vercel.app` | Yes |

### Frontend Configuration (`/frontend/.env`)
| Variable | Description | Default / Example | Required |
|---|---|---|---|
| `VITE_API_URL` | Live Render backend endpoint | `https://commercesuite-backend.onrender.com` | No (falls back to local mock storage) |
| `VITE_DEMO_MODE` | Force UI to run in local mock database mode | `true` | No |

