# CommerceSuite

[![CI](https://github.com/JimmyAlter/CommerceSuite/actions/workflows/ci.yml/badge.svg)](https://github.com/JimmyAlter/CommerceSuite/actions/workflows/ci.yml)

An internal procurement storefront: catalog, cart and checkout for buyers, and order management for admins. Totals, stock and roles are enforced on the server. The UI is branded as "NovaTech Supply", a fictional company.

**Live demo:** [commercesuite-demo.vercel.app](https://commercesuite-demo.vercel.app). The API runs on Render's free tier, so the first request after a while idle can take up to a minute.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@commercesuite.dev` | `demo123` |
| Buyer | `buyer@commercesuite.dev` | `demo123` |

![Catalog](docs/screenshots/catalog.png)

## What it does

- **Catalog**: public list of active products, with category, search, price filters and sorting in the UI
- **Checkout**: the client sends product IDs and quantities only. The server reads prices from the database, checks stock, and writes the order, its line items and the stock decrement in one SQLite transaction. If any line fails, nothing is written
- **Roles**: `requireRole('admin')` guards product creation, the order list and status changes, so a buyer token gets a 403. Hiding admin screens in the UI is not what protects them
- **Order status**: `processing` → `fulfilled` or `cancelled`. Any other value is rejected

It shares its foundation with [AssetDesk](https://github.com/JimmyAlter/AssetDesk). This is the one where the role checks actually landed.

## Validation and errors

| Case | Response |
|---|---|
| Missing or invalid token | 401 |
| Buyer calling an admin route | 403 |
| Unknown product, bad quantity (not a whole number from 1 to 999), more than 50 lines, missing shipping fields, unknown payment method | 400 |
| Not enough stock, duplicate SKU | 409 |
| Status change on a missing order | 404 |

## Stack

React 19 and Vite (frontend) · Node.js, Express and better-sqlite3 (API) · JWT auth, bcrypt, helmet and express-rate-limit

```text
React (Vercel) ──► Express API (Render) ──► SQLite
```

## Running it locally

```bash
cd backend
cp .env.example .env
npm ci
npm start            # http://localhost:4100, creates and seeds the database on first run

cd ../frontend
npm ci
npm run dev          # http://localhost:5173, talks to http://localhost:4100 by default
```

## Tests

```bash
cd backend && npm test
```

The node:test suite starts the API against a fresh SQLite file and checks the following:

- RBAC on every admin route
- totals are computed from server prices, even when the client sends a price
- an order that exceeds stock is rejected and leaves orders and inventory untouched
- every row of the validation table above

CI runs these tests on Node 20 and 22, plus the frontend lint and build.

## Security notes

- All queries are prepared statements with `?` placeholders.
- `helmet` sets the default security headers. JSON bodies are capped at 200 KB, and login is limited to 20 attempts per minute.
- With `NODE_ENV=production`, the server exits at startup if `JWT_SECRET` is missing or still the development default.
- Passwords are stored as bcrypt hashes and never returned by the API.

## Deployment

`render.yaml` defines the API service and `DB_PATH`. The frontend is a static Vite build on Vercel with `VITE_API_URL` pointing at the API. SQLite fits a single small instance like this demo. For more than one instance, move to PostgreSQL. The data layer lives in `backend/src/db.js`.

## License

MIT. See [LICENSE](LICENSE).
