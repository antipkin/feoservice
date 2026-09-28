from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    objects, services, resources, planning, units,
    service_categories, facts, acts, dashboard, reports
)

app = FastAPI(
    title="ДомСервис API",
    description="API для планирования ФЭО тарифа и учёта выполненных работ",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(objects.router, prefix="/api/v1")
app.include_router(units.router, prefix="/api/v1")
app.include_router(service_categories.router, prefix="/api/v1")
app.include_router(services.router, prefix="/api/v1")
app.include_router(resources.router, prefix="/api/v1")
app.include_router(planning.router, prefix="/api/v1")
app.include_router(facts.router, prefix="/api/v1")
app.include_router(acts.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "ДомСервис API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}