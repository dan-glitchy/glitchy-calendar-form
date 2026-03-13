# Team Availability Scheduler — Design Spec

## Problem

Distributed dev team across multiple timezones. Need a simple way for developers to submit their weekly availability (Mon–Fri) so the team lead can find overlapping windows in EST.

## Solution

Nuxt 3 full-stack app with shadcn-vue, SQLite (Drizzle ORM), JWT-based access control.

## Pages

### Entry Gate (`/`)
- Centered card: name input, access code input, "Continue" button
- Validates code against env var, returns JWT (24hr), stores in cookie
- Minimal — nothing else on page

### Availability Form (`/submit`)
- Header: developer name, detected timezone
- Five rows (Mon–Fri): day label, "not available" toggle, start/end time dropdowns (15-min increments)
- Times shown in developer's local timezone
- Submit button → server converts to EST → stores in SQLite
- Resubmission replaces previous entry for that developer

### Admin Dashboard (`/admin`)
- Separate admin code (same gate pattern, JWT with admin role)
- Table: rows = developers, columns = Mon–Fri, cells = EST time ranges
- Overlap row at bottom: shows windows where all developers are available per day
- "Download JSON" button top-right

## Auth

- `TEAM_CODE` env var for developers, `ADMIN_CODE` for admin
- `POST /api/auth` — validates code, returns JWT with role (member/admin)
- All API routes use server middleware to validate Bearer token
- 24-hour JWT expiry

## Data Model

Table: `availability_submissions`

| Column | Type | Description |
|--------|------|-------------|
| id | integer PK | Auto-increment |
| developer_name | text | Submitter name |
| day_of_week | text | "monday"–"friday" |
| start_time | text | EST time (HH:mm 24hr) |
| end_time | text | EST time (HH:mm 24hr) |
| original_timezone | text | e.g. "America/Los_Angeles" |
| original_start | text | Local start time |
| original_end | text | Local end time |
| submitted_at | text | ISO timestamp |

One row per day per submission. Resubmission deletes old rows for that developer_name.

## API Routes

- `POST /api/auth` — { name, code } → JWT
- `POST /api/availability` — submit availability (array of day entries), requires member/admin JWT
- `GET /api/availability` — get all submissions (admin only)
- `GET /api/availability/export` — JSON download (admin only)

## Design

- Light mode, blue-600 accent
- No AI slop: no hero sections, no oversized padding, no gradients, no glassmorphism, no bouncy animations
- Tight spacing, functional density, flat backgrounds, 1px gray-200 borders
- System font stack, normal weights
- Blue accent only on interactive elements
- Admin dashboard feels like a spreadsheet
- Linear/Vercel aesthetic — dense, professional

## Tech Stack

- Nuxt 3
- shadcn-vue + Tailwind CSS
- Drizzle ORM + SQLite (better-sqlite3)
- jose (JWT handling)
- date-fns-tz or luxon for timezone conversion
