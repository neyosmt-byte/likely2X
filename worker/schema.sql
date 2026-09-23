CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  chain_id INTEGER,
  address TEXT,
  name TEXT NOT NULL,
  status TEXT,
  metrics_json TEXT NOT NULL,
  source TEXT NOT NULL,
  observed_at TEXT,
  data_state TEXT NOT NULL,
  provenance_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS entities_kind_chain ON entities(kind, chain_id);
CREATE INDEX IF NOT EXISTS entities_address ON entities(address);

CREATE TABLE IF NOT EXISTS events (
  id TEXT NOT NULL,
  chain_id INTEGER,
  address TEXT,
  name TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  source TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  PRIMARY KEY (id, observed_at)
);

CREATE INDEX IF NOT EXISTS events_observed_at ON events(observed_at DESC);

CREATE TABLE IF NOT EXISTS project_snapshots (
  observed_at TEXT PRIMARY KEY,
  project_count INTEGER NOT NULL,
  total_market_cap_usd REAL,
  total_liquidity_usd REAL,
  assets_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  block_number INTEGER,
  status TEXT NOT NULL,
  error TEXT
);

CREATE INDEX IF NOT EXISTS sync_runs_source_time ON sync_runs(source, observed_at DESC);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  value REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS metric_snapshots_latest ON metric_snapshots(metric, observed_at DESC);
