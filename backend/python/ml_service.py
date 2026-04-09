from fastapi import FastAPI, HTTPException


app = FastAPI(title="NM2 ML Service (Deprecated)", version="1.1.0")


@app.post("/ml/anomaly-detect")
def anomaly_detect():
    """
    Deprecated endpoint.
    Canonical risk/anomaly scoring now lives at backend /api/ai/risk-analysis.
    """
    raise HTTPException(
        status_code=410,
        detail="Deprecated endpoint. Use backend canonical endpoint: POST /api/ai/risk-analysis",
    )
