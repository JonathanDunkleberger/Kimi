"""Model inference API for kill prediction.

Run:
  uvicorn model_api.main:app --reload --port 8010

POST /predict/kills
Body JSON example:
{
  "agent": "Jett",
  "map_name": "Ascent",
  "acs": 245
}

Response:
{
  "prediction": 17.3,
  "inputs": { ... },
  "model_version": 1
}
"""
from __future__ import annotations

import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'kill_predictor_model.pkl')

app = FastAPI(title="Kill Predictor API", version="0.1.0")

_model = None
_feature_names = []

class KillPredictionRequest(BaseModel):
    agent: str
    map_name: str
    acs: float

class KillPredictionResponse(BaseModel):
    prediction: float
    model_version: int
    inputs: dict

@app.on_event("startup")
def load_model():
    global _model, _feature_names, _meta_version
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model file not found at {MODEL_PATH}")
    payload = joblib.load(MODEL_PATH)
    _model = payload['model']
    _feature_names = payload['feature_names']
    _meta_version = payload.get('version', 1)
    print(f"Loaded model with {len(_feature_names)} features (version={_meta_version})")

@app.post('/predict/kills', response_model=KillPredictionResponse)
def predict_kills(req: KillPredictionRequest):
    if _model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    # Build single-row dataframe
    row = {
        'agent': req.agent,
        'map_name': req.map_name,
        'acs': req.acs
    }
    df = pd.DataFrame([row])
    # One-hot encode with same columns
    df_enc = pd.get_dummies(df, columns=['agent', 'map_name'], dummy_na=False)
    for col in _feature_names:
        if col not in df_enc.columns:
            df_enc[col] = 0
    # Extra columns not in training -> drop
    df_enc = df_enc[_feature_names]
    pred = float(_model.predict(df_enc)[0])
    return KillPredictionResponse(prediction=pred, model_version=_meta_version, inputs=row)
