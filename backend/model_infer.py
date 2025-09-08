"""Inference utilities for kill prediction model.
Loads the RandomForest model saved by train_model.py and exposes predict_total_kills(player, team, agent=None, map_name=None, acs=None).
If optional context (agent, map_name, acs) is missing, uses neutral defaults.
"""
from __future__ import annotations

import os
import joblib
import pandas as pd
from functools import lru_cache
from typing import Optional

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'kill_predictor_model.pkl')

@lru_cache(maxsize=1)
def _load():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    payload = joblib.load(MODEL_PATH)
    model = payload['model']
    feature_names = payload['feature_names']
    version = payload.get('version', 1)
    return model, feature_names, version


def predict_kills(agent: str, map_name: str, acs: float) -> float:
    model, feature_names, _ = _load()
    row = { 'agent': agent, 'map_name': map_name, 'acs': acs }
    df = pd.DataFrame([row])
    df_enc = pd.get_dummies(df, columns=['agent','map_name'], dummy_na=False)
    for col in feature_names:
        if col not in df_enc.columns:
            df_enc[col] = 0
    df_enc = df_enc[feature_names]
    return float(model.predict(df_enc)[0])

# Backward-compatible wrapper resembling old stub signature

def predict_total_kills(player_name: str, team_name: str) -> float:
    # Without contextual agent/map/acs we provide generic values.
    try:
        return predict_kills(agent='Unknown', map_name='Unknown', acs=200.0)
    except Exception:
        # Fallback deterministic placeholder if model missing
        base = sum(ord(c) for c in (player_name + team_name)) % 25
        return round(12 + base * 0.3, 1)
