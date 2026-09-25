from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title="ФЭО-Сервис API",
    description="API для планирования ФЭО тарифа и учёта выполненных работ",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "ФЭО-Сервис API is running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}