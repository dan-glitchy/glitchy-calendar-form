import { redis } from '~~/server/db'
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

  let submitterName: string | null = null
  if (includeIdentity) {
    const auth = event.context.auth
    if (auth?.name) {
      submitterName = auth.name
    }
  }

  // Auto-increment feedback ID
  const id = await redis.incr('feedback:counter')

  const entry = {
    id,
    feedbackText: text.trim(),
    submitterName,
    submittedAt: new Date().toISOString(),
  }

  await redis.set(`feedback:${id}`, JSON.stringify(entry))
  await redis.rpush('feedback:ids', id)

  // Collect submission metadata
  collectMetadata(event, 'feedback', String(id), submitterName)

  return { success: true }
})
