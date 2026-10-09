# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import (
    objects, services, planning, facts, acts, reports,
    dashboard, units, service_categories, resources,
    pricing_settings, cost_analysis, auth, users, audit
)
from app.routers import notifications

app = FastAPI(
    title="ДомСервис API",
    description="Система управления обслуживанием МКД и паркингов",
    version="2.0"
)

# 🎯 КЛЮЧЕВОЙ БЛОК: CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],  # ✅ Обязательно "*" или ["Authorization", "Content-Type"]
)

# Роутеры
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(objects.router, prefix="/api/v1")
app.include_router(units.router, prefix="/api/v1")
app.include_router(service_categories.router, prefix="/api/v1")
app.include_router(services.router, prefix="/api/v1")
app.include_router(resources.router, prefix="/api/v1")
app.include_router(pricing_settings.router, prefix="/api/v1")
app.include_router(cost_analysis.router, prefix="/api/v1")
app.include_router(planning.router, prefix="/api/v1")
app.include_router(facts.router, prefix="/api/v1")
app.include_router(acts.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "ДомСервис API работает"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}