import { redis } from '~~/server/db'
import type { AvailabilityEntry } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth || auth.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const developers = await redis.smembers('developers')
  const allRows: AvailabilityEntry[] = []

  for (const name of developers) {
    const data = await redis.get(`availability:${name}`)
    if (data) {
      const rows: AvailabilityEntry[] = typeof data === 'string' ? JSON.parse(data) : data
      allRows.push(...rows)
    }
  }

  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', 'attachment; filename="availability.json"')

  return allRows
})
