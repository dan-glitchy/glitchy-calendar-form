import { verifyToken } from '~~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  if (!url.pathname.startsWith('/api/') || url.pathname === '/api/auth') {
    return
  }

  // Feedback POST: auth is optional (used only if user opts into identity)
  const method = getMethod(event)
  if (url.pathname === '/api/feedback' && method === 'POST') {
    const authHeader = getHeader(event, 'authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        event.context.auth = await verifyToken(authHeader.slice(7))
      } catch {
        // Invalid token is fine — just treat as anonymous
      }
    }
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
