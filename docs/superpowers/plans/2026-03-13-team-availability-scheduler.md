# Team Availability Scheduler Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Nuxt 3 full-stack app where distributed developers submit weekly availability (Mon-Fri) in their local timezone, which gets converted and stored in EST so the team lead can find overlap windows.

**Architecture:** Nuxt 3 with server API routes handles both frontend and backend. SQLite via Drizzle ORM stores submissions. JWT (via jose) protects all routes -- developers and admin exchange an access code for a token. shadcn-vue provides the UI components with a clean, dense, light-mode design.

**Tech Stack:** Nuxt 3, shadcn-vue, Tailwind CSS, Drizzle ORM, better-sqlite3, jose (JWT), luxon (timezone conversion)

---

## File Structure

```
whyamiblamed/
  nuxt.config.ts
  package.json
  tsconfig.json
  .env
  tailwind.config.ts
  app.vue
  assets/
    css/
      tailwind.css
  components/
    ui/                    -- shadcn-vue components (auto-generated)
  composables/
    useAuth.ts             -- client-side auth state (JWT cookie, user info)
  layouts/
    default.vue            -- minimal shell layout
  middleware/
    auth.ts                -- client-side route guard
  pages/
    index.vue              -- entry gate (name + code form)
    submit.vue             -- availability form with time pickers
    admin.vue              -- dashboard table + JSON export
  server/
    db/
      index.ts             -- drizzle instance + SQLite connection
      schema.ts            -- availability_submissions table
    middleware/
      auth.ts              -- server middleware (JWT validation on /api/ routes)
    api/
      auth.post.ts         -- POST /api/auth (code to JWT exchange)
      availability.post.ts -- POST /api/availability (submit entries)
      availability.get.ts  -- GET /api/availability (list all, admin only)
      availability/
        export.get.ts      -- GET /api/availability/export (JSON download)
    utils/
      jwt.ts               -- sign/verify JWT helpers
      timezone.ts          -- convert local time to EST helper
  drizzle.config.ts
```

---

## Chunk 1: Project Scaffolding and Database

### Task 1: Initialize Nuxt project with dependencies

**Files:**
- Create: `package.json`, `nuxt.config.ts`, `tsconfig.json`, `.env`, `tailwind.config.ts`, `assets/css/tailwind.css`

- [ ] **Step 1: Scaffold Nuxt 3 project**

Run: `npx nuxi@latest init . --force --packageManager npm`

- [ ] **Step 2: Install core dependencies**

Run: `npm install drizzle-orm better-sqlite3 jose luxon`
Run: `npm install -D drizzle-kit @types/better-sqlite3 @types/luxon`

- [ ] **Step 3: Install shadcn-vue and Tailwind**

Run: `npx shadcn-vue@latest init`

Select: TypeScript yes, Framework Nuxt, Style Default, Base color Slate, CSS file assets/css/tailwind.css, Components alias @/components, Utils alias @/lib/utils

- [ ] **Step 4: Add shadcn-vue components**

Run: `npx shadcn-vue@latest add button input label card table select switch badge`

- [ ] **Step 5: Create .env file**

```
DATABASE_URL=file:./db/availability.db
JWT_SECRET=change-me-to-a-random-secret-at-least-32-chars
TEAM_CODE=team2026
ADMIN_CODE=admin2026
```

- [ ] **Step 6: Update nuxt.config.ts for runtime config**

Add runtimeConfig block:

```typescript
runtimeConfig: {
  jwtSecret: process.env.JWT_SECRET,
  teamCode: process.env.TEAM_CODE,
  adminCode: process.env.ADMIN_CODE,
  databaseUrl: process.env.DATABASE_URL || 'file:./db/availability.db',
},
```

- [ ] **Step 7: Verify dev server starts**

Run: `npm run dev`
Expected: Dev server starts at http://localhost:3000

- [ ] **Step 8: Commit**

```
git add -A
git commit -m "feat: scaffold Nuxt 3 project with shadcn-vue, drizzle, and dependencies"
```

---

### Task 2: Database schema and connection

**Files:**
- Create: `server/db/schema.ts`, `server/db/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Create the database schema**

Create `server/db/schema.ts`:

```typescript
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const availabilitySubmissions = sqliteTable('availability_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  developerName: text('developer_name').notNull(),
  dayOfWeek: text('day_of_week').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  originalTimezone: text('original_timezone').notNull(),
  originalStart: text('original_start').notNull(),
  originalEnd: text('original_end').notNull(),
  submittedAt: text('submitted_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
})

export type AvailabilitySubmission = typeof availabilitySubmissions.$inferSelect
export type InsertAvailabilitySubmission = typeof availabilitySubmissions.$inferInsert
```

- [ ] **Step 2: Create the database connection**

Create `server/db/index.ts`:

```typescript
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

sqlite.exec(`
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
`)
```

- [ ] **Step 3: Create drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './db/availability.db',
  },
})
```

- [ ] **Step 4: Add db/ to .gitignore**

Append `db/` and `.env` to `.gitignore`

- [ ] **Step 5: Verify database initializes on dev server start**

Run: `npm run dev`
Expected: Server starts, `db/availability.db` file is created.

- [ ] **Step 6: Commit**

```
git add server/db/ drizzle.config.ts .gitignore
git commit -m "feat: add SQLite database schema and connection via Drizzle ORM"
```

---

## Chunk 2: Auth System

### Task 3: JWT utilities

**Files:**
- Create: `server/utils/jwt.ts`

- [ ] **Step 1: Create JWT sign/verify helpers**

Create `server/utils/jwt.ts`:

```typescript
import { SignJWT, jwtVerify } from 'jose'

interface TokenPayload {
  name: string
  role: 'member' | 'admin'
}

function getSecret(): Uint8Array {
  const config = useRuntimeConfig()
  return new TextEncoder().encode(config.jwtSecret)
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as unknown as TokenPayload
}
```

- [ ] **Step 2: Commit**

```
git add server/utils/jwt.ts
git commit -m "feat: add JWT sign/verify utilities using jose"
```

---

### Task 4: Auth API route

**Files:**
- Create: `server/api/auth.post.ts`

- [ ] **Step 1: Create the auth endpoint**

Create `server/api/auth.post.ts`:

```typescript
import { signToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, code } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  }

  if (!code || typeof code !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Access code is required' })
  }

  const config = useRuntimeConfig()
  const trimmedName = name.trim()
  let role: 'member' | 'admin'

  if (code === config.adminCode) {
    role = 'admin'
  } else if (code === config.teamCode) {
    role = 'member'
  } else {
    throw createError({ statusCode: 401, statusMessage: 'Invalid access code' })
  }

  const token = await signToken({ name: trimmedName, role })

  return { token, name: trimmedName, role }
})
```

- [ ] **Step 2: Verify auth endpoint works**

Run dev server, then test with curl:

```
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"name":"Dan","code":"team2026"}'
```

Expected: JSON response with token, name, role "member"

- [ ] **Step 3: Commit**

```
git add server/api/auth.post.ts
git commit -m "feat: add POST /api/auth endpoint for code-to-JWT exchange"
```

---

### Task 5: Server auth middleware

**Files:**
- Create: `server/middleware/auth.ts`

- [ ] **Step 1: Create server middleware to validate JWT on API routes**

Create `server/middleware/auth.ts`:

```typescript
import { verifyToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  if (!url.pathname.startsWith('/api/') || url.pathname === '/api/auth') {
    return
  }

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing authorization token' })
  }

  const token = authHeader.slice(7)

  try {
    const payload = await verifyToken(token)
    event.context.auth = payload
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }
})
```

- [ ] **Step 2: Commit**

```
git add server/middleware/auth.ts
git commit -m "feat: add server middleware for JWT validation on API routes"
```

---

## Chunk 3: Availability API Routes

### Task 6: Timezone conversion utility

**Files:**
- Create: `server/utils/timezone.ts`

- [ ] **Step 1: Create timezone conversion helper**

Create `server/utils/timezone.ts`:

```typescript
import { DateTime } from 'luxon'

export function convertToEST(
  time: string,
  dayOfWeek: string,
  sourceTimezone: string
): { estTime: string; estDay: string } {
  const dayMap: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
  }

  const dayNumber = dayMap[dayOfWeek.toLowerCase()]
  if (!dayNumber) {
    throw new Error('Invalid day: ' + dayOfWeek)
  }

  // 2026-03-09 is a Monday
  const referenceDate = 8 + dayNumber
  const [hours, minutes] = time.split(':').map(Number)

  const sourceDateTime = DateTime.fromObject(
    { year: 2026, month: 3, day: referenceDate, hour: hours, minute: minutes },
    { zone: sourceTimezone }
  )

  const estDateTime = sourceDateTime.setZone('America/New_York')
  const estTime = estDateTime.toFormat('HH:mm')

  const reverseDayMap: Record<number, string> = {
    1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday', 7: 'sunday',
  }

  const estDay = reverseDayMap[estDateTime.weekday] || dayOfWeek

  return { estTime, estDay }
}
```

- [ ] **Step 2: Commit**

```
git add server/utils/timezone.ts
git commit -m "feat: add timezone-to-EST conversion utility using luxon"
```

---

### Task 7: Submit availability API route

**Files:**
- Create: `server/api/availability.post.ts`

- [ ] **Step 1: Create the submit endpoint**

Create `server/api/availability.post.ts`:

```typescript
import { eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { availabilitySubmissions } from '~/server/db/schema'
import { convertToEST } from '~/server/utils/timezone'

const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

interface DayEntry {
  day: string
  startTime: string
  endTime: string
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { entries, timezone } = body as { entries: DayEntry[]; timezone: string }

  if (!timezone || typeof timezone !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Timezone is required' })
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'At least one day entry is required' })
  }

  for (const entry of entries) {
    if (!VALID_DAYS.includes(entry.day?.toLowerCase())) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid day: ' + entry.day })
    }
    if (!TIME_REGEX.test(entry.startTime)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid start time: ' + entry.startTime })
    }
    if (!TIME_REGEX.test(entry.endTime)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid end time: ' + entry.endTime })
    }
    if (entry.startTime >= entry.endTime) {
      throw createError({ statusCode: 400, statusMessage: 'Start time must be before end time for ' + entry.day })
    }
  }

  // Delete previous submissions for this developer
  db.delete(availabilitySubmissions)
    .where(eq(availabilitySubmissions.developerName, auth.name))
    .run()

  // Insert new submissions
  const rows = entries.map((entry) => {
    const { estTime: estStart, estDay } = convertToEST(entry.startTime, entry.day, timezone)
    const { estTime: estEnd } = convertToEST(entry.endTime, entry.day, timezone)

    return {
      developerName: auth.name,
      dayOfWeek: estDay,
      startTime: estStart,
      endTime: estEnd,
      originalTimezone: timezone,
      originalStart: entry.startTime,
      originalEnd: entry.endTime,
    }
  })

  for (const row of rows) {
    db.insert(availabilitySubmissions).values(row).run()
  }

  return { success: true, count: rows.length }
})
```

- [ ] **Step 2: Commit**

```
git add server/api/availability.post.ts
git commit -m "feat: add POST /api/availability endpoint for submitting time entries"
```

---

### Task 8: Get availability and export API routes

**Files:**
- Create: `server/api/availability.get.ts`, `server/api/availability/export.get.ts`

- [ ] **Step 1: Create the list endpoint (admin only)**

Create `server/api/availability.get.ts`:

```typescript
import { db } from '~/server/db'
import { availabilitySubmissions } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth || auth.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const rows = db.select().from(availabilitySubmissions).all()
  return rows
})
```

- [ ] **Step 2: Create the export endpoint (admin only)**

Create `server/api/availability/export.get.ts`:

```typescript
import { db } from '~/server/db'
import { availabilitySubmissions } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth || auth.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const rows = db.select().from(availabilitySubmissions).all()

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', 'attachment; filename="availability.json"')

  return rows
})
```

- [ ] **Step 3: Commit**

```
git add server/api/availability.get.ts server/api/availability/export.get.ts
git commit -m "feat: add GET /api/availability and export endpoints (admin only)"
```

---

## Chunk 4: Client-Side Auth and Layout

### Task 9: Auth composable and client middleware

**Files:**
- Create: `composables/useAuth.ts`, `middleware/auth.ts`, `layouts/default.vue`

- [ ] **Step 1: Create auth composable**

Create `composables/useAuth.ts`:

```typescript
interface AuthState {
  token: string | null
  name: string | null
  role: 'member' | 'admin' | null
}

const authState = reactive<AuthState>({
  token: null,
  name: null,
  role: null,
})

export function useAuth() {
  function setAuth(token: string, name: string, role: 'member' | 'admin') {
    authState.token = token
    authState.name = name
    authState.role = role
    if (import.meta.client) {
      sessionStorage.setItem('auth', JSON.stringify({ token, name, role }))
    }
  }

  function loadAuth() {
    if (import.meta.client && !authState.token) {
      const stored = sessionStorage.getItem('auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        authState.token = parsed.token
        authState.name = parsed.name
        authState.role = parsed.role
      }
    }
  }

  function clearAuth() {
    authState.token = null
    authState.name = null
    authState.role = null
    if (import.meta.client) {
      sessionStorage.removeItem('auth')
    }
  }

  function getHeaders(): Record<string, string> {
    return authState.token ? { Authorization: 'Bearer ' + authState.token } : {}
  }

  const isAuthenticated = computed(() => !!authState.token)
  const isAdmin = computed(() => authState.role === 'admin')

  return {
    ...toRefs(authState),
    isAuthenticated,
    isAdmin,
    setAuth,
    loadAuth,
    clearAuth,
    getHeaders,
  }
}
```

- [ ] **Step 2: Create client-side route guard middleware**

Create `middleware/auth.ts`:

```typescript
export default defineNuxtRouteMiddleware((to) => {
  const { loadAuth, isAuthenticated } = useAuth()
  loadAuth()

  if (to.path !== '/' && !isAuthenticated.value) {
    return navigateTo('/')
  }
})
```

- [ ] **Step 3: Create default layout**

Create `layouts/default.vue`:

```vue
<template>
  <div class="min-h-screen bg-white">
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
        <span class="text-sm font-medium text-gray-900">Team Availability</span>
        <button
          v-if="isAuthenticated"
          class="text-xs text-gray-500 hover:text-gray-700"
          @click="logout"
        >
          Sign out
        </button>
      </div>
    </header>
    <main class="mx-auto max-w-3xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, clearAuth } = useAuth()

function logout() {
  clearAuth()
  navigateTo('/')
}
</script>
```

- [ ] **Step 4: Update app.vue to use layout**

Replace `app.vue` with:

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 5: Commit**

```
git add composables/useAuth.ts middleware/auth.ts layouts/default.vue app.vue
git commit -m "feat: add client auth composable, route guard, and layout shell"
```

---

## Chunk 5: Pages -- Entry Gate and Availability Form

### Task 10: Entry gate page

**Files:**
- Create: `pages/index.vue`

- [ ] **Step 1: Create the entry gate page**

Create `pages/index.vue`:

```vue
<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center">
    <div class="w-full max-w-sm">
      <div class="space-y-1 mb-4">
        <h1 class="text-lg font-medium text-gray-900">Sign in</h1>
        <p class="text-sm text-gray-500">Enter your name and team access code.</p>
      </div>

      <form class="space-y-3" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <label for="name" class="text-sm text-gray-700">Name</label>
          <Input id="name" v-model="name" placeholder="Your name" :disabled="loading" />
        </div>

        <div class="space-y-1">
          <label for="code" class="text-sm text-gray-700">Access code</label>
          <Input id="code" v-model="code" type="password" placeholder="Access code" :disabled="loading" />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Continue' }}
        </Button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const name = ref('')
const code = ref('')
const error = ref('')
const loading = ref(false)
const { setAuth } = useAuth()

async function handleSubmit() {
  error.value = ''
  if (!name.value.trim() || !code.value.trim()) {
    error.value = 'Both fields are required.'
    return
  }

  loading.value = true
  try {
    const res = await $fetch('/api/auth', {
      method: 'POST',
      body: { name: name.value.trim(), code: code.value },
    })
    setAuth(res.token, res.name, res.role)

    if (res.role === 'admin') {
      navigateTo('/admin')
    } else {
      navigateTo('/submit')
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Invalid access code.'
  } finally {
    loading.value = false
  }
}
</script>
```

- [ ] **Step 2: Verify the entry gate renders and auth works**

Run dev server, visit http://localhost:3000 -- should see sign-in form.
Enter name + team code -- should redirect to /submit.

- [ ] **Step 3: Commit**

```
git add pages/index.vue
git commit -m "feat: add entry gate page with name and access code form"
```

---

### Task 11: Availability form page

**Files:**
- Create: `pages/submit.vue`

- [ ] **Step 1: Create the availability form page**

Create `pages/submit.vue`:

```vue
<template>
  <div>
    <div class="mb-6 flex items-baseline justify-between">
      <div>
        <h1 class="text-lg font-medium text-gray-900">Weekly Availability</h1>
        <p class="text-sm text-gray-500">
          {{ authName }} &middot; {{ detectedTimezone }}
        </p>
      </div>
    </div>

    <form class="space-y-3" @submit.prevent="handleSubmit">
      <div
        v-for="day in days"
        :key="day.key"
        class="flex items-center gap-3 rounded border border-gray-200 px-3 py-2"
      >
        <div class="w-20 shrink-0">
          <span class="text-sm font-medium text-gray-900">{{ day.label }}</span>
        </div>

        <div class="flex items-center gap-2">
          <Switch :checked="day.available" @update:checked="day.available = $event" />
          <span class="text-xs text-gray-500">
            {{ day.available ? 'Available' : 'Unavailable' }}
          </span>
        </div>

        <template v-if="day.available">
          <div class="ml-auto flex items-center gap-2">
            <select
              v-model="day.startTime"
              class="h-8 rounded border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            >
              <option v-for="t in timeOptions" :key="t" :value="t">{{ formatTime(t) }}</option>
            </select>
            <span class="text-xs text-gray-400">to</span>
            <select
              v-model="day.endTime"
              class="h-8 rounded border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
            >
              <option v-for="t in timeOptions" :key="t" :value="t">{{ formatTime(t) }}</option>
            </select>
          </div>
        </template>

        <span v-else class="ml-auto text-xs text-gray-400">&mdash;</span>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="success" class="text-sm text-green-700">{{ success }}</p>

      <Button type="submit" :disabled="loading">
        {{ loading ? 'Submitting...' : 'Submit Availability' }}
      </Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

definePageMeta({ middleware: 'auth' })

const { name: authName, getHeaders, loadAuth } = useAuth()
loadAuth()

const detectedTimezone = ref('')
onMounted(() => {
  detectedTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone
})

interface DayState {
  key: string
  label: string
  available: boolean
  startTime: string
  endTime: string
}

const days = reactive<DayState[]>([
  { key: 'monday', label: 'Mon', available: true, startTime: '09:00', endTime: '17:00' },
  { key: 'tuesday', label: 'Tue', available: true, startTime: '09:00', endTime: '17:00' },
  { key: 'wednesday', label: 'Wed', available: true, startTime: '09:00', endTime: '17:00' },
  { key: 'thursday', label: 'Thu', available: true, startTime: '09:00', endTime: '17:00' },
  { key: 'friday', label: 'Fri', available: true, startTime: '09:00', endTime: '17:00' },
])

const timeOptions: string[] = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    timeOptions.push(
      String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
    )
  }
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return hour12 + ':' + String(m).padStart(2, '0') + ' ' + period
}

const error = ref('')
const success = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  success.value = ''

  const entries = days
    .filter((d) => d.available)
    .map((d) => ({ day: d.key, startTime: d.startTime, endTime: d.endTime }))

  if (entries.length === 0) {
    error.value = 'Select at least one available day.'
    return
  }

  for (const entry of entries) {
    if (entry.startTime >= entry.endTime) {
      error.value = 'Start time must be before end time for ' + entry.day + '.'
      return
    }
  }

  loading.value = true
  try {
    await $fetch('/api/availability', {
      method: 'POST',
      headers: getHeaders(),
      body: { entries, timezone: detectedTimezone.value },
    })
    success.value = 'Availability submitted successfully.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to submit.'
  } finally {
    loading.value = false
  }
}
</script>
```

- [ ] **Step 2: Verify the form renders and submits**

Run dev server, sign in, toggle days, pick times, submit -- should see success message.

- [ ] **Step 3: Commit**

```
git add pages/submit.vue
git commit -m "feat: add availability form page with time pickers and timezone detection"
```

---

## Chunk 6: Admin Dashboard

### Task 12: Admin dashboard page

**Files:**
- Create: `pages/admin.vue`

- [ ] **Step 1: Create the admin dashboard page**

Create `pages/admin.vue`:

```vue
<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-lg font-medium text-gray-900">Availability Dashboard</h1>
      <Button variant="outline" size="sm" @click="downloadJSON">
        Download JSON
      </Button>
    </div>

    <p v-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>

    <div v-if="!loadError" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="py-2 pr-4 text-left font-medium text-gray-700">Developer</th>
            <th v-for="day in weekdays" :key="day" class="py-2 px-3 text-left font-medium text-gray-700">
              {{ day }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dev in developers" :key="dev.name" class="border-b border-gray-100">
            <td class="py-2 pr-4 font-medium text-gray-900">{{ dev.name }}</td>
            <td v-for="day in weekdayKeys" :key="day" class="py-2 px-3 text-gray-600">
              <span v-if="dev.schedule[day]">
                {{ formatTime(dev.schedule[day]!.start) }} &ndash; {{ formatTime(dev.schedule[day]!.end) }}
              </span>
              <span v-else class="text-gray-300">&mdash;</span>
            </td>
          </tr>

          <tr v-if="developers.length === 0">
            <td :colspan="6" class="py-4 text-center text-gray-400">No submissions yet.</td>
          </tr>

          <tr v-if="developers.length > 1" class="border-t-2 border-gray-300 bg-blue-50">
            <td class="py-2 pr-4 font-medium text-blue-700">Overlap</td>
            <td v-for="day in weekdayKeys" :key="day" class="py-2 px-3">
              <span v-if="overlaps[day]" class="font-medium text-blue-700">
                {{ formatTime(overlaps[day]!.start) }} &ndash; {{ formatTime(overlaps[day]!.end) }}
              </span>
              <span v-else class="text-gray-300">&mdash;</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-4 text-xs text-gray-400">All times shown in Eastern (America/New_York)</p>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

definePageMeta({ middleware: 'auth' })

const { getHeaders, loadAuth, isAdmin } = useAuth()
loadAuth()

const loadError = ref('')

interface TimeRange { start: string; end: string }
interface DevSchedule { name: string; schedule: Record<string, TimeRange | null> }

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const developers = ref<DevSchedule[]>([])
const overlaps = ref<Record<string, TimeRange | null>>({})

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return hour12 + ':' + String(m).padStart(2, '0') + ' ' + period
}

function computeOverlaps(devs: DevSchedule[]) {
  const result: Record<string, TimeRange | null> = {}

  for (const day of weekdayKeys) {
    const ranges = devs
      .map((d) => d.schedule[day])
      .filter((r): r is TimeRange => r !== null)

    if (ranges.length < devs.length || ranges.length === 0) {
      result[day] = null
      continue
    }

    const latestStart = ranges.reduce((max, r) => (r.start > max ? r.start : max), '00:00')
    const earliestEnd = ranges.reduce((min, r) => (r.end < min ? r.end : min), '23:59')

    result[day] = latestStart < earliestEnd ? { start: latestStart, end: earliestEnd } : null
  }

  return result
}

async function fetchData() {
  try {
    const rows = await $fetch<any[]>('/api/availability', { headers: getHeaders() })

    const byDev: Record<string, Record<string, TimeRange>> = {}
    for (const row of rows) {
      if (!byDev[row.developerName]) {
        byDev[row.developerName] = {}
      }
      byDev[row.developerName][row.dayOfWeek] = {
        start: row.startTime,
        end: row.endTime,
      }
    }

    const devList: DevSchedule[] = Object.entries(byDev)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, schedule]) => ({
        name,
        schedule: Object.fromEntries(
          weekdayKeys.map((day) => [day, schedule[day] || null])
        ),
      }))

    developers.value = devList
    overlaps.value = computeOverlaps(devList)
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage || 'Failed to load data.'
  }
}

async function downloadJSON() {
  try {
    const data = await $fetch('/api/availability/export', { headers: getHeaders() })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'availability.json'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    loadError.value = 'Failed to download.'
  }
}

onMounted(() => {
  if (!isAdmin.value) {
    navigateTo('/')
    return
  }
  fetchData()
})
</script>
```

- [ ] **Step 2: Verify admin dashboard end-to-end**

Run dev server:
1. Sign in as member, submit availability
2. Sign out, sign in with admin code
3. Dashboard should show submission in EST
4. Download JSON should work

- [ ] **Step 3: Commit**

```
git add pages/admin.vue
git commit -m "feat: add admin dashboard with availability table, overlap calculation, and JSON export"
```

---

## Chunk 7: Polish and Final Touches

### Task 13: Tailwind theme customization

**Files:**
- Modify: `assets/css/tailwind.css`

- [ ] **Step 1: Customize the blue accent in the CSS variables**

Update the :root block in `assets/css/tailwind.css` to use blue-600 accent:

```css
--primary: 221.2 83.2% 53.3%;
--primary-foreground: 210 40% 98%;
--ring: 221.2 83.2% 53.3%;
```

- [ ] **Step 2: Verify clean design**

Run dev server. Check: buttons are blue, no gradients, no excessive shadows, tight spacing, admin table looks dense and functional.

- [ ] **Step 3: Commit**

```
git add assets/css/tailwind.css
git commit -m "style: customize theme to blue-600 accent, clean light mode"
```

---

### Task 14: Final verification

- [ ] **Step 1: Full end-to-end test**

Run dev server and test:
1. Visit / -- sign-in form renders
2. Enter invalid code -- error message
3. Enter valid team code + name -- redirect to /submit
4. Toggle days, set times, submit -- success message
5. Sign out -- redirect to /
6. Enter admin code -- redirect to /admin
7. Dashboard shows submission, times in EST
8. Overlap row computes correctly
9. Download JSON works
10. Direct visit to /submit or /admin without auth -- redirected to /

- [ ] **Step 2: Final commit**

```
git add -A
git commit -m "chore: final verification pass"
```
