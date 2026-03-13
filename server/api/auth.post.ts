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
