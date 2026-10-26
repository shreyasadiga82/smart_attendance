from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging
from app.config import settings
from app.database import engine, Base
from app.routers import auth, students, enrollment, attendance, reports, settings, dashboard, stream, devices

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Smart Attendance System...")
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created.")
    # Preload face recognition engine
    try:
        from app.services.face_engine import get_engine
        get_engine()
        from app.services.recognition_engine import get_smart_engine
        from app.database import SessionLocal
        with SessionLocal() as db_session:
            get_smart_engine().refresh_embeddings(db_session)
        logger.info("Face recognition & eye sensor engine initialized and ready.")
    except Exception as e:
        logger.warning(f"Could not preload face engine: {e}")
    yield
    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title="Smart Attendance System",
    description="Face recognition based attendance system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_header(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith(".html") or path == "/sw.js" or path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(students.router, prefix="/api/students", tags=["students"])
app.include_router(enrollment.router, prefix="/api/enrollment", tags=["enrollment"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(devices.router, prefix="/api/devices", tags=["devices"])
app.include_router(stream.router, prefix="/ws", tags=["websocket"])
import os
from fastapi.responses import Response

@app.get("/sw.js")
async def kill_service_worker():
    content = """self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => {
  caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))))
  .then(() => self.registration.unregister())
  .then(() => self.clients.claim());
});"""
    return Response(content=content, media_type="application/javascript", headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

@app.get("/registerSW.js")
async def kill_register_sw():
    content = """if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    for (let r of regs) { r.unregister(); }
  });
}
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let n of names) { caches.delete(n); }
  });
}"""
    return Response(content=content, media_type="application/javascript", headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

from fastapi.responses import Response, FileResponse

# Serve static files (built frontend) with SPA fallback
dist_path = "frontend/dist" if os.path.exists("frontend/dist") else ("../frontend/dist" if os.path.exists("../frontend/dist") else None)
if dist_path:
    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target = os.path.join(dist_path, full_path)
        if full_path and os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(
            os.path.join(dist_path, "index.html"),
            headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}
        )
    logger.info(f"Serving SPA frontend from {dist_path}")
else:
    logger.warning("frontend/dist does not exist. Frontend will not be served.")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        ssl_keyfile=settings.SSL_KEYFILE if settings.USE_SSL else None,
        ssl_certfile=settings.SSL_CERTFILE if settings.USE_SSL else None
    )