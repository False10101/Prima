import shutil
import pandas as pd
from pathlib import Path
from fastapi import UploadFile, HTTPException
from app.config import settings

def save_upload_and_create_sample(session_id: str, file: UploadFile):
    
    session_folder=settings.UPLOAD_DIR/session_id
    session_folder.mkdir(parents=True, exist_ok=True)

    original_path = session_folder / "original.csv"
    sample_path = session_folder / "sample.csv"

    try:
        with original_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        # cleanup if fail
        shutil.rmtree(session_folder) 
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    finally:
        file.file.close() # Important: Release the file handle!

    # 3. Generate the Lightweight Sample (The "Cheat" file)
    try:
        # We only read the first 1000 rows
        df = pd.read_csv(original_path, nrows=1000)
        
        # Save it back to disk
        df.to_csv(sample_path, index=False)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File is not a valid CSV: {str(e)}")

    return {
        "status": "success",
        "rows_processed": len(df),
        "session_id": session_id,
        "message": "File uploaded and sampled successfully."
    }