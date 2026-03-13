export default defineEventHandler(async (event) => {
  // Try to detect timezone from IP using worldtimeapi
  try {
    const response = await fetch('https://worldtimeapi.org/api/ip')
    if (response.ok) {
      const data = await response.json()
      return { timezone: data.timezone, source: 'ip' }
    }
  } catch {
    // Fall through to null
  }

  return { timezone: null, source: 'unavailable' }
})
