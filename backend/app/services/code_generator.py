from app.models.recipe import Recipe

def get_requirements() -> list[str]:
    # Only data processing libraries
    return [
        "pandas", "numpy", "scipy", "scikit-learn", "category_encoders"
    ]

def generate_pipeline_code(recipe: Recipe) -> str:
    # --- 1. GLOBAL IMPORTS (CLEANED) ---
    imports = {
        "import numpy as np",
        "import pandas as pd",
        "import warnings",
        "from scipy.stats import skew, boxcox_normmax",
        "from scipy.special import boxcox1p",
        "from sklearn.preprocessing import (StandardScaler, MinMaxScaler, RobustScaler, \n    MaxAbsScaler, OneHotEncoder, OrdinalEncoder, PolynomialFeatures)",
        "from sklearn.impute import SimpleImputer, KNNImputer",
        "from sklearn.preprocessing import LabelEncoder",
        "import category_encoders as ce",
        "warnings.filterwarnings('ignore')"
    }
    
    # --- SECTIONS ---
    cleaning_code = []     
    feature_eng_code = []  
    encoding_code = []     
    
    # --- PARSER LOOP ---
    for step in recipe.steps:
        op = step.operation
        col = step.column
        params = step.params if step.params else {}
        
        # ====================================================
        #  GROUP 1: CLEANING
        # ====================================================
        if op == "drop_column":
            cleaning_code.append(f"df.drop(['{col}'], axis=1, inplace=True)")
            
        elif op == "drop_duplicates":
            cleaning_code.append("df.drop_duplicates(inplace=True)")
            
        elif op == "drop_outliers_manual":
            val = params.get('value')
            cleaning_code.append(f"df = df[df['{col}'] < {val}]")

        elif op == "drop_outliers_zscore":
            threshold = params.get('threshold', 3)
            cleaning_code.append(f"# Drop Z-Score outliers in {col}")
            cleaning_code.append(f"df = df[np.abs((df['{col}'] - df['{col}'].mean())/df['{col}'].std()) < {threshold}]")

        # ====================================================
        #  GROUP 2: IMPUTATION 
        # ====================================================
        elif op == "fill_na_mode":
            cleaning_code.append(f"df['{col}'] = df['{col}'].fillna(df['{col}'].mode()[0])")
            
        elif op == "fill_na_mean":
            cleaning_code.append(f"df['{col}'] = df['{col}'].fillna(df['{col}'].mean())")

        elif op == "fill_na_median":
            cleaning_code.append(f"df['{col}'] = df['{col}'].fillna(df['{col}'].median())")

        elif op == "fill_na_const":
            val = params.get('value', 0)
            val_str = f"'{val}'" if isinstance(val, str) else val
            cleaning_code.append(f"df['{col}'] = df['{col}'].fillna({val_str})")
            
        elif op == "fill_na_groupby":
            group_col = params.get('group_col')
            strategy = params.get('strategy', 'median')
            cleaning_code.append(f"# Fill {col} by {group_col} {strategy}")
            cleaning_code.append(f"df['{col}'] = df.groupby('{group_col}')['{col}'].transform(lambda x: x.fillna(x.{strategy}()))")

        elif op == "fill_na_knn":
            cleaning_code.append(f"# KNN Imputation for {col}")
            cleaning_code.append(f"imputer = KNNImputer(n_neighbors=5)")
            cleaning_code.append(f"df['{col}'] = imputer.fit_transform(df[['{col}']])")

        # ====================================================
        #  GROUP 3: DATES (ESSENTIAL)
        # ====================================================
        elif op == "extract_date_parts":
            feature_eng_code.append(f"# Extract Date Parts for {col}")
            feature_eng_code.append(f"df['{col}'] = pd.to_datetime(df['{col}'], errors='coerce')")
            feature_eng_code.append(f"df['{col}_year'] = df['{col}'].dt.year")
            feature_eng_code.append(f"df['{col}_month'] = df['{col}'].dt.month")
            feature_eng_code.append(f"df['{col}_day'] = df['{col}'].dt.day")
            feature_eng_code.append(f"df['{col}_dow'] = df['{col}'].dt.dayofweek")
            if params.get('drop_original', True):
                feature_eng_code.append(f"df.drop(['{col}'], axis=1, inplace=True)")

        # ====================================================
        #  GROUP 4: MATH & TRANSFORM
        # ====================================================
        elif op == "bin_numeric":
            bins = params.get('bins', 5)
            labels = params.get('labels', False)
            strategy = params.get('strategy', 'quantile')
            feature_eng_code.append(f"# Binning {col}")
            if strategy == 'quantile':
                feature_eng_code.append(f"df['{col}'] = pd.qcut(df['{col}'], q={bins}, labels={labels}, duplicates='drop').cat.codes")
            else:
                feature_eng_code.append(f"df['{col}'] = pd.cut(df['{col}'], bins={bins}, labels={labels}).cat.codes")

        elif op == "log_transform":
            feature_eng_code.append(f"df['{col}'] = np.log1p(df['{col}'])")
            
        elif op == "box_cox_transform":
            thresh = params.get('threshold', 0.5)
            block = f"""
# Skew correction for {col}
skewness = skew(df['{col}'].dropna())
if abs(skewness) > {thresh}:
    clean_col = df['{col}'].fillna(0)
    min_val = clean_col.min()
    if min_val <= 0:
        df['{col}'] += (abs(min_val) + 1)
    lam = boxcox_normmax(df['{col}'].fillna(df['{col}'].mean()))
    df['{col}'] = boxcox1p(df['{col}'], lam)
"""
            feature_eng_code.append(block)

        elif op == "create_interaction":
            c1, c2 = params.get('col1'), params.get('col2')
            op_sym = params.get('math_op', '+')
            new_name = params.get('new_name')
            feature_eng_code.append(f"df['{new_name}'] = df['{c1}'] {op_sym} df['{c2}']")

        elif op == "polynomial_features":
            degree = params.get('degree', 2)
            feature_eng_code.append(f"# Poly features for {col}")
            feature_eng_code.append(f"poly = PolynomialFeatures(degree={degree}, include_bias=False)")
            feature_eng_code.append(f"poly_data = poly.fit_transform(df[['{col}']])")
            feature_eng_code.append(f"new_cols = [f'{col}_poly_{{i}}' for i in range(1, poly_data.shape[1] + 1)]")
            feature_eng_code.append(f"df = pd.concat([df, pd.DataFrame(poly_data, columns=new_cols, index=df.index)], axis=1)")

        # ====================================================
        #  GROUP 5: SCALERS & ENCODING
        # ====================================================
        elif op in ["standard_scaler", "minmax_scaler", "robust_scaler", "maxabs_scaler"]:
            mapper = {
                "standard_scaler": "StandardScaler",
                "minmax_scaler": "MinMaxScaler",
                "robust_scaler": "RobustScaler",
                "maxabs_scaler": "MaxAbsScaler"
            }
            feature_eng_code.append(f"df['{col}'] = {mapper[op]}().fit_transform(df[['{col}']])")

        elif op == "one_hot_encode":
            encoding_code.append(f"df = pd.get_dummies(df, columns=['{col}'], drop_first=True)")

        elif op == "label_encode":
            encoding_code.append(f"df['{col}'] = LabelEncoder().fit_transform(df['{col}'].astype(str))")

        elif op == "ordinal_encode":
            encoding_code.append(f"df['{col}'] = OrdinalEncoder().fit_transform(df[['{col}']])")

        elif op == "target_encode":
            target_c = params.get('target_col', 'SalePrice')
            encoding_code.append(f"encoder = ce.TargetEncoder(cols=['{col}'])")
            encoding_code.append(f"df['{col}'] = encoder.fit_transform(df['{col}'], df['{target_c}'])")

    # --- 3. ASSEMBLE SCRIPT ---
    script = []
    
    script.append("# ==========================================")
    script.append("# GENERATED PREPROCESSING PIPELINE")
    script.append("# ==========================================")
    script.append("\n".join(sorted(list(imports))))
    
    script.append("\n# --- 1. LOAD DATA ---")
    script.append("print('Loading data...')")
    script.append("# TODO: Replace with your actual file path")
    script.append("df = pd.read_csv('dataset.csv')") 
    
    if cleaning_code:
        script.append("\n# --- 2. CLEANING ---")
        script.append("\n".join(cleaning_code))
        
    if feature_eng_code:
        script.append("\n# --- 3. FEATURE ENGINEERING ---")
        script.append("\n".join(feature_eng_code))
        
    if encoding_code:
        script.append("\n# --- 4. ENCODING ---")
        script.append("\n".join(encoding_code))
        
    script.append("\n# --- 5. EXPORT / FINISH ---")
    script.append("# Auto-dummy any remaining categories (Safety Step)")
    script.append("df = pd.get_dummies(df)")
    script.append("\nprint(f'Preprocessing complete. Final shape: {df.shape}')")
    script.append("# Save the processed file")
    script.append("df.to_csv('processed_data.csv', index=False)")
    script.append("print('Saved to processed_data.csv')")
        
    return "\n".join(script)