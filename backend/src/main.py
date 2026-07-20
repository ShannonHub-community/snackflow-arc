"""
SnackFlow API -- application entry point.

Run locally with:
    uvicorn src.main:app --reload --port 8000
    (Triggered reload for rate limit bypass)

"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import settings
from src.middleware.exception_handler import register_exception_handlers
from src.middleware.logging_middleware import RequestLoggingMiddleware
from src.scheduler.scheduler import shutdown_scheduler, start_scheduler
from src.utils.logger import get_logger
from src.utils.redis_client import close_redis, get_redis

# --- IMPORT NAMESPACED ROUTES ---
# Your Admin/Kitchen routes
from src.routes.admin import auth, owner, manager, kds, counter, analytics
# Member 3's Customer routes
from src.routes.customer import menu, orders, payments, store

logger = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    logger.info("Starting %s (env=%s)", settings.APP_NAME, settings.APP_ENV)
    get_redis()  # eagerly initialize the Redis connection pool
    start_scheduler()
    yield
    # ---- Shutdown ----
    shutdown_scheduler()
    await close_redis()
    logger.info("%s shut down cleanly", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Backend Core for SnackFlow -- a QR-based restaurant ordering platform. "
        "Handles store status, menu management, order lifecycle, Razorpay payments, "
        "real-time order tracking via WebSockets, and nightly maintenance jobs."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---- CORS SETUP ----
# We explicitly allow local development URLs AND both live Vercel deployments.
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://snackflow-customer.vercel.app",
    "https://snackflow-arc.vercel.app",
]

# Keep this hook in place in case you define alternative URLs in your Render environment variables
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Request logging ----
app.add_middleware(RequestLoggingMiddleware)

# ---- Centralized exception handling ----
register_exception_handlers(app)

# ---- Routes: Admin & Kitchen (Your Code) ----
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(owner.router, prefix="/api/owner", tags=["Owner Portal"])
app.include_router(manager.router, prefix="/api/manager", tags=["Manager Portal"])
app.include_router(kds.router, prefix="/api/kds", tags=["Kitchen KDS"])
app.include_router(counter.router, prefix="/api/counter", tags=["Counter Portal"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

# ---- Routes: Customer (Member 3's Code) ----
app.include_router(menu.router, prefix="/api/customer", tags=["Customer Menu"])
app.include_router(orders.router, prefix="/api/customer", tags=["Customer Orders"])
app.include_router(payments.router, prefix="/api/customer", tags=["Customer Payments"])
app.include_router(store.router, prefix="/api/customer", tags=["Customer Store Data"])

@app.get("/health", tags=["Health"])
async def health_check():
    """Basic liveness probe for load balancers / uptime monitors."""
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}