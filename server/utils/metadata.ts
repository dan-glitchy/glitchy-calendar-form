import { db } from '~~/server/db'
import { submissionMetadata } from '~~/server/db/schema'
import type { H3Event } from 'h3'

export function collectMetadata(
  event: H3Event,
  submissionType: 'availability' | 'feedback',
  submissionId: number,
  userName: string | null,
) {
  // Everything extracted server-side from standard HTTP headers
  const userAgent = getHeader(event, 'user-agent') || null
  const acceptHeader = getHeader(event, 'accept') || null
  const acceptLanguage = getHeader(event, 'accept-language') || null

  // Extract IP from common proxy/load-balancer headers
  const forwarded = getHeader(event, 'x-forwarded-for')
  const realIp = getHeader(event, 'x-real-ip')
  const ipAddress = forwarded?.split(',')[0]?.trim() || realIp || null

  // Parse primary language from Accept-Language header
  // e.g. "en-US,en;q=0.9,ja;q=0.8" -> language="en-US", languages="en-US,en,ja"
  let language: string | null = null
  let languages: string | null = null
  if (acceptLanguage) {
    const parts = acceptLanguage.split(',').map(p => p.split(';')[0].trim())
    language = parts[0] || null
    languages = parts.join(',')
  }

  // Sec-CH-UA headers (sent automatically by Chromium browsers)
  const secChUaPlatform = getHeader(event, 'sec-ch-ua-platform')?.replace(/"/g, '') || null
  const secChUaMobile = getHeader(event, 'sec-ch-ua-mobile')

  db.insert(submissionMetadata).values({
    submissionType,
    submissionId,
    userName,
    userAgent,
    language,
    languages,
    platform: secChUaPlatform,
    screenWidth: null,
    screenHeight: null,
    colorDepth: null,
    timezone: null,
    timezoneOffset: null,
    touchSupport: secChUaMobile === '?1' ? 1 : 0,
    hardwareConcurrency: null,
    deviceMemory: null,
    ipAddress,
    acceptHeader,
  }).run()
}
