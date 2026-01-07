from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services import file_manager

router = APIRouter()

@router.post("/upload/{session_id}")
async def upload_dataset(session_id: str, file: UploadFile = File(...)):

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")

    # 2. Call the Service (The Logic)
    result = file_manager.save_upload_and_create_sample(session_id, file)
    
    return result