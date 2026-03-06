#!/usr/bin/env python3
"""Create a tiny sklearn model for testing the Scoring UI. Run: python scripts/create_test_model.py"""
from sklearn.linear_model import LogisticRegression
import joblib
import os

# Train minimal model: 3 samples, 2 features
X = [[1, 2], [3, 4], [5, 6]]
y = [0, 1, 0]
model = LogisticRegression()
model.fit(X, y)

out_dir = os.path.join(os.path.dirname(__file__), '..', 'backend', 'test_fixtures')
os.makedirs(out_dir, exist_ok=True)
path = os.path.join(out_dir, 'test_model.joblib')
joblib.dump(model, path)
print(f"Saved: {path}")
print("Use this file in the Scoring UI: Upload Model -> Choose test_model.joblib -> Upload")
