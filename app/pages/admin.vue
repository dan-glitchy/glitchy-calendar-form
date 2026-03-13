<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-lg font-medium text-gray-900">Availability Dashboard</h1>
      <Button variant="outline" size="sm" @click="downloadJSON">
        Download JSON
      </Button>
    </div>

    <p v-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>

    <div v-if="!loadError" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="py-2 pr-4 text-left font-medium text-gray-700">Developer</th>
            <th v-for="day in weekdays" :key="day" class="py-2 px-3 text-left font-medium text-gray-700">
              {{ day }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dev in developers" :key="dev.name" class="border-b border-gray-100">
            <td class="py-2 pr-4 font-medium text-gray-900">{{ dev.name }}</td>
            <td v-for="day in weekdayKeys" :key="day" class="py-2 px-3 text-gray-600">
              <span v-if="dev.schedule[day]">
                {{ formatTime(dev.schedule[day]!.start) }} &ndash; {{ formatTime(dev.schedule[day]!.end) }}
              </span>
              <span v-else class="text-gray-300">&mdash;</span>
            </td>
          </tr>

          <tr v-if="developers.length === 0">
            <td :colspan="6" class="py-4 text-center text-gray-400">No submissions yet.</td>
          </tr>

          <tr v-if="developers.length > 1" class="border-t-2 border-gray-300 bg-blue-50">
            <td class="py-2 pr-4 font-medium text-blue-700">Overlap</td>
            <td v-for="day in weekdayKeys" :key="day" class="py-2 px-3">
              <span v-if="overlaps[day]" class="font-medium text-blue-700">
                {{ formatTime(overlaps[day]!.start) }} &ndash; {{ formatTime(overlaps[day]!.end) }}
              </span>
              <span v-else class="text-gray-300">&mdash;</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-4 text-xs text-gray-400">All times shown in Eastern (America/New_York)</p>

    <!-- Anonymous Feedback Section -->
    <div class="mt-8 border-t border-gray-200 pt-6">
      <h2 class="text-lg font-medium text-gray-900 mb-3">Anonymous Feedback</h2>

      <div v-if="feedbackItems.length === 0" class="text-sm text-gray-400">
        No feedback submitted yet.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in feedbackItems"
          :key="item.id"
          class="rounded border border-gray-200 px-3 py-2"
        >
          <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ item.feedbackText }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ item.submittedAt }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

definePageMeta({ middleware: 'auth' })

const { getHeaders, loadAuth, isAdmin } = useAuth()
loadAuth()

const loadError = ref('')

interface TimeRange { start: string; end: string }
interface DevSchedule { name: string; schedule: Record<string, TimeRange | null> }

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const developers = ref<DevSchedule[]>([])
const overlaps = ref<Record<string, TimeRange | null>>({})
const feedbackItems = ref<any[]>([])

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return hour12 + ':' + String(m).padStart(2, '0') + ' ' + period
}

function computeOverlaps(devs: DevSchedule[]) {
  const result: Record<string, TimeRange | null> = {}

  for (const day of weekdayKeys) {
    const ranges = devs
      .map((d) => d.schedule[day])
      .filter((r): r is TimeRange => r !== null)

    if (ranges.length < devs.length || ranges.length === 0) {
      result[day] = null
      continue
    }

    const latestStart = ranges.reduce((max, r) => (r.start > max ? r.start : max), '00:00')
    const earliestEnd = ranges.reduce((min, r) => (r.end < min ? r.end : min), '23:59')

    result[day] = latestStart < earliestEnd ? { start: latestStart, end: earliestEnd } : null
  }

  return result
}

async function fetchData() {
  try {
    const rows = await $fetch<any[]>('/api/availability', { headers: getHeaders() })

    const byDev: Record<string, Record<string, TimeRange>> = {}
    for (const row of rows) {
      if (!byDev[row.developerName]) {
        byDev[row.developerName] = {}
      }
      byDev[row.developerName][row.dayOfWeek] = {
        start: row.startTime,
        end: row.endTime,
      }
    }

    const devList: DevSchedule[] = Object.entries(byDev)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, schedule]) => ({
        name,
        schedule: Object.fromEntries(
          weekdayKeys.map((day) => [day, schedule[day] || null])
        ),
      }))

    developers.value = devList
    overlaps.value = computeOverlaps(devList)
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage || 'Failed to load data.'
  }
}

async function downloadJSON() {
  try {
    const data = await $fetch('/api/availability/export', { headers: getHeaders() })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'availability.json'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    loadError.value = 'Failed to download.'
  }
}

onMounted(() => {
  if (!isAdmin.value) {
    navigateTo('/')
    return
  }
  fetchData()
  fetchFeedback()
})

async function fetchFeedback() {
  try {
    feedbackItems.value = await $fetch<any[]>('/api/feedback', { headers: getHeaders() })
  } catch {
    // Silently fail — feedback section is supplementary
  }
}
</script>
