from app.models.recipe import Recipe

def get_requirements() -> list[str]:
    return [
        "pandas", "numpy", "scipy", "scikit-learn", 
        "xgboost", "lightgbm", "catboost", "mlxtend", "category_encoders"
    ]

def generate_pipeline_code(recipe: Recipe) -> str:
    # --- 1. GLOBAL IMPORTS (VERIFIED) ---
    imports = {
        "import numpy as np",
        "import pandas as pd",
        "import warnings",
        "from scipy.stats import skew, boxcox_normmax",
        "from scipy.special import boxcox1p",
        "from sklearn.pipeline import make_pipeline, Pipeline",
        "from sklearn.compose import ColumnTransformer",
        "from sklearn.preprocessing import (StandardScaler, MinMaxScaler, RobustScaler, \n    MaxAbsScaler, OneHotEncoder, OrdinalEncoder, FunctionTransformer, PolynomialFeatures)",
        "from sklearn.impute import SimpleImputer, KNNImputer",
        "from sklearn.model_selection import KFold, cross_val_score, train_test_split",
        "from sklearn.metrics import mean_squared_error, r2_score, accuracy_score",
        "from sklearn.linear_model import RidgeCV, LassoCV, ElasticNetCV, LogisticRegression",
        # FIX: Removed StackingCVRegressor from sklearn (It belongs to mlxtend)
        "from sklearn.ensemble import (RandomForestRegressor, GradientBoostingRegressor, \n    ExtraTreesRegressor, VotingRegressor, AdaBoostRegressor)", 
        "from sklearn.svm import SVR, SVC",
        "from xgboost import XGBRegressor, XGBClassifier",
        "from lightgbm import LGBMRegressor, LGBMClassifier",
        # FIX: Explicit import for the Stacking Regressor
        "from mlxtend.regressor import StackingCVRegressor", 
        "import category_encoders as ce",
        "warnings.filterwarnings('ignore')"
    }
    
    # --- SECTIONS ---
    cleaning_code = []     
    feature_eng_code = []  
    encoding_code = []     
    modeling_code = []     
    
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
            # e.g. Fill LotFrontage by Neighborhood median
            group_col = params.get('group_col')
            strategy = params.get('strategy', 'median')
            cleaning_code.append(f"# Fill {col} by {group_col} {strategy}")
            cleaning_code.append(f"df['{col}'] = df.groupby('{group_col}')['{col}'].transform(lambda x: x.fillna(x.{strategy}()))")

        elif op == "fill_na_knn":
            cleaning_code.append(f"# KNN Imputation for {col}")
            cleaning_code.append(f"imputer = KNNImputer(n_neighbors=5)")
            cleaning_code.append(f"df['{col}'] = imputer.fit_transform(df[['{col}']])")

        # ====================================================
        #  GROUP 3: TRANSFORMATION
        # ====================================================
        elif op == "log_transform":
            feature_eng_code.append(f"df['{col}'] = np.log1p(df['{col}'])")
            
        elif op == "box_cox_transform":
            thresh = params.get('threshold', 0.5)
            block = f"""
# Skew correction for {col}
skewness = skew(df['{col}'].dropna())
if abs(skewness) > {thresh}:
    lam = boxcox_normmax(df['{col}'] + 1)
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
            feature_eng_code.append(f"df = pd.concat([df, pd.DataFrame(poly_data, index=df.index).add_prefix('{col}_poly_')], axis=1)")

        # ====================================================
        #  GROUP 4: SCALERS
        # ====================================================
        elif op == "standard_scaler":
            feature_eng_code.append(f"df['{col}'] = StandardScaler().fit_transform(df[['{col}']])")
        elif op == "minmax_scaler":
            feature_eng_code.append(f"df['{col}'] = MinMaxScaler().fit_transform(df[['{col}']])")
        elif op == "robust_scaler":
            feature_eng_code.append(f"df['{col}'] = RobustScaler().fit_transform(df[['{col}']])")

        # ====================================================
        #  GROUP 5: ENCODING
        # ====================================================
        elif op == "get_dummies" or op == "one_hot_encode":
            if col == "ALL":
                encoding_code.append(f"# Auto-dummy all remaining categorical features")
                encoding_code.append("df = pd.get_dummies(df)")
            else:
                encoding_code.append(f"df = pd.get_dummies(df, columns=['{col}'], drop_first=True)")

        elif op == "label_encode":
            encoding_code.append(f"df['{col}'] = LabelEncoder().fit_transform(df['{col}'].astype(str))")

        elif op == "target_encode":
            target_c = params.get('target_col', 'SalePrice')
            encoding_code.append(f"encoder = ce.TargetEncoder(cols=['{col}'])")
            encoding_code.append(f"df['{col}'] = encoder.fit_transform(df['{col}'], df['{target_c}'])")

        # ====================================================
        #  GROUP 6: MODELS
        # ====================================================
        elif op == "stacking_ensemble":
            modeling_code.append("""
# --- STACKING ENSEMBLE ---
kf = KFold(n_splits=10, shuffle=True, random_state=42)

# Base Learners
ridge = make_pipeline(RobustScaler(), RidgeCV(cv=kf))
lasso = make_pipeline(RobustScaler(), LassoCV(cv=kf))
elastic = make_pipeline(RobustScaler(), ElasticNetCV(cv=kf))
gbr = GradientBoostingRegressor(n_estimators=3000, learning_rate=0.05, max_depth=4, 
                                max_features='sqrt', loss='huber', random_state=42)
xgb = XGBRegressor(n_estimators=3000, learning_rate=0.01, max_depth=3, 
                   objective='reg:squarederror', n_jobs=-1)
lgbm = LGBMRegressor(objective='regression', n_estimators=5000, learning_rate=0.01)

# Meta Learner (Using mlxtend StackingCVRegressor)
stack = StackingCVRegressor(regressors=(ridge, lasso, elastic, gbr, xgb, lgbm),
                            meta_regressor=xgb,
                            use_features_in_secondary=True)

print("Fitting Stacking Ensemble... (This may take a while)")
stack.fit(np.array(X), np.array(y))
preds = stack.predict(np.array(X))
""")

        elif op == "voting_ensemble":
             modeling_code.append("""
# --- VOTING REGRESSOR ---
r1 = GradientBoostingRegressor(random_state=1)
r2 = RandomForestRegressor(random_state=1)
r3 = XGBRegressor()
vote = VotingRegressor([('gb', r1), ('rf', r2), ('xgb', r3)])
vote.fit(X, y)
preds = vote.predict(X)
""")

        elif op == "xgboost_model":
            modeling_code.append("model = XGBRegressor(n_estimators=1000, learning_rate=0.05)")
            modeling_code.append("model.fit(X, y)")
            modeling_code.append("preds = model.predict(X)")

    # --- 3. ASSEMBLE SCRIPT ---
    script = []
    
    script.append("# ==========================================")
    script.append("# GENERATED PIPELINE CODE")
    script.append("# ==========================================")
    script.append("\n".join(sorted(list(imports))))
    
    script.append("\n# --- 1. LOAD DATA ---")
    script.append("print('Loading data...')")
    script.append("df = pd.read_csv('dataset.csv') # CHANGE THIS PATH")
    script.append("target_col = 'SalePrice' if 'SalePrice' in df.columns else 'target'")
    
    if cleaning_code:
        script.append("\n# --- 2. CLEANING & IMPUTATION ---")
        script.append("\n".join(cleaning_code))
        
    if feature_eng_code:
        script.append("\n# --- 3. FEATURE ENGINEERING ---")
        script.append("\n".join(feature_eng_code))
        
    if encoding_code:
        script.append("\n# --- 4. ENCODING ---")
        script.append("\n".join(encoding_code))
        
    script.append("\n# --- 5. PREPARE X and y ---")
    script.append("if target_col in df.columns:")
    script.append("    y = df[target_col]")
    script.append("    X = df.drop([target_col], axis=1)")
    # Default fallback if user forgot explicit encoding step
    script.append("    # Auto-dummy any remaining categories if needed")
    script.append("    X = pd.get_dummies(X)")
    script.append("else:")
    script.append("    X = pd.get_dummies(df)")
    
    if modeling_code:
        script.append("\n# --- 6. MODELING ---")
        script.append("\n".join(modeling_code))
        script.append("\nprint('Pipeline Finished.')")
        
    return "\n".join(script)