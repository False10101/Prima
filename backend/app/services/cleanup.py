import os
import shutil
import time
from pathlib import Path
from app.config import settings

def delete_old_sessions():
    """
    Scans the upload directory and deletes folders older than 24 hours.
    """
    upload_dir = settings.UPLOAD_DIR
    
    # 24 hours in seconds (24 * 60 * 60)
    MAX_AGE_SECONDS = 86400 
    # MAX_AGE_SECONDS = 10     # (10 Seconds)
    
    current_time = time.time()
    
    if not upload_dir.exists():
        return

    print("🧹 Running cleanup job...")
    
    # Iterate over all UUID folders in temp_uploads
    for session_path in upload_dir.iterdir():
        if session_path.is_dir():
            try:
                # Get the last modified time of the FOLDER
                folder_mtime = session_path.stat().st_mtime
                age = current_time - folder_mtime
                
                if age > MAX_AGE_SECONDS:
                    print(f"🗑️ Deleting expired session: {session_path.name} (Age: {int(age)}s)")
                    shutil.rmtree(session_path) # Recursively delete folder & files
            except Exception as e:
                print(f"⚠️ Error cleaning up {session_path.name}: {e}")