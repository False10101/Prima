from fastapi import APIRouter, HTTPException
from pathlib import Path
from app.config import settings
from app.services import analyzer

router = APIRouter()

@router.get("/analyze/{session_id}")
def get_dataset_analysis(session_id: str):

    session_dir = settings.UPLOAD_DIR / session_id
    sample_path = session_dir / "sample.csv"
    
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Session not found or file missing.")

    stats = analyzer.analyze_dataset(sample_path)
    
    return stats