import { db } from '~~/server/db'
import { availabilitySubmissions } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth || auth.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const rows = db.select().from(availabilitySubmissions).all()
  return rows
})
