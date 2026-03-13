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
  submittedAt: text('submitted_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
})
