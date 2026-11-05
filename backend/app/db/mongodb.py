import asyncio
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.core.logging import logger

client: Optional[AsyncIOMotorClient] = None
database: Optional[AsyncIOMotorDatabase] = None
_client_loop: Optional[asyncio.AbstractEventLoop] = None


async def connect_to_mongodb():
    global client, database, _client_loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            maxPoolSize=50,
            minPoolSize=5,
        )
        _client_loop = current_loop
        database = client[settings.MONGODB_DB_NAME]
        # Verify connection
        await client.admin.command("ping")
        logger.info(f"Successfully connected to MongoDB database '{settings.MONGODB_DB_NAME}'")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        database = None


async def close_mongodb_connection():
    global client, database, _client_loop
    if client:
        logger.info("Closing MongoDB connection...")
        client.close()
        client = None
        database = None
        _client_loop = None
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    global client, database, _client_loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    # If loop changed or client is None/closed, reinitialize client
    if client is None or database is None or (_client_loop is not None and _client_loop != current_loop):
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            maxPoolSize=50,
            minPoolSize=5,
        )
        _client_loop = current_loop
        database = client[settings.MONGODB_DB_NAME]

    return database
