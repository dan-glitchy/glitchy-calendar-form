import { db } from '~~/server/db'
import { anonymousFeedback } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text } = body

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Feedback text is required' })
  }

  if (text.trim().length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'Feedback must be under 2000 characters' })
  }

  db.insert(anonymousFeedback).values({ feedbackText: text.trim() }).run()

  return { success: true }
})
