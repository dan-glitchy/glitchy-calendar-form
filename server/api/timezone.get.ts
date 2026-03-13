export default defineEventHandler(async (event) => {
  // Get client IP from request headers or connection
  const forwarded = getHeader(event, 'x-forwarded-for')
  const clientIp = forwarded?.split(',')[0]?.trim() || getRequestIP(event) || ''

  try {
    // Use ip-api.com — pass client IP if available, otherwise it uses the requesting IP
    const url = clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1'
      ? `http://ip-api.com/json/${clientIp}?fields=timezone`
      : 'http://ip-api.com/json/?fields=timezone'

    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      if (data.timezone) {
        return { timezone: data.timezone, source: 'ip' }
      }
    }
  } catch {
    // Fall through
  }

  return { timezone: null, source: 'unavailable' }
})
