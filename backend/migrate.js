import Database from "better-sqlite3";
import "dotenv/config";

const db = new Database(process.env.SQLITE_FILE || "data.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS blacklist (
  address TEXT PRIMARY KEY,
  reason  TEXT,
  source  TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  summary TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_label TEXT NOT NULL,
  details_json TEXT NOT NULL,
  errors_json  TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);
`);

console.log("Migration complete.");
