import { neon } from "@neondatabase/serverless";
import { randomBytes } from "crypto";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  return neon(url);
}

let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id  TEXT PRIMARY KEY,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      state       TEXT NOT NULL DEFAULT 'INIT',
      risk_level  TEXT NOT NULL DEFAULT 'low'
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS messages (
      id          SERIAL PRIMARY KEY,
      session_id  TEXT NOT NULL,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      emotion_tags TEXT NOT NULL DEFAULT '[]',
      module_used TEXT,
      timestamp   TEXT NOT NULL
    )
  `;
  schemaReady = true;
}

export async function createSession(): Promise<string> {
  await ensureSchema();
  const sessionId = randomBytes(4).toString("hex");
  const now = new Date().toISOString();
  await sql()`
    INSERT INTO sessions (session_id, created_at, updated_at, state, risk_level)
    VALUES (${sessionId}, ${now}, ${now}, 'INIT', 'low')
  `;
  return sessionId;
}

export async function getSession(sessionId: string): Promise<Record<string, string> | null> {
  await ensureSchema();
  const rows = await sql()`SELECT * FROM sessions WHERE session_id = ${sessionId}`;
  return (rows[0] as Record<string, string>) ?? null;
}

export async function listSessions(): Promise<Record<string, string>[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT session_id, created_at, updated_at, state, risk_level
    FROM sessions ORDER BY updated_at DESC
  `;
  return rows as Record<string, string>[];
}

export async function updateSessionState(sessionId: string, state: string, riskLevel?: string): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  if (riskLevel) {
    await sql()`
      UPDATE sessions SET state = ${state}, risk_level = ${riskLevel}, updated_at = ${now}
      WHERE session_id = ${sessionId}
    `;
  } else {
    await sql()`
      UPDATE sessions SET state = ${state}, updated_at = ${now}
      WHERE session_id = ${sessionId}
    `;
  }
}

export async function saveMessage(
  sessionId: string,
  role: string,
  content: string,
  moduleUsed?: string,
): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  await sql()`
    INSERT INTO messages (session_id, role, content, emotion_tags, module_used, timestamp)
    VALUES (${sessionId}, ${role}, ${content}, '[]', ${moduleUsed ?? null}, ${now})
  `;
}

export async function getSessionMessages(sessionId: string): Promise<{ role: string; content: string }[]> {
  await ensureSchema();
  const rows = await sql()`
    SELECT role, content FROM messages WHERE session_id = ${sessionId} ORDER BY id
  `;
  return rows as { role: string; content: string }[];
}
