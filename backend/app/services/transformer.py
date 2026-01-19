import pandas as pd
import numpy as np
from scipy.stats import skew, boxcox_normmax
from scipy.special import boxcox1p
from sklearn.impute import KNNImputer
from sklearn.preprocessing import (StandardScaler, MinMaxScaler, RobustScaler, 
                                   MaxAbsScaler, LabelEncoder, OrdinalEncoder, 
                                   PolynomialFeatures)
import category_encoders as ce 

from app.models.recipe import Recipe

def apply_recipe(df: pd.DataFrame, recipe: Recipe) -> pd.DataFrame:
    df_result = df.copy()

    for step in recipe.steps:
        try:
            op = step.operation
            # Safety: handle None params
            params = step.params if step.params else {}

            # --- 1. SYNC PARAM TO COLUMN ---
            col = step.column
            if 'col' in params and params['col']:
                col = params['col']

            # --- 2. VALIDATION ---
            ops_without_col = ["drop_duplicates", "create_interaction"]
            if op not in ops_without_col and col not in df_result.columns:
                # This log is normal for unconfigured steps
                print(f"⚠️ SKIPPING {op}: Column '{col}' not found in data.")
                continue

            # ====================================================
            #  GROUP 1: CLEANING
            # ====================================================
            if op == "drop_column":
                df_result.drop(columns=[col], inplace=True)

            elif op == "drop_duplicates":
                df_result.drop_duplicates(inplace=True)

            elif op == "drop_outliers_zscore":
                if np.issubdtype(df_result[col].dtype, np.number):
                    threshold = float(params.get('threshold', 3))
                    mean = df_result[col].mean()
                    std = df_result[col].std()
                    if std != 0:
                        df_result = df_result[np.abs((df_result[col] - mean) / std) < threshold]

            elif op == "drop_outliers_manual":
                if np.issubdtype(df_result[col].dtype, np.number):
                    val = float(params.get('value', 0))
                    df_result = df_result[df_result[col] < val]

            # ====================================================
            #  GROUP 2: IMPUTATION
            # ====================================================
            elif op == "fill_na_mean":
                if np.issubdtype(df_result[col].dtype, np.number):
                    df_result[col] = df_result[col].fillna(df_result[col].mean())

            elif op == "fill_na_median":
                if np.issubdtype(df_result[col].dtype, np.number):
                    df_result[col] = df_result[col].fillna(df_result[col].median())

            elif op == "fill_na_mode":
                if not df_result[col].mode().empty:
                    df_result[col] = df_result[col].fillna(df_result[col].mode()[0])

            elif op == "fill_na_const":
                val = params.get('value', 0)
                df_result[col] = df_result[col].fillna(val)

            elif op == "fill_na_knn":
                 if np.issubdtype(df_result[col].dtype, np.number):
                    numeric_df = df_result.select_dtypes(include=[np.number])
                    if not numeric_df.empty:
                        imputer = KNNImputer(n_neighbors=5)
                        imputed_data = imputer.fit_transform(numeric_df)
                        if col in numeric_df.columns:
                            col_idx = numeric_df.columns.get_loc(col)
                            df_result[col] = imputed_data[:, col_idx]

            elif op == "fill_na_groupby":
                group_col = params.get('group_col')
                if group_col in df_result.columns:
                    strategy = params.get('strategy', 'median')
                    
                    if strategy == 'mean':
                        mapper = df_result.groupby(group_col)[col].transform('mean')
                    elif strategy == 'median':
                        mapper = df_result.groupby(group_col)[col].transform('median')
                    elif strategy == 'mode':
                        mapper = df_result.groupby(group_col)[col].transform(lambda x: x.mode()[0] if not x.mode().empty else np.nan)
                    
                    df_result[col] = df_result[col].fillna(mapper)

                    # Global Fallback
                    if strategy == 'mean':
                        df_result[col] = df_result[col].fillna(df_result[col].mean())
                    elif strategy == 'median':
                        df_result[col] = df_result[col].fillna(df_result[col].median())
                    elif strategy == 'mode':
                        if not df_result[col].mode().empty:
                            df_result[col] = df_result[col].fillna(df_result[col].mode()[0])

            # ====================================================
            #  GROUP 3: DATES
            # ====================================================
            elif op == "extract_date_parts":
                df_result[col] = pd.to_datetime(df_result[col], errors='coerce')
                df_result[f"{col}_year"] = df_result[col].dt.year
                df_result[f"{col}_month"] = df_result[col].dt.month
                df_result[f"{col}_day"] = df_result[col].dt.day
                df_result[f"{col}_dow"] = df_result[col].dt.dayofweek
                
                if str(params.get('drop_original')) == "True":
                    df_result.drop(columns=[col], inplace=True)

            # ====================================================
            #  GROUP 4: MATH & BINNING
            # ====================================================
            elif op == "bin_numeric":
                if np.issubdtype(df_result[col].dtype, np.number):
                    bins = int(params.get('bins', 5))
                    labels = params.get('labels', False)
                    if str(labels) == "False": labels = False
                    
                    strategy = params.get('strategy', 'quantile')
                    
                    # 1. Run Binning
                    if strategy == 'quantile':
                        res = pd.qcut(df_result[col], q=bins, labels=labels, duplicates='drop')
                    else:
                        res = pd.cut(df_result[col], bins=bins, labels=labels)
                    
                    # 2. Safe Assignment (Fix for .cat error)
                    if hasattr(res, 'cat'):
                        df_result[col] = res.cat.codes
                    else:
                        df_result[col] = res

            elif op == "log_transform":
                if np.issubdtype(df_result[col].dtype, np.number):
                    if (df_result[col] <= 0).any():
                        offset = abs(df_result[col].min()) + 1
                        df_result[col] = np.log1p(df_result[col] + offset)
                    else:
                        df_result[col] = np.log1p(df_result[col])

            elif op == "box_cox_transform":
                if np.issubdtype(df_result[col].dtype, np.number):
                    # Wrap in Try/Except (Fix for Optimizer Error)
                    try:
                        clean_series = df_result[col].dropna()
                        if clean_series.min() <= 0:
                            clean_series = clean_series + abs(clean_series.min()) + 1
                        
                        lambda_val = boxcox_normmax(clean_series)
                        
                        clean_col = df_result[col].fillna(df_result[col].median())
                        if clean_col.min() <= 0:
                            clean_col = clean_col + abs(clean_col.min()) + 1
                            
                        df_result[col] = boxcox1p(clean_col, lambda_val)
                    except Exception as e:
                        print(f"⚠️ Box-Cox failed on {col}, falling back to Log1p. Error: {e}")
                        # Fallback
                        df_result[col] = np.log1p(df_result[col])

            elif op == "create_interaction":
                c1, c2 = params.get('col1'), params.get('col2')
                new_name = params.get('new_name')
                math_op = params.get('math_op', '+')
                
                if c1 in df_result.columns and c2 in df_result.columns:
                    if math_op == '+':
                        df_result[new_name] = df_result[c1] + df_result[c2]
                    elif math_op == '*':
                        df_result[new_name] = df_result[c1] * df_result[c2]
                    elif math_op == '-':
                        df_result[new_name] = df_result[c1] - df_result[c2]
                    elif math_op == '/':
                        df_result[new_name] = df_result[c1] / (df_result[c2].replace(0, np.nan))

            elif op == "polynomial_features":
                if np.issubdtype(df_result[col].dtype, np.number):
                    degree = int(params.get('degree', 2))
                    poly = PolynomialFeatures(degree=degree, include_bias=False)
                    poly_data = poly.fit_transform(df_result[[col]])
                    new_cols = [f"{col}_poly_{i}" for i in range(1, degree + 1)]
                    df_poly = pd.DataFrame(poly_data, columns=new_cols, index=df_result.index)
                    if degree >= 2:
                        df_result = pd.concat([df_result, df_poly.iloc[:, 1:]], axis=1)

            # ====================================================
            #  GROUP 5 & 6: SCALERS & ENCODING
            # ====================================================
            elif op == "standard_scaler":
                if np.issubdtype(df_result[col].dtype, np.number):
                    scaler = StandardScaler()
                    df_result[col] = scaler.fit_transform(df_result[[col]])
            
            elif op == "minmax_scaler":
                if np.issubdtype(df_result[col].dtype, np.number):
                    scaler = MinMaxScaler()
                    df_result[col] = scaler.fit_transform(df_result[[col]])
            
            elif op == "robust_scaler":
                if np.issubdtype(df_result[col].dtype, np.number):
                    scaler = RobustScaler()
                    df_result[col] = scaler.fit_transform(df_result[[col]])
            
            elif op == "maxabs_scaler":
                if np.issubdtype(df_result[col].dtype, np.number):
                    scaler = MaxAbsScaler()
                    df_result[col] = scaler.fit_transform(df_result[[col]])

            elif op == "one_hot_encode":
                df_result = pd.get_dummies(df_result, columns=[col], drop_first=True)
            
            elif op == "label_encode":
                le = LabelEncoder()
                df_result[col] = le.fit_transform(df_result[col].astype(str))
            
            elif op == "ordinal_encode":
                oe = OrdinalEncoder()
                df_result[col] = oe.fit_transform(df_result[[col]])

            elif op == "target_encode":
                target_col = params.get('target_col')
                if target_col in df_result.columns:
                    encoder = ce.TargetEncoder(cols=[col])
                    df_result[col] = encoder.fit_transform(df_result[col], df_result[target_col])

        except Exception as e:
            print(f"⚠️ Transformer Error on {op}: {e}")
            continue

    return df_result