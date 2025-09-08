"""Train a RandomForestRegressor to predict player kills from historical stats.

Steps:
  1. Load player_stats.csv
  2. Clean data (drop missing essential fields, fill others)
  3. One-hot encode categorical columns (agent, map_name)
  4. Train/test split
  5. Train RandomForestRegressor
  6. Evaluate (R^2, MAE) and print metrics
  7. Persist model + feature columns list with joblib to kill_predictor_model.pkl

Usage:
  python train_model.py --csv backend/player_stats.csv --model backend/kill_predictor_model.pkl

"""
from __future__ import annotations

import argparse
import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_absolute_error

DEFAULT_CSV = os.path.join(os.path.dirname(__file__), 'player_stats.csv')
DEFAULT_MODEL = os.path.join(os.path.dirname(__file__), 'kill_predictor_model.pkl')

ESSENTIAL_COLS = ['kills', 'agent', 'map_name', 'acs']


def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    # Standardize column names (lowercase)
    df.columns = [c.lower() for c in df.columns]
    # Expect columns: match_id, match_url, map_name, player_handle, agent, kills, acs
    missing = [c for c in ESSENTIAL_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in CSV: {missing}")
    # Drop rows with missing kills or agent/map
    df = df.dropna(subset=['kills', 'agent', 'map_name'])
    # Fill ACS if missing with median
    if df['acs'].isna().any():
        df['acs'] = df['acs'].fillna(df['acs'].median())
    return df


def prepare_features(df: pd.DataFrame):
    y = df['kills'].astype(int)
    X_base = df[['agent', 'map_name', 'acs']].copy()
    # One-hot encode agent + map
    X_encoded = pd.get_dummies(X_base, columns=['agent', 'map_name'], dummy_na=False)
    feature_names = list(X_encoded.columns)
    return X_encoded, y, feature_names


def train_model(X, y, n_estimators=300, random_state=42):
    model = RandomForestRegressor(
        n_estimators=n_estimators,
        random_state=random_state,
        n_jobs=-1,
        min_samples_leaf=2
    )
    model.fit(X, y)
    return model


def evaluate(model, X_test, y_test):
    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)
    return r2, mae


def save_model(model, feature_names, path: str):
    payload = {
        'model': model,
        'feature_names': feature_names,
        'version': 1,
        'framework': 'sklearn'
    }
    joblib.dump(payload, path)
    print(f"Saved model to {path} (features={len(feature_names)})")


def main():
    ap = argparse.ArgumentParser(description='Train kills prediction model')
    ap.add_argument('--csv', type=str, default=DEFAULT_CSV, help='Path to player_stats.csv')
    ap.add_argument('--model', type=str, default=DEFAULT_MODEL, help='Output model path')
    ap.add_argument('--test-size', type=float, default=0.2, help='Test split fraction')
    ap.add_argument('--estimators', type=int, default=300, help='Random forest trees')
    args = ap.parse_args()

    print(f"Loading data from {args.csv}")
    df = load_data(args.csv)
    print(f"Rows after cleaning: {len(df)}")

    X, y, feature_names = prepare_features(df)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=args.test_size, random_state=42)
    print(f"Train rows: {len(X_train)}, Test rows: {len(X_test)}")

    model = train_model(X_train, y_train, n_estimators=args.estimators)
    r2, mae = evaluate(model, X_test, y_test)
    print(f"Metrics: R2={r2:.4f} MAE={mae:.3f}")

    save_model(model, feature_names, args.model)

if __name__ == '__main__':
    main()
