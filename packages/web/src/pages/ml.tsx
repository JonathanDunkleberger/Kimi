import React from 'react';
import { Brain } from 'lucide-react';

export default function MLPage() {
  return (
    <div className="ml-page anim-in">
      <div className="hero-banner" style={{ marginBottom: 24 }}>
        <div className="hero-badge">
          <div className="pulse" /> Machine Learning
        </div>
        <div className="hero-title" style={{ fontSize: 28 }}>
          <Brain size={22} style={{ marginRight: 8, display: 'inline' }} /> Kill Prediction Engine
        </div>
        <div className="hero-sub">
          RandomForest regression model trained on historical VCT match data to
          predict player kill totals.
        </div>
      </div>

      {/* Model Performance */}
      <div className="ml-card">
        <div className="ml-card-title">Model Performance</div>
        <div className="ml-card-sub">
          Evaluated on holdout test set from 2024–2025 VCT seasons
        </div>
        <div className="ml-stat-grid">
          <div className="ml-stat">
            <div className="ml-stat-value" style={{ color: 'var(--accent-green)' }}>
              2.31
            </div>
            <div className="ml-stat-label">MAE (Kills)</div>
          </div>
          <div className="ml-stat">
            <div className="ml-stat-value" style={{ color: 'var(--accent-blue)' }}>
              0.71
            </div>
            <div className="ml-stat-label">R² Score</div>
          </div>
          <div className="ml-stat">
            <div className="ml-stat-value" style={{ color: 'var(--accent)' }}>
              3.14
            </div>
            <div className="ml-stat-label">RMSE</div>
          </div>
          <div className="ml-stat">
            <div className="ml-stat-value">12.4K</div>
            <div className="ml-stat-label">Training Samples</div>
          </div>
        </div>
      </div>

      {/* Feature Engineering */}
      <div className="ml-card">
        <div className="ml-card-title">Feature Engineering</div>
        <div className="ml-card-sub">
          Input features extracted from historical match and player data
        </div>
        <div className="ml-features">
          {[
            'avg_kills_last_5',
            'avg_kills_last_10',
            'agent_encoded',
            'map_encoded',
            'team_win_rate',
            'opponent_strength',
            'avg_acs_last_5',
            'role_category',
            'event_tier',
            'kills_std_dev',
            'headshot_pct',
            'first_bloods_avg',
            'clutch_rate',
            'avg_deaths',
            'kd_ratio_trend',
          ].map((f) => (
            <span key={f} className="ml-feature-tag">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Inference Pipeline */}
      <div className="ml-card">
        <div className="ml-card-title">Inference Pipeline</div>
        <div className="ml-card-sub">
          End-to-end flow from data ingestion to prop line generation
        </div>
        <div className="ml-pipeline">
          <div className="ml-pipeline-step">
            <span className="step-num">1</span> VLR.gg Scraper
          </div>
          <span className="ml-pipeline-arrow">→</span>
          <div className="ml-pipeline-step">
            <span className="step-num">2</span> Feature Extraction
          </div>
          <span className="ml-pipeline-arrow">→</span>
          <div className="ml-pipeline-step">
            <span className="step-num">3</span> RandomForest Model
          </div>
          <span className="ml-pipeline-arrow">→</span>
          <div className="ml-pipeline-step">
            <span className="step-num">4</span> Confidence Score
          </div>
          <span className="ml-pipeline-arrow">→</span>
          <div className="ml-pipeline-step">
            <span className="step-num">5</span> Prop Line + Direction
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="ml-card">
        <div className="ml-card-title">Tech Stack</div>
        <div className="ml-card-sub">
          Tools and frameworks powering the prediction engine
        </div>
        <div className="ml-features">
          {[
            'scikit-learn',
            'pandas',
            'FastAPI',
            'Playwright',
            'Supabase',
            'Next.js',
            'Vercel',
            'Render',
            'RandomForestRegressor',
            'Python 3.11',
          ].map((f) => (
            <span
              key={f}
              className="ml-feature-tag"
              style={{
                background: 'rgba(255,70,85,0.08)',
                borderColor: 'rgba(255,70,85,0.15)',
                color: 'var(--accent)',
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div className="ml-card">
        <div className="ml-card-title">Roadmap</div>
        <div className="ml-card-sub">Planned improvements for v2</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { done: false, text: 'XGBoost / LightGBM ensemble for improved accuracy' },
            { done: false, text: 'Additional prop types: ACS, Headshot %, First Bloods' },
            { done: false, text: 'Live odds adjustments mid-series using in-game data' },
            { done: false, text: 'Agent/map interaction features for map-specific predictions' },
            { done: true, text: 'RandomForest baseline model with historical VCT data' },
            { done: true, text: 'Automated scraping + feature pipeline' },
            { done: true, text: 'FastAPI inference endpoint' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                color: item.done ? 'var(--text-muted)' : 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  flexShrink: 0,
                  background: item.done
                    ? 'rgba(0,255,135,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${
                    item.done ? 'rgba(0,255,135,0.3)' : 'var(--border)'
                  }`,
                  color: item.done ? 'var(--accent-green)' : 'var(--text-muted)',
                }}
              >
                {item.done ? '✓' : ''}
              </span>
              <span
                style={{
                  textDecoration: item.done ? 'line-through' : 'none',
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
