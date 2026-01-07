import pandas as pd
import numpy as np
from scipy.stats import skew, boxcox_normmax
from scipy.special import boxcox1p
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.preprocessing import (StandardScaler, MinMaxScaler, RobustScaler, 
                                   MaxAbsScaler, OneHotEncoder, LabelEncoder, 
                                   OrdinalEncoder, PolynomialFeatures)
import category_encoders as ce 

from app.models.recipe import Recipe

def apply_recipe(df: pd.DataFrame, recipe: Recipe) -> pd.DataFrame:
    """
    Executes REAL data operations. Skips modeling steps.
    """
    df_result = df.copy()

    for step in recipe.steps:
        try:
            op = step.operation
            col = step.column
            params = step.params if step.params else {}

            # --- SKIP CHECK ---
            # If it's a Model step, we do nothing to the data frame.
            # The "Code Generator" will handle writing the model code later.
            if op in ["stacking_ensemble", "voting_ensemble", "xgboost_model", 
                      "lightgbm_model", "catboost_model", "random_forest", "linear_regression"]:
                continue

            # --- COLUMN EXISTENCE CHECK ---
            # We skip if column is missing (except for interactions which create new ones)
            if op != "create_interaction" and col not in df_result.columns:
                continue

            # ====================================================
            #  GROUP 1: CLEANING & DROPPING
            # ====================================================
            if op == "drop_column":
                df_result.drop(columns=[col], inplace=True)

            elif op == "drop_duplicates":
                df_result.drop_duplicates(inplace=True)

            elif op == "drop_outliers_zscore":
                if np.issubdtype(df_result[col].dtype, np.number):
                    threshold = params.get('threshold', 3)
                    mean = df_result[col].mean()
                    std = df_result[col].std()
                    if std != 0:
                        df_result = df_result[np.abs((df_result[col] - mean) / std) < threshold]

            elif op == "drop_outliers_manual":
                if np.issubdtype(df_result[col].dtype, np.number):
                    val = params.get('value')
                    df_result = df_result[df_result[col] < val]

            # ====================================================
            #  GROUP 2: IMPUTATION (REAL EXECUTION)
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
                    imputer = KNNImputer(n_neighbors=5)
                    # Reshape needed for sklearn 2D array expectation
                    data_reshaped = df_result[[col]].values
                    df_result[col] = imputer.fit_transform(data_reshaped).ravel()

            elif op == "fill_na_groupby":
                group_col = params.get('group_col')
                if group_col in df_result.columns:
                    strategy = params.get('strategy', 'median')
                    if strategy == 'mean':
                        df_result[col] = df_result.groupby(group_col)[col].transform(lambda x: x.fillna(x.mean()))
                    elif strategy == 'median':
                        df_result[col] = df_result.groupby(group_col)[col].transform(lambda x: x.fillna(x.median()))
                    elif strategy == 'mode':
                        df_result[col] = df_result.groupby(group_col)[col].transform(lambda x: x.fillna(x.mode()[0] if not x.mode().empty else x))

            # ====================================================
            #  GROUP 3: MATH & TRANSFORM (REAL EXECUTION)
            # ====================================================
            elif op == "log_transform":
                if np.issubdtype(df_result[col].dtype, np.number):
                    df_result[col] = np.log1p(df_result[col])

            elif op == "box_cox_transform":
                if np.issubdtype(df_result[col].dtype, np.number):
                    clean_series = df_result[col].dropna()
                    skewness = skew(clean_series)
                    threshold = params.get('threshold', 0.5)
                    
                    if abs(skewness) > threshold:
                        clean_col = df_result[col].fillna(0) + 1 
                        clean_col = clean_col.clip(lower=1) # Ensure positive
                        lambda_val = boxcox_normmax(clean_col)
                        df_result[col] = boxcox1p(df_result[col], lambda_val)

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
                    degree = params.get('degree', 2)
                    poly = PolynomialFeatures(degree=degree, include_bias=False)
                    poly_data = poly.fit_transform(df_result[[col]])
                    # Add new columns (e.g. Age^2)
                    new_cols = [f"{col}_poly_{i}" for i in range(1, poly_data.shape[1] + 1)]
                    df_poly = pd.DataFrame(poly_data, columns=new_cols, index=df_result.index)
                    # We drop the original linear col to replace with poly features or keep both? 
                    # Usually keep both or just add. Let's add.
                    df_result = pd.concat([df_result, df_poly.iloc[:, 1:]], axis=1) # Skip index 0 if it's the original

            # ====================================================
            #  GROUP 4: SCALERS (REAL EXECUTION)
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

            # ====================================================
            #  GROUP 5: ENCODING (REAL EXECUTION)
            # ====================================================
            elif op == "one_hot_encode":
                # Real Dummies. This adds columns to the table.
                df_result = pd.get_dummies(df_result, columns=[col], drop_first=True)

            elif op == "label_encode":
                le = LabelEncoder()
                df_result[col] = le.fit_transform(df_result[col].astype(str))

            elif op == "ordinal_encode":
                oe = OrdinalEncoder()
                # Scikit needs 2D
                df_result[col] = oe.fit_transform(df_result[[col]])

            elif op == "target_encode":
                # Calculates mean of target for each category
                target_col = params.get('target_col', 'SalePrice')
                if target_col in df_result.columns:
                    encoder = ce.TargetEncoder(cols=[col])
                    # Fit on the sample data we have
                    df_result[col] = encoder.fit_transform(df_result[col], df_result[target_col])

        except Exception as e:
            # We log error but don't crash the table. 
            # The user will see the column didn't change.
            print(f"⚠️ Transformer Error on {op} for {col}: {e}")
            continue

    return df_result