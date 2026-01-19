import pandas as pd
import numpy as np
from pathlib import Path

def analyze_dataset(sample_path: Path):

    try:
        df = pd.read_csv(sample_path)
    except Exception:
        return {"error": "Could not read sample file."}
    
    total_rows = len(df)
    
    # --- FIX: Cast numpy types to standard Python int ---
    memory_usage = int(df.memory_usage(deep=True).sum()) 
    duplicate_rows = int(df.duplicated().sum())
    # ----------------------------------------------------

    column_stats = []

    for col in df.columns:
        col_type = "numeric" if np.issubdtype(df[col].dtype, np.number) else "categorical"
        
        # Cast to standard int/float here as well just to be safe
        missing_count = int(df[col].isna().sum())
        missing_percentage = round((missing_count / total_rows) * 100, 1)
        unique_count = int(df[col].nunique())

        stat_item = {
            "name": col,
            "type": col_type,
            "missing": missing_count,
            "missing_pct": missing_percentage,
            "unique": unique_count,
            "distribution": [] 
        }

        # --- NUMERIC STATS ---
        if col_type == "numeric":
            clean_series = df[col].dropna()
            if not clean_series.empty:
                # Explicit float() casting for all stats
                stat_item["mean"] = round(float(clean_series.mean()), 2)
                stat_item["median"] = round(float(clean_series.median()), 2)
                stat_item["std_dev"] = round(float(clean_series.std()), 2)
                stat_item["min"] = round(float(clean_series.min()), 2)
                stat_item["max"] = round(float(clean_series.max()), 2)

                # Histogram
                counts, bin_edges = np.histogram(clean_series, bins=10)
                for i in range(len(counts)):
                    label = f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}"
                    stat_item["distribution"].append({
                        "label": label,
                        "value": int(counts[i]) # Cast numpy int to python int
                    })
        
        # --- CATEGORICAL STATS ---
        else:
            clean_series = df[col].dropna().astype(str)
            if not clean_series.empty:
                # Top Value Logic
                top_val = clean_series.mode().iloc[0] if not clean_series.mode().empty else "N/A"
                freq = int(clean_series.value_counts().iloc[0]) if not clean_series.value_counts().empty else 0
                
                stat_item["top_value"] = str(top_val)
                stat_item["freq"] = freq

                # --- FIX: Show Top 20 instead of 10 ---
                # value_counts() sorts by frequency descending by default.
                # .head(20) will take the top 20. If there are less than 20, it takes all.
                top_counts = clean_series.value_counts().head(20)
                
                for cat_name, count in top_counts.items():
                    stat_item["distribution"].append({
                        "label": str(cat_name),
                        "value": int(count) 
                    })

        column_stats.append(stat_item)

    return {
        "filename": sample_path.name,
        "total_rows": total_rows,
        "total_cols": len(df.columns),
        "memory_usage": memory_usage,
        "duplicate_rows": duplicate_rows,
        "columns": column_stats
    }