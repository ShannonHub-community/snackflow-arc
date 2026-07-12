"""
APScheduler wiring. Uses AsyncIOScheduler so jobs run on the same asyncio
event loop as FastAPI/uvicorn -- no extra threads/processes needed.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from src.config.settings import settings
from src.scheduler.jobs import run_nightly_maintenance
from src.utils.logger import get_logger

logger = get_logger(__name__)

scheduler = AsyncIOScheduler(timezone=settings.TIMEZONE)


def start_scheduler() -> None:
    scheduler.add_job(
        run_nightly_maintenance,
        trigger=CronTrigger(hour=settings.DAILY_RESET_HOUR, minute=settings.DAILY_RESET_MINUTE),
        id="nightly_maintenance",
        replace_existing=True,
        misfire_grace_time=3600,  # tolerate up to 1hr delay (e.g. deploy restart)
    )
    scheduler.start()
    logger.info(
        "Scheduler started: nightly_maintenance @ %02d:%02d %s",
        settings.DAILY_RESET_HOUR, settings.DAILY_RESET_MINUTE, settings.TIMEZONE,
    )


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down")
