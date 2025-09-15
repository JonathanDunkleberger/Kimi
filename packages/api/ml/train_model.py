"""Train a model on consolidated Valorant data.

Usage examples:
  python packages/api/ml/train_model.py
  python packages/api/ml/train_model.py --target kills_per_round --model hgb --limit-year 2023,2024 --min-rounds 40

Defaults:
  target: kills_per_round (computed as kills / rounds_played)
  model: hgb (HistGradientBoostingRegressor)

Artifacts:
  models/model_{target}_{timestamp}.joblib
  models/metrics_{target}_{timestamp}.json
  models/latest_{target}.joblib (copy of latest)
"""
from __future__ import annotations
import argparse
import json
import math
import os
import sys
import time
from pathlib import Path
from datetime import datetime
import platform
import subprocess

import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
import joblib

ROOT = Path(__file__).parent
DATA_PATH = ROOT / 'data' / 'training_data.csv'
MODELS_DIR = ROOT / 'models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

NUMERIC_CANDIDATES = [
    'rating','acs','adr','kpr','apr','fkpr','fdpr',
    'kills','deaths','assists','first_kills','first_deaths',
    'kdr','kad','fk_fd_diff','hs_rate','clutch_rate','rounds_played'
]

DEFAULT_TARGET = 'kills_per_round'


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument('--target', default=DEFAULT_TARGET, help='Target column or derived metric')
    p.add_argument('--model', default='hgb', choices=['hgb','rf'])
    p.add_argument('--limit-year', default=None, help='Comma separated list of years to include (e.g. 2023,2024)')
    p.add_argument('--min-rounds', type=int, default=20, help='Minimum rounds_played filter')
    p.add_argument('--test-size', type=float, default=0.2)
    p.add_argument('--random-state', type=int, default=1337)
    p.add_argument('--max-rows', type=int, default=None, help='Optional limit for faster iteration')
    return p.parse_args()


def load_dataset(limit_year: str | None, min_rounds: int, max_rows: int | None) -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Missing consolidated dataset: {DATA_PATH}. Run preprocess_data.py first.")
    df = pd.read_csv(DATA_PATH)
    # Basic cleaning
    for col in NUMERIC_CANDIDATES:
        if col in df.columns:
            # Coerce to numeric ignoring errors
            df[col] = pd.to_numeric(df[col], errors='coerce')
    if 'rounds_played' in df.columns:
        df = df[df['rounds_played'] >= min_rounds]
    if limit_year:
        years = {int(y.strip()) for y in limit_year.split(',') if y.strip().isdigit()}
        if 'year' in df.columns and years:
            df = df[df['year'].isin(years)]
    if max_rows:
        df = df.head(max_rows)
    return df.reset_index(drop=True)


def derive_target(df: pd.DataFrame, target: str) -> pd.Series:
    if target == 'kills_per_round':
        if 'kills' not in df.columns or 'rounds_played' not in df.columns:
            raise ValueError('Required columns kills, rounds_played not present for kills_per_round target')
        return df['kills'] / df['rounds_played'].replace(0, pd.NA)
    if target not in df.columns:
        raise ValueError(f'Target {target} not found in dataset')
    return df[target]


def select_features(df: pd.DataFrame, target_col: str) -> list[str]:
    feats = [c for c in NUMERIC_CANDIDATES if c in df.columns and c != target_col]
    # Remove high leakage columns if predicting kills_per_round (e.g., kills, deaths) -> keep context but not raw kills when target derived from kills?
    if target_col == 'kills_per_round':
        # Remove raw kills to prevent trivial derivation
        feats = [f for f in feats if f not in ('kills','deaths')]
    return feats


def build_model(model_key: str, random_state: int):
    if model_key == 'hgb':
        return HistGradientBoostingRegressor(random_state=random_state, max_depth=8, learning_rate=0.08, l2_regularization=0.0)
    return RandomForestRegressor(n_estimators=400, max_depth=14, random_state=random_state, n_jobs=-1, min_samples_leaf=2)


def get_git_commit() -> str | None:
    try:
        return subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT.parent.parent.parent, text=True).strip()
    except Exception:
        return None


def main():
    args = parse_args()
    df = load_dataset(args.limit_year, args.min_rounds, args.max_rows)
    y = derive_target(df, args.target)
    feature_cols = select_features(df, args.target)
    X = df[feature_cols].fillna(0)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=args.random_state
    )

    model = build_model(args.model, args.random_state)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = math.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)

    # Feature importance (where available)
    importances = None
    if hasattr(model, 'feature_importances_'):
        importances = {c: float(v) for c, v in zip(feature_cols, model.feature_importances_)}
    elif hasattr(model, 'feature_names_in_') and hasattr(model, 'predict'):  # HGB has feature_importances_ as well
        if getattr(model, 'feature_importances_', None) is not None:
            importances = {c: float(v) for c, v in zip(feature_cols, model.feature_importances_)}

    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    model_filename = f"model_{args.target}_{ts}.joblib"
    metrics_filename = f"metrics_{args.target}_{ts}.json"

    artifact = {
        'model': model,
        'metadata': {
            'trained_at': datetime.utcnow().isoformat(),
            'python_version': platform.python_version(),
            'target': args.target,
            'model_type': args.model,
            'feature_cols': feature_cols,
            'rows_total': int(len(df)),
            'rows_train': int(len(X_train)),
            'rows_test': int(len(X_test)),
            'git_commit': get_git_commit(),
            'params': getattr(model, 'get_params', lambda: {})()
        }
    }

    joblib.dump(artifact, MODELS_DIR / model_filename)
    # update latest symlink/copy
    latest_path = MODELS_DIR / f"latest_{args.target}.joblib"
    try:
        if latest_path.exists():
            latest_path.unlink()
        # windows: symlink may need admin; fallback to copy
        try:
            os.symlink(model_filename, latest_path)
        except Exception:
            import shutil
            shutil.copy2(MODELS_DIR / model_filename, latest_path)
    except Exception as e:
        print(f"[train] WARN could not update latest symlink: {e}", file=sys.stderr)

    metrics = {
        'target': args.target,
        'model': args.model,
        'timestamp': ts,
        'mae': mae,
        'rmse': rmse,
        'r2': r2,
        'feature_importance': importances,
        'feature_cols': feature_cols,
        'test_size': args.test_size,
        'min_rounds': args.min_rounds,
        'limit_year': args.limit_year
    }
    (MODELS_DIR / metrics_filename).write_text(json.dumps(metrics, indent=2))

    print(f"[train] Saved model {model_filename} MAE={mae:.4f} RMSE={rmse:.4f} R2={r2:.4f} features={len(feature_cols)}")

if __name__ == '__main__':
    main()
