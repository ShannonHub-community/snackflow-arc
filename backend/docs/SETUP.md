# SnackFlow Backend -- Local Setup Guide

## Prerequisites
- Python 3.12+
- PostgreSQL 14+ (or a Supabase project -- see `SUPABASE_SETUP.md`)
- Redis 6+ (or an Upstash Redis instance)
- A Razorpay account (test mode keys are fine for local dev)

## 1. Clone & create a virtual environment
```bash
cd server
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

## 2. Install dependencies
```bash
pip install -r requirements.txt
```

## 3. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in at minimum:
- `DATABASE_URL` -- your Postgres connection string (see below for local Postgres, or `SUPABASE_SETUP.md` for Supabase)
- `SECRET_KEY` -- any long random string
- `ADMIN_API_KEY` -- a secret you'll pass as `X-Admin-Key` for staff-only routes
- `REDIS_URL` -- e.g. `redis://localhost:6379/0`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` -- from your Razorpay dashboard (Settings -> API Keys / Webhooks)

### Local PostgreSQL (if not using Supabase)
```bash
sudo apt-get install postgresql postgresql-contrib   # Debian/Ubuntu
sudo service postgresql start
sudo -u postgres createdb snackflow
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```
Then in `.env`:
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/snackflow
```

### Local Redis (if not using Upstash)
```bash
sudo apt-get install redis-server
sudo service redis-server start
redis-cli ping   # should print PONG
```

## 4. Run database migrations
```bash
cd server
python3 -m alembic upgrade head
```
This creates all tables (StoreStatus, MenuCategory, MenuItem, Order,
OrderItem, Payment, Session, DailyCounter, KitchenQueue, Refund,
FinanceSummary) and the PostgreSQL ENUM types they depend on.

## 5. (Optional) Seed a menu category + item for testing
```bash
sudo -u postgres psql -d snackflow -c \
  "INSERT INTO menu_categories (id, name, display_order, created_at, updated_at)
   VALUES (gen_random_uuid(), 'Starters', 1, now(), now());"
```
Then create a menu item via `POST /api/menu` (see `API_EXAMPLES.md`).

## 6. Run the server
```bash
uvicorn src.main:app --reload --port 8000
```
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

## 7. Exposing the webhook endpoint for Razorpay (local dev)
Razorpay needs to reach `POST /api/payments/webhook` over the public
internet. Use a tunnel such as [ngrok](https://ngrok.com/):
```bash
ngrok http 8000
```
Then register `https://<your-ngrok-subdomain>.ngrok.app/api/payments/webhook`
as the webhook URL in your Razorpay dashboard, selecting the
`payment.captured` event, and copy the generated webhook secret into
`RAZORPAY_WEBHOOK_SECRET` in `.env`.

## 8. Creating new migrations after model changes
```bash
python3 -m alembic revision --autogenerate -m "describe your change"
python3 -m alembic upgrade head
```
**Note:** if you drop an ENUM-backed column/table, double-check the
generated `downgrade()` -- Alembic's autogenerate does not emit `DROP TYPE`
for Postgres ENUMs, so re-running `upgrade` after a `downgrade` can fail
with `type "..." already exists` unless you add explicit
`sa.Enum(name="...").drop(op.get_bind(), checkfirst=True)` calls (see the
initial migration for a worked example).

## 9. Running tests / manual smoke test
A minimal smoke test with `curl`:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/store/status
curl http://localhost:8000/api/menu
```
See `docs/API_EXAMPLES.md` for the full request/response catalogue,
including the Cash Lock, rate limiting, and WebSocket examples.

## Project layout
```
server/
└── src/
    ├── config/       # environment-driven settings (pydantic-settings)
    ├── database/     # async engine/session + declarative base
    ├── models/       # SQLAlchemy 2.0 ORM models
    ├── schemas/       # Pydantic v2 request/response schemas
    ├── crud/          # thin data-access layer (one class per model)
    ├── services/      # business logic (order rules, ETA, payments, ...)
    ├── middleware/    # rate limiting, exception handling, request logging
    ├── routes/        # FastAPI routers (HTTP-shape only, no business logic)
    ├── websocket/      # connection manager + /ws routes
    ├── scheduler/      # APScheduler jobs (nightly maintenance)
    ├── utils/          # logger, Redis client, security helpers, exceptions
    └── main.py         # FastAPI app wiring
```
