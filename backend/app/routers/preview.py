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
    
    # --- SAFETY FIXES FOR JSON RESPONSE ---
    
    # 1. Handle Infinity: Math ops (like Log/Division) can create 'inf'. 
    # JSON cannot handle 'inf', so we replace it with None or a high number.
    df_transformed = df_transformed.replace([np.inf, -np.inf], None)

    # 2. Handle NaN: You already have this, keep it!
    df_clean = df_transformed.replace({np.nan: None})

    # 3. Handle Dates: If you kept a Date column (drop_original=False), 
    # Pandas Timestamps sometimes break FastAPI JSON serialization.
    # Convert any remaining datetime columns to strings just to be safe.
    for col in df_clean.select_dtypes(include=['datetime', 'datetimetz']).columns:
        df_clean[col] = df_clean[col].astype(str)
    
    return {
        "status": "success",
        "rows": len(df_transformed),
        "columns": list(df_transformed.columns),
        "data": df_clean.head(100).to_dict(orient="records")
    }

@router.get("/options")
def get_pipeline_options():
    return {
        "operations": [
            # ================= GROUP 1: CLEANING & DROPPING =================
            {
                "id": "drop_column",
                "label": "Drop Column",
                "category": "Cleaning",
                "params": [
                     {"name": "col", "type": "column_select", "label": "Column to Drop"}
                ] 
            },
            {
                "id": "drop_duplicates",
                "label": "Drop Duplicates",
                "category": "Cleaning",
                "params": [] 
            },
            {
                "id": "drop_outliers_zscore",
                "label": "Drop Outliers (Z-Score)",
                "category": "Cleaning",
                "params": [
                    {"name": "col", "type": "column_select", "label": "Column"},
                    {"name": "threshold", "type": "number", "label": "Threshold (std dev)", "default": 3}
                ]
            },
            {
                "id": "drop_outliers_manual",
                "label": "Drop Outliers (Manual)",
                "category": "Cleaning",
                "params": [
                    {"name": "col", "type": "column_select", "label": "Column"},
                    {"name": "value", "type": "number", "label": "Cutoff Value (<)"}
                ]
            },

            # ================= GROUP 2: IMPUTATION =================
            {
                "id": "fill_na_mean",
                "label": "Fill Missing (Mean)",
                "category": "Imputation",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "fill_na_median",
                "label": "Fill Missing (Median)",
                "category": "Imputation",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "fill_na_mode",
                "label": "Fill Missing (Mode)",
                "category": "Imputation",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "fill_na_const",
                "label": "Fill Missing (Constant)",
                "category": "Imputation",
                "params": [
                    {"name": "col", "type": "column_select", "label": "Column"},
                    {"name": "value", "type": "text", "label": "Value to Fill", "default": 0}
                ]
            },
            {
                "id": "fill_na_knn",
                "label": "Fill Missing (KNN)",
                "category": "Imputation",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "fill_na_groupby",
                "label": "Impute by Group (Advanced)",
                "category": "Imputation",
                "params": [
                    {"name": "col", "type": "column_select", "label": "Target Column"},
                    {"name": "group_col", "type": "column_select", "label": "Group By"},
                    {"name": "strategy", "type": "select", "label": "Method", "options": ["mean", "median", "mode"], "default": "median"}
                ]
            },

            # ================= GROUP 3: DATES =================
            {
                "id": "extract_date_parts",
                "label": "Extract Date Parts",
                "category": "Dates",
                "params": [
                    {"name": "col", "type": "column_select", "label": "Date Column"},
                    {"name": "drop_original", "type": "select", "label": "Drop Original?", "options": ["True", "False"], "default": "True"}
                ]
            },

            # ================= GROUP 4: MATH, BINNING & TRANSFORM =================
            {
                "id": "bin_numeric",
                "label": "Binning / Discretization",
                "category": "Math",
                "params": [
                    {"name": "col", "type": "column_select", "label": "Column"},
                    {"name": "bins", "type": "number", "label": "Number of Bins", "default": 5},
                    {"name": "strategy", "type": "select", "label": "Strategy", "options": ["quantile", "uniform"], "default": "quantile"},
                    {"name": "labels", "type": "select", "label": "Use Labels?", "options": ["False", "True"], "default": "False"}
                ]
            },
            {
                "id": "log_transform",
                "label": "Log Transform (Log1p)",
                "category": "Math",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "box_cox_transform",
                "label": "Box-Cox Transform",
                "category": "Math",
                "params": [
                    {"name": "col", "type": "column_select", "label": "Column"},
                    {"name": "threshold", "type": "number", "label": "Skew Threshold", "default": 0.5}
                ]
            },
            {
                "id": "create_interaction",
                "label": "Feature Interaction",
                "category": "Math",
                "params": [
                    {"name": "col1", "type": "column_select", "label": "Column A"},
                    {"name": "math_op", "type": "select", "label": "Operator", "options": ["+", "-", "*", "/"]},
                    {"name": "col2", "type": "column_select", "label": "Column B"},
                    {"name": "new_name", "type": "text", "label": "New Column Name"}
                ]
            },
            {
                "id": "polynomial_features",
                "label": "Polynomial Features",
                "category": "Math",
                "params": [
                    {"name": "col", "type": "column_select", "label": "Column"},
                    {"name": "degree", "type": "number", "label": "Degree", "default": 2}
                ]
            },

            # ================= GROUP 5: SCALERS =================
            {
                "id": "standard_scaler",
                "label": "Standard Scaler (Z-Score)",
                "category": "Scaling",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "minmax_scaler",
                "label": "MinMax Scaler (0-1)",
                "category": "Scaling",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "robust_scaler",
                "label": "Robust Scaler (Outliers)",
                "category": "Scaling",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "maxabs_scaler",
                "label": "MaxAbs Scaler",
                "category": "Scaling",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },

            # ================= GROUP 6: ENCODING =================
            {
                "id": "one_hot_encode",
                "label": "One-Hot Encoding",
                "category": "Encoding",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "label_encode",
                "label": "Label Encoding",
                "category": "Encoding",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "ordinal_encode",
                "label": "Ordinal Encoding",
                "category": "Encoding",
                "params": [{"name": "col", "type": "column_select", "label": "Column"}] 
            },
            {
                "id": "target_encode",
                "label": "Target Encoding",
                "category": "Encoding",
                "params": [
                    {"name": "col", "type": "column_select", "label": "Categorical Column"},
                    {"name": "target_col", "type": "column_select", "label": "Target Variable (e.g. SalePrice)"}
                ]
            }
        ]
    }