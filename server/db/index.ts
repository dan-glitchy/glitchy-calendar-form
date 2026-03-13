import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { availabilitySubmissions } from './schema'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

const dbPath = './db/availability.db'
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')

export const db = drizzle({ client: sqlite, schema: { availabilitySubmissions } })

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
