#!/usr/bin/env python3
"""
Score worker - loads model artifact and scores JSON records.
Supports joblib/pickle (sklearn-like) and ONNX (stub).
"""
import argparse
import json
import sys
import time
import os

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--spec', required=True)
    parser.add_argument('--data', required=True)
    parser.add_argument('--model-path', required=True)
    args = parser.parse_args()
    spec = json.loads(args.spec)
    model_path = args.model_path

    start = time.time()
    with open(args.data) as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("Data must be a list of objects")
    for i, row in enumerate(data):
        if not isinstance(row, dict):
            raise ValueError(f"Row {i} must be a dict")
    bytes_scanned = len(json.dumps(data))

    try:
        import pandas as pd
    except ImportError:
        print(json.dumps({
            "error": "pandas not installed",
            "predictions": [],
            "tokens_used": 1,
            "usage": {"runtime_seconds": 0, "bytes_scanned": bytes_scanned}
        }), file=sys.stderr)
        sys.exit(1)

    df = pd.DataFrame(data)
    options = spec.get('options') or {}
    return_proba = options.get('return_proba', False)

    model_format = spec.get('model_format', 'joblib')
    if not os.path.exists(model_path):
        # Support .pkl if path ends with pkl
        alt = model_path.replace('.joblib', '.pkl') if model_path.endswith('.joblib') else model_path.replace('.pkl', '.joblib')
        if os.path.exists(alt):
            model_path = alt

    try:
        if model_path.endswith('.onnx'):
            print(json.dumps({
                "error": "ONNX support not yet implemented. Use joblib/pickle format.",
                "predictions": [],
                "tokens_used": 1,
                "usage": {"runtime_seconds": 0, "bytes_scanned": bytes_scanned}
            }), file=sys.stderr)
            sys.exit(1)
        joblib = __import__('joblib')
        model = joblib.load(model_path)
    except ImportError:
        try:
            import pickle
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
        except Exception as e:
            print(json.dumps({
                "error": f"Failed to load model: {e}",
                "predictions": [],
                "tokens_used": 1,
                "usage": {"runtime_seconds": 0, "bytes_scanned": bytes_scanned}
            }), file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "error": f"Failed to load model: {e}",
            "predictions": [],
            "tokens_used": 1,
            "usage": {"runtime_seconds": 0, "bytes_scanned": bytes_scanned}
        }), file=sys.stderr)
        sys.exit(1)

    try:
        if hasattr(model, 'predict_proba') and return_proba:
            proba = model.predict_proba(df)
            if proba.ndim == 2 and proba.shape[1] >= 2:
                scores = proba[:, 1].tolist()
            else:
                scores = proba[:, 0].tolist() if proba.ndim == 2 else proba.tolist()
        else:
            preds = model.predict(df)
            scores = [float(p) for p in preds]
    except Exception as e:
        print(json.dumps({
            "error": f"Prediction failed: {e}",
            "predictions": [],
            "tokens_used": 1,
            "usage": {"runtime_seconds": 0, "bytes_scanned": bytes_scanned}
        }), file=sys.stderr)
        sys.exit(1)

    runtime = time.time() - start
    tokens_used = max(1, (len(data) // 5000) + 1)
    predictions = [{"score": s} for s in scores]
    result = {
        "predictions": predictions,
        "tokens_used": tokens_used,
        "usage": {
            "tokens_used": tokens_used,
            "runtime_seconds": round(runtime, 3),
            "bytes_scanned": bytes_scanned
        }
    }
    print(json.dumps(result))

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e), "predictions": [], "tokens_used": 1}), file=sys.stderr)
        sys.exit(1)
