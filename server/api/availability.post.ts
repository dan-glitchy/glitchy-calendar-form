import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { availabilitySubmissions } from '~~/server/db/schema'
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

  let firstId: number | null = null
  for (const row of rows) {
    const result = db.insert(availabilitySubmissions).values(row).run()
    if (firstId === null) firstId = Number(result.lastInsertRowid)
  }

  // Collect submission metadata
  if (firstId !== null) {
    collectMetadata(event, 'availability', firstId, auth.name)
  }

  return { success: true, count: rows.length }
})
