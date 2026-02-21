import React, { useState } from 'react';
import { Brain, Crosshair, Target, Database, Percent, Activity, RefreshCw } from 'lucide-react';

type ModelKey = 'valorant' | 'cod';

const MODELS: Record<ModelKey, {
  name: string;
  game: string;
  icon: React.ReactNode;
  color: string;
  whyTitle: string;
  whyText: string;
  stats: { label: string; value: string; color: string; icon: React.ReactNode }[];
  features: { name: string; importance: number }[];
  featureTags: string[];
  confidence: string;
  pipelineSteps: string[];
}> = {
  valorant: {
    name: 'RandomForestRegressor',
    game: 'Valorant',
    icon: <Crosshair size={14} />,
    color: '#00e5a0',
    whyTitle: 'Why RandomForest?',
    whyText: 'Valorant stats are low-variance with strong categorical predictors (agent, map, role). RandomForest handles these well without overfitting on smaller esports datasets. The ensemble of 200 decision trees provides natural confidence scoring through inter-tree variance.',
    stats: [
      { label: 'MAE (Kills)', value: '2.31', color: 'var(--accent)', icon: <Database size={14} /> },
      { label: 'R² Score', value: '0.71', color: 'var(--blue)', icon: <Percent size={14} /> },
      { label: 'RMSE', value: '3.14', color: 'var(--purple)', icon: <Activity size={14} /> },
      { label: 'Training Maps', value: '8.2K', color: 'var(--text)', icon: <RefreshCw size={14} /> },
    ],
    features: [
      { name: 'avg_kills_last_5', importance: 92 },
      { name: 'avg_kills_last_10', importance: 85 },
      { name: 'map_encoded', importance: 72 },
      { name: 'agent_encoded', importance: 68 },
      { name: 'team_win_rate_last_10', importance: 61 },
      { name: 'opponent_strength', importance: 54 },
      { name: 'avg_deaths_last_5', importance: 45 },
      { name: 'avg_first_bloods_last_5', importance: 38 },
    ],
    featureTags: [
      'avg_kills_last_5', 'avg_kills_last_10', 'std_kills_last_10',
      'agent_encoded', 'map_encoded', 'role_category',
      'team_win_rate_last_10', 'opponent_strength', 'event_tier',
      'avg_deaths_last_5', 'avg_assists_last_5', 'avg_first_bloods_last_5',
      'avg_headshot_pct_last_5',
    ],
    confidence: 'Variance across 200 decision trees — low inter-tree disagreement means high confidence.',
    pipelineSteps: ['PandaScore API', 'Feature Extraction', 'RandomForest Model', 'Confidence Score', 'Prop Line + Direction'],
  },
  cod: {
    name: 'GradientBoostingRegressor',
    game: 'Call of Duty',
    icon: <Target size={14} />,
    color: '#4c8dff',
    whyTitle: 'Why Gradient Boosting?',
    whyText: 'CoD kill counts vary dramatically by game mode — Hardpoint (25–40), Search & Destroy (5–12), Control (15–30). These non-linear, mode-dependent distributions require a model that captures complex feature interactions. Gradient boosting builds trees sequentially, each correcting previous errors.',
    stats: [
      { label: 'MAE (Kills)', value: '3.45', color: 'var(--accent)', icon: <Database size={14} /> },
      { label: 'R² Score', value: '0.64', color: 'var(--blue)', icon: <Percent size={14} /> },
      { label: 'RMSE', value: '4.82', color: 'var(--purple)', icon: <Activity size={14} /> },
      { label: 'Training Maps', value: '6.1K', color: 'var(--text)', icon: <RefreshCw size={14} /> },
    ],
    features: [
      { name: 'avg_kills_hardpoint_last_5', importance: 89 },
      { name: 'map_mode_encoded', importance: 82 },
      { name: 'avg_kills_snd_last_5', importance: 74 },
      { name: 'avg_damage_per_10min', importance: 67 },
      { name: 'team_map_win_rate', importance: 58 },
      { name: 'opponent_avg_kills_allowed', importance: 51 },
      { name: 'avg_engagements_last_5', importance: 42 },
      { name: 'is_losers_bracket', importance: 33 },
    ],
    featureTags: [
      'avg_kills_hardpoint_last_5', 'avg_kills_snd_last_5', 'avg_kills_control_last_5',
      'map_mode_encoded', 'role_category', 'avg_damage_per_10min',
      'team_map_win_rate', 'opponent_avg_kills_allowed', 'h2h_avg_kills',
      'avg_engagements_last_5', 'event_tier', 'is_losers_bracket',
    ],
    confidence: 'Residual analysis from validation set — predictions where the model historically performs well receive higher confidence.',
    pipelineSteps: ['PandaScore API', 'Feature Extraction', 'GradientBoosting', 'Confidence Score', 'Prop Line + Direction'],
  },
};

const ROADMAP = [
  { done: true, text: 'RandomForest baseline model (Valorant kills)' },
  { done: true, text: 'GradientBoosting model (CoD kills)' },
  { done: true, text: 'Automated PandaScore data pipeline' },
  { done: true, text: 'Map-scoped prop types (guaranteed maps only)' },
  { done: true, text: 'Confidence scoring system' },
  { done: false, text: 'XGBoost ensemble for improved CoD accuracy' },
  { done: false, text: 'Additional props: ACS, Headshot %, First Bloods' },
  { done: false, text: 'Live odds adjustments mid-series' },
  { done: false, text: 'Agent/map interaction features' },
  { done: false, text: 'SHAP explanations per prediction' },
];

export default function MLPage() {
  const [activeModel, setActiveModel] = useState<ModelKey>('valorant');
  const m = MODELS[activeModel];

  return (
    <div className="ml-page anim-in">
      <div className="hero-banner" style={{ marginBottom: 24 }}>
        <div className="hero-badge">
          <div className="pulse" /> Machine Learning
        </div>
        <div className="hero-title" style={{ fontSize: 28 }}>
          <Brain size={22} style={{ marginRight: 8, display: 'inline' }} /> Prediction Engine
        </div>
        <div className="hero-sub">
          Two game-specific ML models generate every prop line on the platform.
          Each outputs a predicted stat line with a confidence score.
        </div>
      </div>

      {/* Model Tabs */}
      <div className="game-tabs" style={{ marginBottom: 20 }}>
        {(Object.keys(MODELS) as ModelKey[]).map((key) => (
          <button
            key={key}
            className={`game-tab ${activeModel === key ? 'active' : ''}`}
            onClick={() => setActiveModel(key)}
          >
            {MODELS[key].icon}
            <span>{MODELS[key].game}</span>
          </button>
        ))}
      </div>

      {/* Why This Model */}
      <div className="ml-card">
        <div className="ml-card-title">{m.whyTitle}</div>
        <div className="ml-card-sub" style={{ lineHeight: 1.5 }}>{m.whyText}</div>
      </div>

      {/* Model Performance */}
      <div className="ml-card">
        <div className="ml-card-title">
          {m.name}
          <span style={{ fontSize: 11, fontWeight: 500, color: m.color, marginLeft: 8 }}>
            {m.game}
          </span>
        </div>
        <div className="ml-card-sub">
          Evaluated on holdout test set from 2024–2025 seasons
        </div>
        <div className="ml-stat-grid">
          {m.stats.map((s) => (
            <div className="ml-stat" key={s.label}>
              <div className="ml-stat-icon">
                {s.icon}
                <span>{s.label}</span>
              </div>
              <div className="ml-stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Importance */}
      <div className="ml-card">
        <div className="ml-card-title">Feature Importance</div>
        <div className="ml-card-sub">Top features ranked by model importance for {m.game}</div>
        <div style={{ marginTop: 4 }}>
          {m.features.map((f) => (
            <div className="ml-feature-bar" key={f.name}>
              <span className="ml-feature-name">{f.name}</span>
              <div className="ml-feature-track">
                <div className="ml-feature-fill" style={{ width: `${f.importance}%` }} />
              </div>
              <span className="ml-feature-pct">{f.importance}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Engineering */}
      <div className="ml-card">
        <div className="ml-card-title">Feature Engineering</div>
        <div className="ml-card-sub">All input features for {m.game} model</div>
        <div className="ml-features">
          {m.featureTags.map((f) => (
            <span key={f} className="ml-feature-tag">{f}</span>
          ))}
        </div>
      </div>

      {/* Confidence Scoring */}
      <div className="ml-card">
        <div className="ml-card-title">Confidence Scoring</div>
        <div className="ml-card-sub" style={{ lineHeight: 1.5 }}>{m.confidence}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>80%+ High</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>65–79% Medium</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>&lt;65% Low</span>
          </div>
        </div>
      </div>

      {/* Inference Pipeline */}
      <div className="ml-card">
        <div className="ml-card-title">Inference Pipeline</div>
        <div className="ml-card-sub">
          End-to-end flow from data ingestion to prop line generation
        </div>
        <div className="ml-pipeline">
          {m.pipelineSteps.map((step, i) => (
            <React.Fragment key={step}>
              {i > 0 && <span className="ml-pipeline-arrow">→</span>}
              <div className="ml-pipeline-step">
                <span className="step-num">{i + 1}</span> {step}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="ml-card">
        <div className="ml-card-title">Tech Stack</div>
        <div className="ml-card-sub">Tools powering the prediction engine</div>
        <div className="ml-features">
          {[
            'scikit-learn', 'pandas', 'PandaScore API', 'Supabase',
            'Next.js', 'Vercel', 'Python 3.12',
            'RandomForest', 'GradientBoosting',
          ].map((f) => (
            <span
              key={f}
              className="ml-tag"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div className="ml-card">
        <div className="ml-card-title">Roadmap</div>
        <div className="ml-card-sub">Completed milestones and planned improvements</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ROADMAP.map((item, i) => (
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
                    ? 'var(--accent-soft)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${
                    item.done ? 'rgba(0,229,160,0.3)' : 'var(--border)'
                  }`,
                  color: item.done ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {item.done ? '✓' : ''}
              </span>
              <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
