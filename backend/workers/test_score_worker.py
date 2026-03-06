#!/usr/bin/env python3
"""
Minimal test for score worker with a tiny sklearn model.
Run: python test_score_worker.py
Requires: pip install scikit-learn joblib pandas
"""
import json
import os
import subprocess
import sys
import tempfile

def main():
    try:
        from sklearn.linear_model import LogisticRegression
        import joblib
        import pandas as pd
    except ImportError as e:
        print("Skip: sklearn/joblib/pandas not installed:", e)
        return 0

    # Train trivial model
    X = [[1, 2], [3, 4], [5, 6]]
    y = [0, 1, 0]
    model = LogisticRegression()
    model.fit(X, y)

    with tempfile.TemporaryDirectory() as tmp:
        model_path = os.path.join(tmp, "model.joblib")
        joblib.dump(model, model_path)
        data_path = os.path.join(tmp, "data.json")
        data = [{"x1": 1, "x2": 2}, {"x1": 3, "x2": 4}, {"x1": 5, "x2": 6}]
        with open(data_path, "w") as f:
            json.dump(data, f)
        spec_path = os.path.join(tmp, "spec.json")
        spec = {"task": "score", "options": {"return_proba": False}}
        with open(spec_path, "w") as f:
            json.dump(spec, f)

        worker = os.path.join(os.path.dirname(__file__), "score_worker.py")
        result = subprocess.run(
            [sys.executable, worker, "--spec", json.dumps(spec), "--data", data_path, "--model-path", model_path],
            capture_output=True, text=True, timeout=30
        )

        if result.returncode != 0:
            print("Worker failed:", result.stderr)
            return 1

        out = json.loads(result.stdout)
        predictions = out.get("predictions", [])
        tokens_used = out.get("tokens_used", 0)

        assert len(predictions) == 3, f"Expected 3 predictions, got {len(predictions)}"
        assert tokens_used >= 1, f"tokens_used must be >= 1, got {tokens_used}"
        for i, p in enumerate(predictions):
            assert "score" in p, f"Prediction {i} missing 'score'"
            assert isinstance(p["score"], (int, float)), f"score must be number"

        print("OK: score_worker returned", len(predictions), "predictions, tokens_used =", tokens_used)
    return 0

if __name__ == "__main__":
    sys.exit(main())
