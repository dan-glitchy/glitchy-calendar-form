// Type definitions for Redis data structures

export interface AvailabilityEntry {
  developerName: string
  dayOfWeek: string
  startTime: string
  endTime: string
  originalTimezone: string
  originalStart: string
  originalEnd: string
  submittedAt: string
}

export interface FeedbackEntry {
  id: number
  feedbackText: string
  submitterName: string | null
  submittedAt: string
}

export interface MetadataEntry {
  submissionType: 'availability' | 'feedback'
  submissionId: string
  userName: string | null
  userAgent: string | null
  language: string | null
  languages: string | null
  platform: string | null
  timezone: string | null
  timezoneOffset: number | null
  touchSupport: number
  hardwareConcurrency: number | null
  deviceMemory: number | null
  ipAddress: string | null
  acceptHeader: string | null
  collectedAt: string
}
