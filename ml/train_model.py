import os
import pathlib
import random
from datetime import datetime
import joblib
import pandas as pd
import psycopg2
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from dotenv import load_dotenv

load_dotenv()

MODEL_DIR = pathlib.Path(os.environ.get("MODEL_DIR", "ml/models"))
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "player_kills_rf.joblib"

# Placeholder: generate synthetic training data (replace with real DB extraction)
# Features: historical_mean, recent_mean, opponent_conceded_mean, days_since_last
# Target: kills_next

def synthetic_dataset(rows: int = 5000, seed: int = 42) -> pd.DataFrame:
    random.seed(seed)
    data = []
    for i in range(rows):
        hist = random.uniform(10, 30)
        recent = hist + random.uniform(-3, 3)
        opp = random.uniform(10, 28)
        days = random.randint(1, 14)
        noise = random.gauss(0, 2)
        target = 0.5 * hist + 0.8 * recent + 0.3 * opp - 0.2 * days + noise
        target /= 2.5  # scale down
        data.append({
            "historical_mean": hist,
            "recent_mean": recent,
            "opponent_conceded_mean": opp,
            "days_since_last": days,
            "kills_next": target
        })
    return pd.DataFrame(data)

def load_training_data() -> pd.DataFrame:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return synthetic_dataset()
    try:
        conn = psycopg2.connect(db_url)
        q = "SELECT \"playerId\", \"matchId\", kills, \"createdAt\" FROM \"PlayerMatchStat\" ORDER BY \"createdAt\" ASC"
        df = pd.read_sql(q, conn)
        conn.close()
        if df.empty:
            return synthetic_dataset()
        # Feature engineering per player: historical mean, recent mean (last 3), days since last, next kill target
        rows = []
        for pid, g in df.groupby("playerId"):
            g = g.sort_values("createdAt").reset_index(drop=True)
            g["historical_mean"] = g["kills"].expanding().mean().shift(1)
            g["recent_mean"] = g["kills"].rolling(3).mean().shift(1)
            g["days_since_last"] = g["createdAt"].diff().dt.total_seconds().div(86400).fillna(7)
            # target is next match kills
            g["kills_next"] = g["kills"].shift(-1)
            feat = g.dropna(subset=["historical_mean","recent_mean","kills_next"]).copy()
            rows.append(feat[["historical_mean","recent_mean","days_since_last","kills_next"]])
        if not rows:
            return synthetic_dataset()
        feat_df = pd.concat(rows, axis=0)
        # fill any residual NaN
        feat_df = feat_df.fillna(method='ffill').dropna()
        # Opponent conceded mean placeholder: reuse historical_mean noise
        feat_df["opponent_conceded_mean"] = feat_df["historical_mean"] * (0.9 + 0.2 * random.random())
        cols = ["historical_mean","recent_mean","opponent_conceded_mean","days_since_last","kills_next"]
        return feat_df[cols]
    except Exception:
        return synthetic_dataset()

def main():
    df = load_training_data()
    X = df.drop(columns=["kills_next"])  # features
    y = df["kills_next"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=1337)

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=12,
        n_jobs=-1,
        random_state=1337,
        min_samples_leaf=2
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)

    joblib.dump({
        "model": model,
        "trained_at": datetime.utcnow().isoformat(),
        "metrics": {"mae": mae},
        "feature_order": list(X.columns)
    }, MODEL_PATH)

    print(f"Saved model to {MODEL_PATH} (MAE={mae:.3f})")

if __name__ == "__main__":
    main()
