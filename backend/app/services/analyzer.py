import pandas as pd
import numpy as np
from pathlib import Path

def analyze_dataset(sample_Path: Path):

    try:
        df= pd.read_csv(sample_Path)
    except Exception:
        return {"error": "Could not read sample file."}
    
    total_rows = len(df)

    column_stats = []

    for col in df.columns:
        col_type = str(df[col].dtype)
        missing_count = int(df[col].isna().sum())
        missing_percentage = round((missing_count / total_rows) * 100, 1)

        stat_item = {
            "name": col,
            "type": "numeric" if np.issubdtype(df[col].dtype, np.number) else "categorical",
            "missing": missing_count,
            "missing_pct": missing_percentage,
            "unique": int(df[col].nunique()),
            "distribution": [] # The histogram data
        }

        # --- CALCULATE HISTOGRAM / COUNTS ---
        if stat_item["type"] == "numeric":
            # For numbers: Create 10 bins (buckets)
            # dropna() is important or histogram fails
            clean_series = df[col].dropna()
            if not clean_series.empty:
                counts, bin_edges = np.histogram(clean_series, bins=10)
                # Format for Recharts/Chart.js: [{"range": "0-10", "count": 5}, ...]
                for i in range(len(counts)):
                    range_label = f"{bin_edges[i]:.1f} - {bin_edges[i+1]:.1f}"
                    stat_item["distribution"].append({
                        "label": range_label,
                        "value": int(counts[i])
                    })
                    
        else:
            # For categories: Just count top 10 most frequent values
            # e.g. {"Male": 600, "Female": 400}
            top_counts = df[col].value_counts().head(10)
            for cat_name, count in top_counts.items():
                stat_item["distribution"].append({
                    "label": str(cat_name),
                    "value": int(count)
                })

        column_stats.append(stat_item)

    return {
        "total_rows": total_rows,
        "total_cols": len(df.columns),
        "columns": column_stats
    }