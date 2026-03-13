import { db } from '~~/server/db'
import { anonymousFeedback } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth || auth.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const rows = db.select().from(anonymousFeedback).all()
  return rows
})
