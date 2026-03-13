import { redis } from '~~/server/db'
import type { AvailabilityEntry } from '~~/server/db/schema'
import { convertToEST } from '~~/server/utils/timezone'
import { collectMetadata } from '~~/server/utils/metadata'

const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
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

  const rows: AvailabilityEntry[] = entries.map((entry) => {
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
      submittedAt: new Date().toISOString(),
    }
  })

  // Store availability keyed by developer name (replaces previous)
  await redis.set(`availability:${auth.name}`, JSON.stringify(rows))

  // Track this developer in the set of all developers
  await redis.sadd('developers', auth.name)

  // Collect submission metadata
  collectMetadata(event, 'availability', auth.name, auth.name)

  return { success: true, count: rows.length }
})
