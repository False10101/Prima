from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.cleanup import delete_old_sessions

# --- PLACEHOLDERS FOR ROUTERS ---
# We will uncomment these as we create the files in the next steps.
from app.routers import upload, analysis, preview, export

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Run code on server startup and shutdown.
    """
    # 1. STARTUP: Ensure storage exists
    print(f"🚀 Server Starting... Creating storage at: {settings.UPLOAD_DIR}")
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    # 2. SCHEDULER: Start the cleanup job
    scheduler = BackgroundScheduler()
    # Run the job every 60 minutes
    scheduler.add_job(delete_old_sessions, 'interval', minutes=60)
    # scheduler.add_job(delete_old_sessions, 'interval', seconds=15)
    scheduler.start()
    print("⏰ Cleanup Scheduler started (Running every 60 mins)")
    
    yield
    
    # 3. SHUTDOWN: proper cleanup
    print("🛑 Server Stopping...")
    scheduler.shutdown() # Stop the scheduler cleanly

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",  # Vite React Port (if you use Vite)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

@app.get("/")
def read_root():
    return {"status": "active", "system": "Prima Backend v1"}

# Register the routers (Uncomment as you build them)
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(preview.router, prefix="/api", tags=["Preview"])
app.include_router(export.router, prefix="/api", tags=["Export"])

if __name__ == "__main__":
    import uvicorn
    # This allows you to run 'python app/main.py' directly if needed
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
