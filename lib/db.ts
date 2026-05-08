import Database from "better-sqlite3";
import { randomBytes } from "crypto";
import { homedir } from "os";
import { mkdirSync } from "fs";
import { dirname, join } from "path";

function dbPath(): string {
  const raw = process.env.DB_PATH ?? "~/.deep-wisdom/sessions.db";
  const resolved = raw.startsWith("~") ? join(homedir(), raw.slice(1)) : raw;
  mkdirSync(dirname(resolved), { recursive: true });
  return resolved;
}

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath());
    _db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id  TEXT PRIMARY KEY,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        state       TEXT NOT NULL DEFAULT 'INIT',
        risk_level  TEXT NOT NULL DEFAULT 'low'
      );
      CREATE TABLE IF NOT EXISTS messages (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id  TEXT NOT NULL,
        role        TEXT NOT NULL,
        content     TEXT NOT NULL,
        emotion_tags TEXT NOT NULL DEFAULT '[]',
        module_used TEXT,
        timestamp   TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      );
    `);
  }
  return _db;
}

export function createSession(): string {
  const sessionId = randomBytes(4).toString("hex");
  const now = new Date().toISOString();
  db().prepare(
    "INSERT INTO sessions (session_id, created_at, updated_at, state, risk_level) VALUES (?, ?, ?, ?, ?)"
  ).run(sessionId, now, now, "INIT", "low");
  return sessionId;
}

export function getSession(sessionId: string): Record<string, string> | null {
  const row = db().prepare("SELECT * FROM sessions WHERE session_id = ?").get(sessionId) as Record<string, string> | undefined;
  return row ?? null;
}

export function listSessions(): Record<string, string>[] {
  return db().prepare(
    "SELECT session_id, created_at, updated_at, state, risk_level FROM sessions ORDER BY updated_at DESC"
  ).all() as Record<string, string>[];
}

export function updateSessionState(sessionId: string, state: string, riskLevel?: string): void {
  const now = new Date().toISOString();
  if (riskLevel) {
    db().prepare("UPDATE sessions SET state=?, risk_level=?, updated_at=? WHERE session_id=?")
      .run(state, riskLevel, now, sessionId);
  } else {
    db().prepare("UPDATE sessions SET state=?, updated_at=? WHERE session_id=?")
      .run(state, now, sessionId);
  }
}

export function saveMessage(
  sessionId: string,
  role: string,
  content: string,
  moduleUsed?: string,
): void {
  const now = new Date().toISOString();
  db().prepare(
    "INSERT INTO messages (session_id, role, content, emotion_tags, module_used, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sessionId, role, content, "[]", moduleUsed ?? null, now);
}

export function getSessionMessages(sessionId: string): { role: string; content: string }[] {
  return (db().prepare(
    "SELECT role, content FROM messages WHERE session_id=? ORDER BY id"
  ).all(sessionId) as { role: string; content: string }[]);
}
