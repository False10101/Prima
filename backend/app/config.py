import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "Prima Data Refinery"
    VERSION: str = "1.0.0"

    BASE_DIR = Path(__file__).resolve().parent.parent

    UPLOAD_DIR = BASE_DIR / "temp_uploads"

    ALLOWED_EXTENSIONS = {".csv"}
    MAX_FILE_SIZE_MB = 200

settings = Settings()