import { redis } from '~~/server/db'
import type { MetadataEntry } from '~~/server/db/schema'
import type { H3Event } from 'h3'

export function collectMetadata(
  event: H3Event,
  submissionType: 'availability' | 'feedback',
  submissionId: string,
  userName: string | null,
) {
  const userAgent = getHeader(event, 'user-agent') || null
  const acceptHeader = getHeader(event, 'accept') || null
  const acceptLanguage = getHeader(event, 'accept-language') || null

  const forwarded = getHeader(event, 'x-forwarded-for')
  const realIp = getHeader(event, 'x-real-ip')
  const ipAddress = forwarded?.split(',')[0]?.trim() || realIp || null

  let language: string | null = null
  let languages: string | null = null
  if (acceptLanguage) {
    const parts = acceptLanguage.split(',').map(p => p.split(';')[0].trim())
    language = parts[0] || null
    languages = parts.join(',')
  }

  const secChUaPlatform = getHeader(event, 'sec-ch-ua-platform')?.replace(/"/g, '') || null
  const secChUaMobile = getHeader(event, 'sec-ch-ua-mobile')

  const entry: MetadataEntry = {
    submissionType,
    submissionId,
    userName,
    userAgent,
    language,
    languages,
    platform: secChUaPlatform,
    timezone: null,
    timezoneOffset: null,
    touchSupport: secChUaMobile === '?1' ? 1 : 0,
    hardwareConcurrency: null,
    deviceMemory: null,
    ipAddress,
    acceptHeader,
    collectedAt: new Date().toISOString(),
  }

  const key = `metadata:${submissionType}:${submissionId}`
  redis.set(key, JSON.stringify(entry))
}
