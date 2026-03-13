import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const availabilitySubmissions = sqliteTable('availability_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  developerName: text('developer_name').notNull(),
  dayOfWeek: text('day_of_week').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  originalTimezone: text('original_timezone').notNull(),
  originalStart: text('original_start').notNull(),
  originalEnd: text('original_end').notNull(),
  submittedAt: text('submitted_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
})

export type AvailabilitySubmission = typeof availabilitySubmissions.$inferSelect
export type InsertAvailabilitySubmission = typeof availabilitySubmissions.$inferInsert

export const anonymousFeedback = sqliteTable('anonymous_feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  feedbackText: text('feedback_text').notNull(),
  submitterName: text('submitter_name'),
  submittedAt: text('submitted_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
})

// Stores additional submission metadata for analytics
export const submissionMetadata = sqliteTable('submission_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // 'availability' or 'feedback'
  submissionType: text('submission_type').notNull(),
  // Links to availability or feedback id
  submissionId: integer('submission_id').notNull(),
  // Authenticated user name (null for anonymous feedback)
  userName: text('user_name'),
  // Browser metadata fields
  userAgent: text('user_agent'),
  language: text('language'),
  languages: text('languages'),
  platform: text('platform'),
  screenWidth: integer('screen_width'),
  screenHeight: integer('screen_height'),
  colorDepth: integer('color_depth'),
  timezone: text('timezone'),
  timezoneOffset: integer('timezone_offset'),
  touchSupport: integer('touch_support'),
  hardwareConcurrency: integer('hardware_concurrency'),
  deviceMemory: integer('device_memory'),
  // Request metadata
  ipAddress: text('ip_address'),
  acceptHeader: text('accept_header'),
  // Timestamp
  collectedAt: text('collected_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
})
