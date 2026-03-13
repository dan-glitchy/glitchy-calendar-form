import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { availabilitySubmissions, anonymousFeedback, submissionMetadata } from './schema'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

const dbPath = './db/availability.db'
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')

export const db = drizzle({ client: sqlite, schema: { availabilitySubmissions, anonymousFeedback, submissionMetadata } })

// Create table if not exists (safe static SQL, no user input)
const createTableSQL = `
  CREATE TABLE IF NOT EXISTS availability_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    developer_name TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    original_timezone TEXT NOT NULL,
    original_start TEXT NOT NULL,
    original_end TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  )
`
sqlite.prepare(createTableSQL).run()

const createFeedbackTableSQL = `
  CREATE TABLE IF NOT EXISTS anonymous_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_text TEXT NOT NULL,
    submitter_name TEXT,
    submitted_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  )
`
sqlite.prepare(createFeedbackTableSQL).run()

// Add submitter_name column if missing (migration for existing databases)
try {
  sqlite.prepare('ALTER TABLE anonymous_feedback ADD COLUMN submitter_name TEXT').run()
} catch {
  // Column already exists
}

const createMetadataTableSQL = `
  CREATE TABLE IF NOT EXISTS submission_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_type TEXT NOT NULL,
    submission_id INTEGER NOT NULL,
    user_name TEXT,
    user_agent TEXT,
    language TEXT,
    languages TEXT,
    platform TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    color_depth INTEGER,
    timezone TEXT,
    timezone_offset INTEGER,
    touch_support INTEGER,
    hardware_concurrency INTEGER,
    device_memory INTEGER,
    ip_address TEXT,
    accept_header TEXT,
    collected_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
  )
`
sqlite.prepare(createMetadataTableSQL).run()
