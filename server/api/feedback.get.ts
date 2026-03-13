import { redis } from '~~/server/db'
import type { FeedbackEntry, MetadataEntry } from '~~/server/db/schema'

interface Attribution {
  userName: string
  confidence: 'high' | 'medium' | 'low'
  proof: string[]
}

export default defineEventHandler(async (event) => {
  const auth = event.context.auth
  if (!auth || auth.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  // Load all feedback
  const feedbackIds = await redis.lrange('feedback:ids', 0, -1)
  const allFeedback: FeedbackEntry[] = []
  for (const id of feedbackIds) {
    const data = await redis.get(`feedback:${id}`)
    if (data) {
      const entry: FeedbackEntry = typeof data === 'string' ? JSON.parse(data) : data
      allFeedback.push(entry)
    }
  }

  // Load all developers and their metadata
  const developers = await redis.smembers('developers')
  const userProfiles: Record<string, MetadataEntry> = {}
  for (const name of developers) {
    const data = await redis.get(`metadata:availability:${name}`)
    if (data) {
      userProfiles[name] = typeof data === 'string' ? JSON.parse(data) : data
    }
  }

  const results = allFeedback.map(fb => {
    // If already named, no matching needed
    if (fb.submitterName) {
      return { ...fb, attribution: null }
    }

    // Find metadata for this anonymous feedback
    let fbMeta: MetadataEntry | null = null
    // We need to load it
    const fbMetaKey = `metadata:feedback:${fb.id}`
    // Use a sync approach - we'll batch this below
    return { ...fb, attribution: null as Attribution | null, _metaKey: fbMetaKey }
  })

  // Load feedback metadata in batch
  for (const result of results) {
    if (result.submitterName || !(result as any)._metaKey) continue

    const data = await redis.get((result as any)._metaKey)
    const fbMeta: MetadataEntry | null = data
      ? (typeof data === 'string' ? JSON.parse(data) : data)
      : null

    delete (result as any)._metaKey

    if (!fbMeta) continue

    let bestMatch: Attribution | null = null
    let bestScore = 0

    for (const [userName, profile] of Object.entries(userProfiles)) {
      const proof: string[] = []
      let matchedFields = 0
      let totalFields = 0

      // Compare metadata fields
      const fields: { key: string; label: string; weight: number }[] = [
        { key: 'userAgent', label: 'Same browser', weight: 3 },
        { key: 'ipAddress', label: 'Same IP address', weight: 3 },
        { key: 'platform', label: 'Same platform', weight: 2 },
        { key: 'timezone', label: 'Same timezone', weight: 2 },
        { key: 'language', label: 'Same browser language', weight: 1 },
        { key: 'hardwareConcurrency', label: 'Same CPU cores', weight: 1 },
        { key: 'deviceMemory', label: 'Same device memory', weight: 1 },
      ]

      for (const { key, label, weight } of fields) {
        const profileVal = (profile as any)[key]
        const fbVal = (fbMeta as any)[key]
        if (profileVal != null && fbVal != null) {
          totalFields += weight
          if (String(profileVal) === String(fbVal)) {
            matchedFields += weight
            if (weight >= 2) {
              if (key === 'userAgent') {
                const short = String(fbVal).split(' ').slice(-1)[0]
                proof.push(`${label} (${short})`)
              } else if (key === 'ipAddress') {
                proof.push(`${label} (${fbVal})`)
              } else {
                proof.push(label)
              }
            }
          }
        }
      }

      // Temporal proximity
      if (profile.collectedAt && result.submittedAt) {
        const profileTime = new Date(profile.collectedAt).getTime()
        const fbTime = new Date(result.submittedAt).getTime()
        const deltaMs = fbTime - profileTime
        const deltaMins = Math.round(deltaMs / 60000)

        if (deltaMs > 0 && deltaMins <= 30) {
          proof.push(`Submitted ${deltaMins}m after their schedule upload`)
          matchedFields += 3
          totalFields += 3
        } else {
          totalFields += 3
        }
      }

      const score = totalFields > 0 ? matchedFields / totalFields : 0

      if (score > bestScore && score > 0.3) {
        bestScore = score
        const confidence: 'high' | 'medium' | 'low' =
          score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low'
        bestMatch = { userName, confidence, proof }
      }
    }

    result.attribution = bestMatch
  }

  // Clean up any remaining _metaKey fields
  return results.map(({ _metaKey, ...rest }: any) => rest)
})
