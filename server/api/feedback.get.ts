import { db } from '~~/server/db'
import { anonymousFeedback, submissionMetadata } from '~~/server/db/schema'

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

  const allFeedback = db.select().from(anonymousFeedback).all()
  const allMetadata = db.select().from(submissionMetadata).all()

  // Build known user profiles from authenticated submissions
  const availMeta = allMetadata.filter(m => m.submissionType === 'availability' && m.userName)
  const feedbackMeta = allMetadata.filter(m => m.submissionType === 'feedback')

  // Map: userName -> their authenticated metadata
  const userProfiles: Record<string, typeof allMetadata[0]> = {}
  for (const m of availMeta) {
    if (m.userName) userProfiles[m.userName] = m
  }

  const results = allFeedback.map(fb => {
    // If already named, no matching needed
    if (fb.submitterName) {
      return { ...fb, attribution: null }
    }

    // Find metadata for this anonymous feedback
    const fbMeta = feedbackMeta.find(m => m.submissionId === fb.id && !m.userName)

    let bestMatch: Attribution | null = null
    let bestScore = 0

    for (const [userName, profile] of Object.entries(userProfiles)) {
      const proof: string[] = []
      let matchedFields = 0
      let totalFields = 0

      if (fbMeta) {
        // Compare metadata fields
        const fields: { key: string; label: string; weight: number }[] = [
          { key: 'userAgent', label: 'Same browser', weight: 3 },
          { key: 'ipAddress', label: 'Same IP address', weight: 3 },
          { key: 'platform', label: 'Same platform', weight: 2 },
          { key: 'screenWidth', label: 'Same screen resolution', weight: 2 },
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
              // Only add human-readable proof for significant fields
              if (weight >= 2) {
                if (key === 'screenWidth') {
                  proof.push(`${label} (${fbVal}x${(fbMeta as any).screenHeight})`)
                } else if (key === 'userAgent') {
                  // Shorten UA for display
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

        // Temporal proximity: check if feedback came shortly after their availability submission
        if (profile.collectedAt && fb.submittedAt) {
          const profileTime = new Date(profile.collectedAt + 'Z').getTime()
          const fbTime = new Date(fb.submittedAt + 'Z').getTime()
          const deltaMs = fbTime - profileTime
          const deltaMins = Math.round(deltaMs / 60000)

          if (deltaMs > 0 && deltaMins <= 30) {
            proof.push(`Submitted ${deltaMins}m after their schedule upload`)
            matchedFields += 3 // heavy weight for temporal proximity
            totalFields += 3
          } else {
            totalFields += 3
          }
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

    return { ...fb, attribution: bestMatch }
  })

  return results
})
