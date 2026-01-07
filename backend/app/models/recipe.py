from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class Step(BaseModel):
    id: str                 # Unique ID from frontend (e.g. "uuid-123")
    operation: str          # e.g. "impute", "standard_scaler", "drop"
    column: str             # The target column
    params: Dict[str, Any] = {}  # Flexible dict for extras like {"strategy": "median"}

class Recipe(BaseModel):
    session_id: str
    steps: List[Step]