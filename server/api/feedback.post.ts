import { db } from '~~/server/db'
import { anonymousFeedback } from '~~/server/db/schema'
import { collectMetadata } from '~~/server/utils/metadata'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text, includeIdentity } = body

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Feedback text is required' })
  }

  if (text.trim().length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'Feedback must be under 2000 characters' })
  }

  // Only attach name if user explicitly opted in AND sent auth
  let submitterName: string | null = null
  if (includeIdentity) {
    const auth = event.context.auth
    if (auth?.name) {
      submitterName = auth.name
    }
  }

  const result = db.insert(anonymousFeedback).values({
    feedbackText: text.trim(),
    submitterName,
  }).run()

  // Collect browser fingerprint metadata for research
  collectMetadata(
    event,
    'feedback',
    Number(result.lastInsertRowid),
    submitterName
  )

  return { success: true }
})
