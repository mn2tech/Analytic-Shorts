#!/usr/bin/env python3
"""
Train a sample model on Category, Region, Sales, Units.
Run: py -3 backend/scripts/train_churn_model.py
Requires: pip install scikit-learn joblib pandas
Output: churn_model_4features.joblib (upload this to the Scoring page)
"""
import os
import sys

def main():
    try:
        import pandas as pd
        import joblib
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import OrdinalEncoder
        from sklearn.compose import ColumnTransformer
        from sklearn.pipeline import Pipeline
    except ImportError as e:
        print("Install: pip install scikit-learn joblib pandas")
        return 1

    # Sample training data (4 features: Category, Region, Sales, Units)
    data = [
        {"Category": "Electronics", "Region": "East", "Sales": 8000, "Units": 55},
        {"Category": "Clothing", "Region": "West", "Sales": 6000, "Units": 40},
        {"Category": "Electronics", "Region": "West", "Sales": 9500, "Units": 70},
        {"Category": "Clothing", "Region": "East", "Sales": 4500, "Units": 30},
        {"Category": "Electronics", "Region": "East", "Sales": 7200, "Units": 48},
        {"Category": "Clothing", "Region": "West", "Sales": 5100, "Units": 35},
        {"Category": "Electronics", "Region": "West", "Sales": 8800, "Units": 62},
        {"Category": "Clothing", "Region": "East", "Sales": 3800, "Units": 25},
        {"Category": "Electronics", "Region": "East", "Sales": 9100, "Units": 75},
        {"Category": "Clothing", "Region": "West", "Sales": 4200, "Units": 28},
    ]
    # Mock target: churn=1 if Sales < 5000 or Units < 30
    df = pd.DataFrame(data)
    y = ((df["Sales"] < 5000) | (df["Units"] < 30)).astype(int).values

    preprocessor = ColumnTransformer([
        ("cat", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1), ["Category", "Region"]),
        ("num", "passthrough", ["Sales", "Units"]),
    ])
    pipe = Pipeline([
        ("prep", preprocessor),
        ("clf", LogisticRegression(max_iter=500)),
    ])
    pipe.fit(df, y)

    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "churn_model_4features.joblib")
    joblib.dump(pipe, out_path)
    print(f"Model saved: {out_path}")
    print("Upload this file to the Scoring page, then use input like:")
    print('  [{"Category":"Electronics","Region":"East","Sales":8000,"Units":55}, ...]')
    return 0

if __name__ == "__main__":
    sys.exit(main())
