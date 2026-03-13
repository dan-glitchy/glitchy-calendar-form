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
            <th class="py-2 px-3 text-left font-medium text-gray-700">Mon &ndash; Fri (EST)</th>
            <th class="py-2 px-3 text-left font-medium text-gray-700">Local Time</th>
            <th class="py-2 px-3 text-left font-medium text-gray-700">Timezone</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dev in developers" :key="dev.name" class="border-b border-gray-100">
            <td class="py-2 pr-4 font-medium text-gray-900">{{ dev.name }}</td>
            <td class="py-2 px-3 text-gray-600">
              {{ formatTime(dev.estStart) }} &ndash; {{ formatTime(dev.estEnd) }}
            </td>
            <td class="py-2 px-3 text-gray-400">
              {{ formatTime(dev.localStart) }} &ndash; {{ formatTime(dev.localEnd) }}
            </td>
            <td class="py-2 px-3 text-gray-400 text-xs">{{ dev.timezone }}</td>
          </tr>

          <tr v-if="developers.length === 0">
            <td colspan="4" class="py-4 text-center text-gray-400">No submissions yet.</td>
          </tr>

          <tr v-if="developers.length > 1" class="border-t-2 border-gray-300 bg-blue-50">
            <td class="py-2 pr-4 font-medium text-blue-700">Overlap</td>
            <td class="py-2 px-3" colspan="3">
              <span v-if="overlap" class="font-medium text-blue-700">
                {{ formatTime(overlap.start) }} &ndash; {{ formatTime(overlap.end) }}
              </span>
              <span v-else class="text-gray-400">No overlap found</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-4 text-xs text-gray-400">All times shown in Eastern (America/New_York) unless noted</p>

    <!-- Timeline View -->
    <div v-if="developers.length > 0" class="mt-8 border-t border-gray-200 pt-6">
      <h2 class="text-lg font-medium text-gray-900 mb-4">Timeline (EST)</h2>

      <div class="overflow-x-auto -mx-4 px-4">
      <div class="relative" style="min-width: 1100px;">
        <!-- Hour labels -->
        <div class="relative h-5 ml-28">
          <div
            v-for="hour in timelineHours"
            :key="hour"
            class="absolute text-[10px] text-gray-400 -translate-x-1/2"
            :style="{ left: timeToPercent(hour, 0) + '%' }"
          >
            {{ formatHourLabel(hour) }}
          </div>
        </div>

        <!-- Grid area -->
        <div class="relative ml-28">
          <!-- Hour grid lines -->
          <div class="absolute inset-0">
            <div
              v-for="hour in timelineHours"
              :key="'line-' + hour"
              class="absolute top-0 bottom-0 border-l"
              :class="hour === 0 || hour === 12 ? 'border-gray-200' : 'border-gray-100'"
              :style="{ left: timeToPercent(hour, 0) + '%' }"
            />
          </div>

          <!-- Overlap band -->
          <div
            v-if="overlap"
            class="absolute inset-y-0 bg-blue-50/60 border-l border-r border-blue-200/50"
            :style="{
              left: timeStringToPercent(overlap.start) + '%',
              width: (timeStringToPercent(overlap.end) - timeStringToPercent(overlap.start)) + '%',
            }"
          />

          <!-- Current time indicator -->
          <div
            v-if="currentTimePercent >= 0"
            class="absolute top-0 bottom-0 border-l border-dashed border-red-400 z-10"
            :style="{ left: currentTimePercent + '%' }"
          >
            <span class="absolute -top-5 -translate-x-1/2 text-[9px] text-red-400 font-medium">Now</span>
          </div>

          <!-- Developer rows -->
          <div
            v-for="dev in developers"
            :key="'bar-' + dev.name"
            class="relative pt-4 mb-1"
          >
            <div class="absolute -left-28 w-28 pr-3 text-xs font-medium text-gray-700 truncate text-right" style="top: 50%; transform: translateY(-50%);">
              {{ dev.name }}
            </div>
            <!-- Time label above the end of the bar -->
            <div
              class="absolute -top-0.5 text-[10px] text-blue-600 font-medium whitespace-nowrap"
              :style="{ left: dev.estStart < dev.estEnd ? timeStringToPercent(dev.estEnd) + '%' : timeStringToPercent(dev.estEnd) + '%', transform: 'translateX(-100%)' }"
            >
              {{ formatTime(dev.estStart) }} &ndash; {{ formatTime(dev.estEnd) }}
            </div>
            <!-- Normal bar (start < end) -->
            <template v-if="dev.estStart < dev.estEnd">
              <div
                class="relative rounded bg-blue-200 border border-blue-300 h-7"
                :style="barStyle(dev.estStart, dev.estEnd)"
              />
            </template>
            <!-- Wrap-around bar (start > end, e.g. 20:00-04:00) -->
            <template v-else>
              <div
                class="absolute top-4 h-7 rounded-l bg-blue-200 border border-blue-300 border-r-0"
                :style="barStyle(dev.estStart, '24:00')"
              />
              <div
                class="absolute top-4 h-7 rounded-r bg-blue-200 border border-blue-300 border-l-0"
                :style="barStyle('00:00', dev.estEnd)"
              />
            </template>
          </div>

          <!-- Overlap label row -->
          <div v-if="overlap" class="relative h-6 mt-1">
            <div class="absolute -left-28 w-28 pr-3 text-xs font-medium text-blue-600 text-right">Overlap</div>
            <div
              class="absolute top-0 bottom-0 flex items-center justify-center"
              :style="{
                left: timeStringToPercent(overlap.start) + '%',
                width: (timeStringToPercent(overlap.end) - timeStringToPercent(overlap.start)) + '%',
              }"
            >
              <span class="text-[10px] font-medium text-blue-600 whitespace-nowrap">
                {{ formatTime(overlap.start) }} &ndash; {{ formatTime(overlap.end) }}
              </span>
            </div>
          </div>

          <!-- No overlap row -->
          <div v-else-if="developers.length > 1" class="relative h-6 mt-1">
            <div class="absolute -left-28 w-28 pr-3 text-xs text-gray-400 text-right">No overlap</div>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- Feedback Section -->
    <div class="mt-8 border-t border-gray-200 pt-6">
      <h2 class="text-lg font-medium text-gray-900 mb-3">Feedback</h2>

      <div v-if="feedbackItems.length === 0" class="text-sm text-gray-400">
        No feedback submitted yet.
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in feedbackItems"
          :key="item.id"
          class="rounded border border-gray-200 px-3 py-2"
        >
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span v-if="item.submitterName" class="text-xs font-medium text-gray-900">{{ item.submitterName }}</span>
            <span v-else class="text-xs font-medium text-gray-400 italic">Anonymous</span>

            <!-- De-anonymization pill -->
            <button
              v-if="!item.submitterName && item.attribution"
              class="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full cursor-pointer"
              :class="{
                'bg-red-100 text-red-700': item.attribution.confidence === 'high',
                'bg-amber-100 text-amber-700': item.attribution.confidence === 'medium',
                'bg-gray-100 text-gray-500': item.attribution.confidence === 'low',
              }"
              @click="toggleProof(item.id)"
            >
              Could be {{ item.attribution.userName }}
              <svg class="w-3 h-3 transition-transform" :class="expandedProof.has(item.id) ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
            </button>

            <span class="text-xs text-gray-300">&middot;</span>
            <span class="text-xs text-gray-400">{{ item.submittedAt }}</span>
          </div>

          <!-- Proof dropdown -->
          <div
            v-if="item.attribution && expandedProof.has(item.id)"
            class="mb-2 ml-0.5 rounded bg-gray-50 border border-gray-200 px-2.5 py-2"
          >
            <p class="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Evidence</p>
            <ul class="space-y-0.5">
              <li
                v-for="(p, i) in item.attribution.proof"
                :key="i"
                class="text-[11px] text-gray-600 flex items-center gap-1.5"
              >
                <span class="w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                {{ p }}
              </li>
            </ul>
          </div>

          <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ item.feedbackText }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'

definePageMeta({ middleware: 'auth', layout: 'admin' })

const { getHeaders, loadAuth, isAdmin } = useAuth()
loadAuth()

const loadError = ref('')

interface DevEntry {
  name: string
  estStart: string
  estEnd: string
  localStart: string
  localEnd: string
  timezone: string
}

interface TimeRange { start: string; end: string }

const developers = ref<DevEntry[]>([])
const overlap = ref<TimeRange | null>(null)
const feedbackItems = ref<any[]>([])
const expandedProof = ref<Set<number>>(new Set())

function toggleProof(id: number) {
  if (expandedProof.value.has(id)) {
    expandedProof.value.delete(id)
  } else {
    expandedProof.value.add(id)
  }
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return hour12 + ':' + String(m).padStart(2, '0') + ' ' + period
}

// --- Timeline (24-hour) ---
const timelineHours = computed(() => {
  const hours: number[] = []
  for (let h = 0; h <= 24; h++) {
    hours.push(h)
  }
  return hours
})

function formatHourLabel(h: number): string {
  if (h === 0 || h === 24) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? h + 'a' : (h - 12) + 'p'
}

function timeToPercent(h: number, m: number): number {
  return ((h + m / 60) / 24) * 100
}

function timeStringToPercent(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return timeToPercent(h, m)
}

function barStyle(start: string, end: string): Record<string, string> {
  const left = timeStringToPercent(start)
  const right = timeStringToPercent(end)
  return {
    left: left + '%',
    width: (right - left) + '%',
  }
}

const currentTimePercent = computed(() => {
  const now = new Date()
  const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  const est = new Date(estString)
  return timeToPercent(est.getHours(), est.getMinutes())
})

function computeOverlap(devs: DevEntry[]): TimeRange | null {
  if (devs.length < 2) return null

  const latestStart = devs.reduce((max, d) => (d.estStart > max ? d.estStart : max), '00:00')
  const earliestEnd = devs.reduce((min, d) => (d.estEnd < min ? d.estEnd : min), '23:59')

  return latestStart < earliestEnd ? { start: latestStart, end: earliestEnd } : null
}

async function fetchData() {
  try {
    const rows = await $fetch<any[]>('/api/availability', { headers: getHeaders() })

    // Since all weekdays have the same time, just take the first entry per developer
    const byDev: Record<string, DevEntry> = {}
    for (const row of rows) {
      if (!byDev[row.developerName]) {
        byDev[row.developerName] = {
          name: row.developerName,
          estStart: row.startTime,
          estEnd: row.endTime,
          localStart: row.originalStart,
          localEnd: row.originalEnd,
          timezone: row.originalTimezone,
        }
      }
    }

    const devList = Object.values(byDev).sort((a, b) => a.name.localeCompare(b.name))
    developers.value = devList
    overlap.value = computeOverlap(devList)
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
    // Silently fail
  }
}
</script>
