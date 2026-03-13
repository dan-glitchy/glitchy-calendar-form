import { DateTime } from 'luxon'

export function convertToEST(
  time: string,
  dayOfWeek: string,
  sourceTimezone: string
): { estTime: string; estDay: string } {
  const dayMap: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
  }

  const dayNumber = dayMap[dayOfWeek.toLowerCase()]
  if (!dayNumber) {
    throw new Error('Invalid day: ' + dayOfWeek)
  }

  // Use a reference week well within standard time (Jan 2026)
  // 2026-01-05 is a Monday
  const referenceDate = 4 + dayNumber
  const [hours, minutes] = time.split(':').map(Number)

  const sourceDateTime = DateTime.fromObject(
    { year: 2026, month: 1, day: referenceDate, hour: hours, minute: minutes },
    { zone: sourceTimezone }
  )

  const estDateTime = sourceDateTime.setZone('America/New_York')
  const estTime = estDateTime.toFormat('HH:mm')

  const reverseDayMap: Record<number, string> = {
    1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday', 7: 'sunday',
  }

  const estDay = reverseDayMap[estDateTime.weekday] || dayOfWeek

  return { estTime, estDay }
}
