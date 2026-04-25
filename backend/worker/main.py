import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.config import settings
from worker.orchestrator import run_daily_pipeline
from worker.db import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _run():
    with SessionLocal() as session:
        run_daily_pipeline(session)


def main():
    from sqlalchemy import text
    try:
        with SessionLocal() as session:
            count = session.execute(text("SELECT COUNT(*) FROM ideas")).scalar()
            if count == 0:
                logger.info("Empty database — running pipeline immediately")
                run_daily_pipeline(session)
    except Exception as exc:
        logger.warning("Bootstrap check failed — skipping immediate run: %s", exc)

    scheduler = BlockingScheduler()
    scheduler.add_job(
        _run,
        CronTrigger(hour=settings.worker_schedule_hour, minute=settings.worker_schedule_minute),
    )
    logger.info(
        f"Worker scheduled at {settings.worker_schedule_hour:02d}:{settings.worker_schedule_minute:02d} daily"
    )
    scheduler.start()


if __name__ == "__main__":
    main()
