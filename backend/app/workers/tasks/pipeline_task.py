import asyncio
from app.workers.celery_app import celery_app
from app.pipelines.orchestrator import DocumentPipelineOrchestrator
from app.core.config import settings
from app.core.logging import logger


@celery_app.task(bind=True, max_retries=3)
def process_document_pipeline_task(self, job_id: str, document_id: str, case_id: str, user_id: str):
    logger.info(f"Celery worker picked up job {job_id} for doc {document_id}")
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    try:
        loop.run_until_complete(
            DocumentPipelineOrchestrator.run_pipeline(job_id, document_id, case_id, user_id)
        )
    except Exception as exc:
        logger.error(f"Celery task exception: {exc}")
        raise self.retry(exc=exc, countdown=10)


def dispatch_processing_job(job_id: str, document_id: str, case_id: str, user_id: str):
    """
    Dispatches document to either Celery/RabbitMQ or local asynchronous event loop task.
    """
    if settings.USE_LOCAL_TASK_RUNNER:
        logger.info(f"Dispatching job {job_id} using local asynchronous background task runner.")
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(
                DocumentPipelineOrchestrator.run_pipeline(job_id, document_id, case_id, user_id)
            )
        except RuntimeError:
            asyncio.run(
                DocumentPipelineOrchestrator.run_pipeline(job_id, document_id, case_id, user_id)
            )
    else:
        logger.info(f"Dispatching job {job_id} to Celery/RabbitMQ queue.")
        try:
            process_document_pipeline_task.delay(job_id, document_id, case_id, user_id)
        except Exception as e:
            logger.warning(f"Failed to enqueue to RabbitMQ ({e}), falling back to local task runner.")
            asyncio.create_task(
                DocumentPipelineOrchestrator.run_pipeline(job_id, document_id, case_id, user_id)
            )
