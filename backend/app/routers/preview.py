from fastapi import APIRouter, HTTPException
import pandas as pd
from app.config import settings
from app.models.recipe import Recipe
from app.services import transformer
import numpy as np

router = APIRouter()

@router.post("/preview")
def preview_pipeline(recipe: Recipe):
    """
    Loads the session's SAMPLE csv, applies steps, returns transformed data.
    """
    # 1. Find the file
    session_dir = settings.UPLOAD_DIR / recipe.session_id
    sample_path = session_dir / "sample.csv"
    
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Session expired or not found.")

    # 2. Load the CLEAN sample (Replay Strategy)
    try:
        df = pd.read_csv(sample_path)
    except Exception:
        raise HTTPException(status_code=500, detail="Could not read sample file.")

    # 3. Apply the Recipe
    df_transformed = transformer.apply_recipe(df, recipe)
    df_clean = df_transformed.replace({np.nan: None})
    
    # 4. Return result (First 20 rows only for speed)
    return {
        "status": "success",
        "rows": len(df_transformed),
        "columns": list(df_transformed.columns),
        "data": df_clean.head(20).to_dict(orient="records")
    }