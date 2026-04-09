#!/usr/bin/env python3
import argparse
import json
import math
import os
import sys
from typing import Dict, List, Tuple


TARGET_CANDIDATES = [
    "is_high_risk",
    "fraud_flag",
    "label",
    "target",
    "default_flag",
    "outcome",
]

ID_CANDIDATES = [
    "entity_id",
    "company_id",
    "id",
    "record_id",
    "case_id",
    "account_id",
]


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def safe_float(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return float(v)
    s = str(v).strip()
    if s == "":
        return None
    try:
        cleaned = s.replace(",", "").replace("$", "")
        return float(cleaned)
    except Exception:
        return None


def get_display_id_column(columns: List[str]) -> str:
    lower = {c.lower(): c for c in columns}
    for c in ID_CANDIDATES:
        if c in lower:
            return lower[c]
    for c in columns:
        lc = c.lower()
        if lc.endswith("_id") or lc == "id":
            return c
    return ""


def detect_target_column(columns: List[str]) -> str:
    lower = {c.lower(): c for c in columns}
    for c in TARGET_CANDIDATES:
        if c in lower:
            return lower[c]
    return ""


def choose_mode(df, target_col: str, warnings: List[str]) -> str:
    if not target_col:
        return "unsupervised"
    vals = df[target_col].dropna()
    if vals.empty:
        return "unsupervised"
    distinct = vals.nunique(dropna=True)
    if distinct <= 1:
        warnings.append(f"Target column '{target_col}' has a single value; falling back to unsupervised mode.")
        return "unsupervised"
    non_null_ratio = len(vals) / max(1, len(df))
    if non_null_ratio < 0.6:
        return "hybrid"
    return "supervised"


def risk_level(score: float) -> str:
    if score >= 60:
        return "High"
    if score >= 30:
        return "Medium"
    return "Low"


def make_buckets(scores: List[float]) -> List[Dict]:
    ranges = [(0, 20), (21, 40), (41, 60), (61, 80), (81, 100)]
    out = []
    for lo, hi in ranges:
        cnt = 0
        for s in scores:
            if lo == 0:
                if lo <= s <= hi:
                    cnt += 1
            else:
                if lo <= s <= hi:
                    cnt += 1
        out.append({"bucket": f"{lo}-{hi}", "count": int(cnt)})
    return out


def infer_direction(impact: float) -> str:
    return "positive" if impact >= 0 else "negative"


def _field_num(raw: Dict, *keys: str):
    if not isinstance(raw, dict):
        return None
    for key in keys:
        if key in raw:
            return safe_float(raw.get(key))
    return None


def _fallback_business_explanation(level: str, raw: Dict, anomaly_flag: bool) -> str:
    tax_gap = _field_num(raw, "tax_gap", "taxGap")
    violations = _field_num(raw, "violations_count", "violationsCount")
    inspection = _field_num(raw, "inspection_score", "inspectionScore")
    parts = []

    if level == "Low":
        if inspection is not None and inspection >= 85:
            parts.append("strong inspection score")
        elif inspection is not None and inspection >= 70:
            parts.append("stable inspection score")
        if violations is not None and violations <= 0:
            parts.append("no violations observed")
        elif violations is not None and violations <= 1:
            parts.append("limited violations")
        if tax_gap is not None and tax_gap <= 1000:
            parts.append("minimal tax gap")
        elif tax_gap is not None and tax_gap <= 2500:
            parts.append("manageable tax gap")
        if anomaly_flag is False:
            parts.append("no anomalies detected")
    elif level == "Medium":
        if inspection is not None and inspection < 70:
            parts.append("inspection score needs attention")
        if violations is not None and violations >= 2:
            parts.append("multiple violations observed")
        if tax_gap is not None and tax_gap > 2500:
            parts.append("elevated tax gap")
        if anomaly_flag:
            parts.append("anomalies detected")
    else:  # High
        if inspection is not None and inspection < 65:
            parts.append("low inspection score")
        if violations is not None and violations >= 3:
            parts.append("high violation count")
        if tax_gap is not None and tax_gap > 5000:
            parts.append("significant tax gap")
        if anomaly_flag:
            parts.append("strong anomaly signals")

    if not parts:
        if level == "Low":
            return "Low risk due to stable compliance indicators and no major anomaly signals."
        if level == "Medium":
            return "Medium risk due to mixed compliance signals that require review."
        return "High risk due to multiple adverse compliance and anomaly indicators."

    lead = f"{level} risk due to "
    if len(parts) == 1:
        return lead + parts[0] + "."
    if len(parts) == 2:
        return lead + f"{parts[0]} and {parts[1]}."
    return lead + f"{parts[0]}, {parts[1]}, and {parts[2]}."


def build_explanation(level: str, reasons: List[Dict], raw: Dict = None, anomaly_flag: bool = None) -> str:
    if not reasons:
        return _fallback_business_explanation(level, raw or {}, anomaly_flag if anomaly_flag is not None else False)
    names = [r["feature"] for r in reasons[:3]]
    if len(names) == 1:
        joined = names[0]
    elif len(names) == 2:
        joined = f"{names[0]} and {names[1]}"
    else:
        joined = f"{names[0]}, {names[1]}, and {names[2]}"
    return f"Flagged as {level} risk primarily due to patterns in {joined} relative to peer records."


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        payload = json.load(f)

    records = payload.get("dataset") or []
    options = payload.get("options") or {}
    warnings = []

    if not isinstance(records, list) or len(records) == 0:
        print(json.dumps({"error": "dataset must be a non-empty array of objects"}))
        return

    try:
        import numpy as np
        import pandas as pd
        from sklearn.compose import ColumnTransformer
        from sklearn.ensemble import IsolationForest, RandomForestClassifier
        from sklearn.impute import SimpleImputer
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import OneHotEncoder, StandardScaler
        from scipy.stats import zscore
    except Exception as e:
        print(json.dumps({"error": f"Missing ML dependencies: {str(e)}"}))
        return

    shap_available = True
    try:
        import shap
    except Exception:
        shap_available = False
        warnings.append("SHAP is not installed; using model coefficient fallback for explanations.")

    df = pd.DataFrame(records)
    if df.empty:
        print(json.dumps({"error": "dataset contains no rows after parsing"}))
        return

    max_rows = int(options.get("max_rows", 10000))
    if len(df) > max_rows:
        df = df.head(max_rows).copy()
        warnings.append(f"Dataset truncated to {max_rows} rows for performance.")

    columns = list(df.columns)
    id_col = options.get("id_column") or get_display_id_column(columns)
    if not id_col:
        id_col = "__generated_record_id"
        df[id_col] = [f"row_{i+1}" for i in range(len(df))]

    target_col = options.get("target_column") or detect_target_column(columns)
    mode = choose_mode(df, target_col, warnings)

    # Basic type detection
    numeric_cols = []
    categorical_cols = []
    date_cols = []
    excluded_cols = set([id_col, target_col]) if target_col else set([id_col])

    for c in columns:
        if c in excluded_cols:
            continue
        lc = c.lower()
        if any(tok in lc for tok in ["url", "email"]) or lc.endswith("uuid"):
            continue
        if "date" in lc or lc.endswith("_at"):
            date_cols.append(c)
            continue
        s = df[c]
        cast = pd.to_numeric(s, errors="coerce")
        non_null_ratio = cast.notna().mean()
        if non_null_ratio >= 0.6:
            numeric_cols.append(c)
        else:
            # keep only manageable-cardinality categoricals
            uniq = s.astype("string").nunique(dropna=True)
            if 1 < uniq <= 80:
                categorical_cols.append(c)

    if not numeric_cols and mode in ("unsupervised", "hybrid"):
        warnings.append("No usable numeric columns found for anomaly detection.")

    # Date engineered columns
    for dc in date_cols[:5]:
        parsed = pd.to_datetime(df[dc], errors="coerce", utc=True)
        df[f"{dc}__dayofweek"] = parsed.dt.dayofweek
        df[f"{dc}__month"] = parsed.dt.month
        numeric_cols.extend([f"{dc}__dayofweek", f"{dc}__month"])

    # Missingness indicators and deviation features
    for c in (numeric_cols + categorical_cols)[:120]:
        df[f"{c}__is_missing"] = df[c].isna().astype(int)
        if f"{c}__is_missing" not in numeric_cols:
            numeric_cols.append(f"{c}__is_missing")

    for c in numeric_cols[:40]:
        series = pd.to_numeric(df[c], errors="coerce")
        try:
            zs = zscore(series.fillna(series.median()), nan_policy="omit")
            if hasattr(zs, "__len__"):
                df[f"{c}__z"] = np.nan_to_num(zs, nan=0.0, posinf=0.0, neginf=0.0)
                if f"{c}__z" not in numeric_cols:
                    numeric_cols.append(f"{c}__z")
            pct = series.rank(pct=True)
            df[f"{c}__pct"] = pct.fillna(0.5)
            if f"{c}__pct" not in numeric_cols:
                numeric_cols.append(f"{c}__pct")
        except Exception:
            continue

    # Prior/current pattern feature
    lower_map = {c.lower(): c for c in df.columns}
    if "prior_period_volume" in lower_map and "reported_volume" in lower_map:
        p = pd.to_numeric(df[lower_map["prior_period_volume"]], errors="coerce")
        r = pd.to_numeric(df[lower_map["reported_volume"]], errors="coerce")
        df["reported_vs_prior_pct_change"] = ((r - p) / p.replace(0, np.nan)).replace([np.inf, -np.inf], np.nan).fillna(0.0)
        numeric_cols.append("reported_vs_prior_pct_change")

    feature_numeric = [c for c in numeric_cols if c in df.columns and c not in excluded_cols]
    feature_cat = [c for c in categorical_cols if c in df.columns and c not in excluded_cols]
    # Output contract flag: true only when scoring fell back to rule/neutral behavior.
    fallback_rule_based = False
    # Optional frontend hint: constrain numeric features to user-selected columns.
    # This keeps default behavior unchanged when the option is absent.
    selected_numeric_columns = options.get("selected_numeric_columns")
    if isinstance(selected_numeric_columns, list) and selected_numeric_columns:
        selected_valid = []
        for col in selected_numeric_columns:
            if not isinstance(col, str):
                continue
            if col not in df.columns or col in excluded_cols:
                continue
            # Accept inferred numeric columns immediately.
            if col in feature_numeric:
                selected_valid.append(col)
                continue
            # Or accept columns with at least a small set of convertible numeric values.
            cast = pd.to_numeric(df[col], errors="coerce")
            if int(cast.notna().sum()) >= 2:
                selected_valid.append(col)
        if selected_valid:
            feature_numeric = list(dict.fromkeys(selected_valid))
            warnings.append(
                f"Using user-selected numeric columns: {', '.join(feature_numeric[:20])}"
            )
        else:
            warnings.append(
                "selected_numeric_columns provided no valid numeric columns; falling back to inferred numeric columns."
            )
            fallback_rule_based = True

    features_used = feature_numeric + feature_cat

    if len(features_used) == 0:
        warnings.append("No usable features found; returning neutral risk scores.")
        fallback_rule_based = True
        neutral_scores = [25.0] * len(df)
        out_records = []
        for i, row in df.iterrows():
            s = neutral_scores[i]
            lvl = risk_level(s)
            out_records.append(
                {
                    "record_id": str(row.get(id_col, f"row_{i+1}")),
                    "risk_score": round(float(s), 2),
                    "risk_level": lvl,
                    "anomaly_flag": False,
                    "anomaly_score": None,
                    "top_reasons": [],
                    "explanation_text": build_explanation(lvl, [], row.to_dict(), False),
                    "raw": row.to_dict(),
                }
            )
        result = {
            "summary": {
                "total_records": int(len(df)),
                "high_risk_count": 0,
                "medium_risk_count": 0,
                "low_risk_count": int(len(df)),
                "anomaly_count": 0,
                "model_type": "fallback",
                "analysis_mode": "unsupervised",
                "fallback_rule_based": True,
            },
            "features_used": [],
            "risk_distribution": make_buckets(neutral_scores),
            "records": out_records,
            "charts": {"feature_importance": [], "risk_by_dimension": [], "anomaly_scatter": []},
            "warnings": warnings,
            # Standardized metadata block so all app surfaces can reason about model execution.
            "model_metadata": {
                "engine": "ai_risk_engine",
                "analysis_mode": "unsupervised",
                "model_type": "fallback",
                "feature_count": 0,
                "max_rows": int(max_rows),
                "anomaly_contamination": clamp(float(options.get("anomaly_contamination", 0.08)), 0.01, 0.35),
                "shap_used": False,
            },
            "fallback_rule_based": True,
        }
        print(json.dumps(result, default=str))
        return

    X = df[features_used].copy()
    y = None
    if target_col and target_col in df.columns:
        y_raw = pd.to_numeric(df[target_col], errors="coerce")
        y = y_raw.fillna(0).astype(int).clip(0, 1)

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "num",
                Pipeline(steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]),
                feature_numeric,
            ),
            (
                "cat",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                feature_cat,
            ),
        ],
        remainder="drop",
    )

    model_type = "IsolationForest"
    supervised_prob = None
    anomaly_score = None
    top_reason_map: Dict[int, List[Dict]] = {}
    feature_importance_chart = []
    try:
        Xp = preprocessor.fit_transform(X)
    except Exception:
        # Fallback without cat encoding if onehot fails due library version edge
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", Pipeline(steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), feature_numeric),
            ],
            remainder="drop",
        )
        Xp = preprocessor.fit_transform(X)
        warnings.append("Categorical encoding failed; analysis used numeric features only.")
        feature_cat = []
        features_used = feature_numeric

    # Unsupervised component
    if len(df) >= 20 and Xp.shape[1] > 0:
        iso = IsolationForest(
            n_estimators=120,
            contamination=clamp(float(options.get("anomaly_contamination", 0.08)), 0.01, 0.35),
            random_state=42,
        )
        iso.fit(Xp)
        raw = -iso.score_samples(Xp)  # larger = more anomalous
        rmin, rmax = float(np.min(raw)), float(np.max(raw))
        denom = (rmax - rmin) if (rmax - rmin) != 0 else 1.0
        anomaly_score = (raw - rmin) / denom
    else:
        anomaly_score = np.zeros(len(df))
        warnings.append("Insufficient data for robust anomaly model; anomaly score set to 0.")
        # For unsupervised/hybrid paths this becomes predominantly statistical/rule fallback behavior.
        if mode in ("unsupervised", "hybrid"):
            fallback_rule_based = True

    # Supervised component
    if mode in ("supervised", "hybrid") and y is not None and int(y.nunique()) > 1:
        cls = LogisticRegression(max_iter=250, class_weight="balanced", random_state=42)
        cls.fit(Xp, y)
        supervised_prob = cls.predict_proba(Xp)[:, 1]
        model_type = "LogisticRegression"

        # Optional SHAP
        if shap_available:
            try:
                explainer = shap.Explainer(cls, Xp)
                sv = explainer(Xp)
                values = sv.values
                feature_names = [f"f{i}" for i in range(Xp.shape[1])]
                if hasattr(preprocessor, "get_feature_names_out"):
                    feature_names = list(preprocessor.get_feature_names_out())

                abs_imp = np.abs(values).mean(axis=0)
                rank_idx = np.argsort(abs_imp)[::-1][:20]
                feature_importance_chart = [
                    {"feature": str(feature_names[j]), "importance": float(abs_imp[j])} for j in rank_idx
                ]

                for i in range(values.shape[0]):
                    row_vals = values[i]
                    idx = np.argsort(np.abs(row_vals))[::-1][:3]
                    reasons = []
                    for j in idx:
                        reasons.append(
                            {
                                "feature": str(feature_names[j]),
                                "impact": float(row_vals[j]),
                                "direction": infer_direction(float(row_vals[j])),
                            }
                        )
                    top_reason_map[i] = reasons
            except Exception as e:
                warnings.append(f"SHAP explanation fallback applied: {str(e)}")

        # Coefficient fallback
        if not top_reason_map:
            coef = np.ravel(cls.coef_)
            idx = np.argsort(np.abs(coef))[::-1][:20]
            feature_names = [f"f{i}" for i in range(Xp.shape[1])]
            if hasattr(preprocessor, "get_feature_names_out"):
                feature_names = list(preprocessor.get_feature_names_out())
            feature_importance_chart = [{"feature": str(feature_names[j]), "importance": float(abs(coef[j]))} for j in idx]
            top3 = idx[:3]
            base_reasons = [
                {"feature": str(feature_names[j]), "impact": float(coef[j]), "direction": infer_direction(float(coef[j]))}
                for j in top3
            ]
            for i in range(len(df)):
                top_reason_map[i] = base_reasons

    elif mode == "supervised":
        warnings.append("Target labels were not usable for supervised training; switched to unsupervised mode.")
        mode = "unsupervised"

    # Hybrid / unsupervised score fusion
    if mode == "supervised" and supervised_prob is not None:
        risk_raw = supervised_prob
    elif mode == "hybrid" and supervised_prob is not None:
        risk_raw = (0.65 * supervised_prob) + (0.35 * anomaly_score)
    else:
        # proxy risk from anomaly + z-extreme behavior
        z_cols = [c for c in df.columns if c.endswith("__z")]
        if z_cols:
            z_mat = np.abs(df[z_cols].to_numpy(dtype=float))
            z_signal = np.nanmean(np.clip(z_mat / 4.0, 0.0, 1.0), axis=1)
        else:
            z_signal = np.zeros(len(df))
        risk_raw = (0.7 * anomaly_score) + (0.3 * z_signal)

    risk_score = np.clip(risk_raw * 100.0, 0, 100)
    anomaly_threshold = float(options.get("anomaly_threshold", 0.7))

    # Risk by dimension chart
    risk_by_dimension = []
    for cand in ["region", "product_type", "type", "category"]:
        hit = None
        for c in df.columns:
            if cand in c.lower():
                hit = c
                break
        if hit:
            grouped = (
                pd.DataFrame({"k": df[hit].astype("string").fillna("(missing)"), "risk": risk_score})
                .groupby("k", dropna=False)["risk"]
                .mean()
                .sort_values(ascending=False)
                .head(20)
            )
            risk_by_dimension = [{"dimension": str(k), "avg_risk": float(v)} for k, v in grouped.items()]
            break

    # Anomaly scatter chart
    anomaly_scatter = []
    for i in range(len(df)):
        anomaly_scatter.append(
            {
                "x": float(i),
                "risk_score": float(risk_score[i]),
                "anomaly_score": float(anomaly_score[i]) if anomaly_score is not None else 0.0,
            }
        )

    out_records = []
    for i, row in df.iterrows():
        rs = float(risk_score[i])
        lvl = risk_level(rs)
        reasons = top_reason_map.get(i, [])
        row_dict = row.to_dict()
        row_anomaly_flag = bool(float(anomaly_score[i]) >= anomaly_threshold) if anomaly_score is not None else False
        out_records.append(
            {
                "record_id": str(row.get(id_col, f"row_{i+1}")),
                "risk_score": round(rs, 2),
                "risk_level": lvl,
                "anomaly_flag": row_anomaly_flag,
                "anomaly_score": round(float(anomaly_score[i]), 4) if anomaly_score is not None else None,
                "top_reasons": reasons,
                "explanation_text": build_explanation(lvl, reasons, row_dict, row_anomaly_flag),
                "raw": row_dict,
            }
        )

    high = sum(1 for r in out_records if r["risk_level"] == "High")
    med = sum(1 for r in out_records if r["risk_level"] == "Medium")
    low = sum(1 for r in out_records if r["risk_level"] == "Low")
    anom = sum(1 for r in out_records if r["anomaly_flag"])

    result = {
        "summary": {
            "total_records": int(len(out_records)),
            "high_risk_count": int(high),
            "medium_risk_count": int(med),
            "low_risk_count": int(low),
            "anomaly_count": int(anom),
            "model_type": model_type,
            "analysis_mode": mode,
            "fallback_rule_based": bool(fallback_rule_based),
        },
        "features_used": [str(c) for c in features_used[:250]],
        "risk_distribution": make_buckets([float(x) for x in risk_score.tolist()]),
        "records": out_records,
        "charts": {
            "feature_importance": feature_importance_chart[:25],
            "risk_by_dimension": risk_by_dimension,
            "anomaly_scatter": anomaly_scatter[:5000],
        },
        "warnings": warnings,
        # Standardized metadata for consumers that need model/runtime context.
        "model_metadata": {
            "engine": "ai_risk_engine",
            "analysis_mode": mode,
            "model_type": model_type,
            "feature_count": int(len(features_used)),
            "max_rows": int(max_rows),
            "anomaly_contamination": clamp(float(options.get("anomaly_contamination", 0.08)), 0.01, 0.35),
            "shap_used": bool(shap_available and len(feature_importance_chart) > 0 and model_type == "LogisticRegression"),
        },
        "fallback_rule_based": bool(fallback_rule_based),
    }
    print(json.dumps(result, default=str))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": f"AI risk engine failed: {str(e)}"}))
        sys.exit(1)
