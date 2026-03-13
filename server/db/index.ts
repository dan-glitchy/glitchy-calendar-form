import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Key patterns:
// availability:{name}        → JSON array of day entries
// feedback:counter            → auto-increment ID
// feedback:{id}               → JSON feedback object
// feedback:ids                → list of all feedback IDs
// metadata:availability:{name} → JSON metadata object
// metadata:feedback:{id}      → JSON metadata object
