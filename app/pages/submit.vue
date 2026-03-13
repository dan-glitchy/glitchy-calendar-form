<template>
  <div>
    <!-- Step indicator -->
    <div class="mb-6 flex items-center gap-2 text-xs text-gray-400">
      <button
        v-for="(s, i) in stepLabels"
        :key="i"
        class="flex items-center gap-1.5"
        :class="step === i + 1 ? 'text-blue-600 font-medium' : step > i + 1 ? 'text-gray-600' : ''"
        :disabled="i + 1 > step"
        @click="i + 1 < step && (step = i + 1)"
      >
        <span
          class="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium"
          :class="step === i + 1 ? 'bg-blue-600 text-white' : step > i + 1 ? 'bg-gray-300 text-white' : 'bg-gray-100 text-gray-400'"
        >{{ i + 1 }}</span>
        {{ s }}
      </button>
    </div>

    <!-- Step 1: Timezone -->
    <div v-if="step === 1">
      <h1 class="text-lg font-medium text-gray-900 mb-1">Your timezone</h1>
      <p class="text-sm text-gray-500 mb-4">We'll convert your availability to Eastern Time so the team can sync up.</p>

      <div class="space-y-3">
        <div
          class="flex items-center gap-3 rounded border px-3 py-3 cursor-pointer"
          :class="tzMode === 'auto' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'"
          @click="tzMode = 'auto'"
        >
          <span
            class="flex h-4 w-4 items-center justify-center rounded-full border-2"
            :class="tzMode === 'auto' ? 'border-blue-600' : 'border-gray-300'"
          >
            <span v-if="tzMode === 'auto'" class="h-2 w-2 rounded-full bg-blue-600" />
          </span>
          <div>
            <p class="text-sm font-medium text-gray-900">Use detected timezone</p>
            <p class="text-xs text-gray-500">{{ browserTimezone || 'Detecting...' }}</p>
          </div>
        </div>

        <div
          class="rounded border px-3 py-3 cursor-pointer"
          :class="tzMode === 'list' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'"
          @click="tzMode = 'list'"
        >
          <div class="flex items-center gap-3">
            <span
              class="flex h-4 w-4 items-center justify-center rounded-full border-2"
              :class="tzMode === 'list' ? 'border-blue-600' : 'border-gray-300'"
            >
              <span v-if="tzMode === 'list'" class="h-2 w-2 rounded-full bg-blue-600" />
            </span>
            <p class="text-sm font-medium text-gray-900">Choose from list</p>
          </div>
          <div v-if="tzMode === 'list'" class="mt-2 ml-7">
            <Input
              v-model="tzSearch"
              placeholder="Search timezones..."
              class="text-sm mb-2"
            />
            <div class="max-h-48 overflow-y-auto rounded border border-gray-200 bg-white">
              <button
                v-for="tz in filteredTimezones"
                :key="tz"
                type="button"
                class="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                :class="listTimezone === tz ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'"
                @click="listTimezone = tz"
              >
                {{ tz }}
              </button>
              <p v-if="filteredTimezones.length === 0" class="px-3 py-2 text-xs text-gray-400">No matches</p>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between">
        <p class="text-xs text-gray-400">Selected: {{ selectedTimezone || 'none' }}</p>
        <Button :disabled="!selectedTimezone" @click="step = 2">
          Continue
        </Button>
      </div>
    </div>

    <!-- Step 2: Availability -->
    <div v-if="step === 2">
      <h1 class="text-lg font-medium text-gray-900 mb-1">Weekly Availability</h1>
      <p class="text-sm text-gray-500 mb-4">
        {{ authName }} &middot; {{ selectedTimezone }}
      </p>

      <form class="space-y-3" @submit.prevent="handleSubmitAvailability">
        <div
          v-for="day in days"
          :key="day.key"
          class="flex items-center gap-3 rounded border border-gray-200 px-3 py-2"
        >
          <div class="w-20 shrink-0">
            <span class="text-sm font-medium text-gray-900">{{ day.label }}</span>
          </div>

          <div class="flex items-center gap-2">
            <Switch :checked="day.available" @update:checked="day.available = $event" />
            <span class="text-xs text-gray-500">
              {{ day.available ? 'Available' : 'Unavailable' }}
            </span>
          </div>

          <template v-if="day.available">
            <div class="ml-auto flex items-center gap-2">
              <select
                v-model="day.startTime"
                class="h-8 rounded border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
              >
                <option v-for="t in timeOptions" :key="t" :value="t">{{ formatTime(t) }}</option>
              </select>
              <span class="text-xs text-gray-400">to</span>
              <select
                v-model="day.endTime"
                class="h-8 rounded border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none"
              >
                <option v-for="t in timeOptions" :key="t" :value="t">{{ formatTime(t) }}</option>
              </select>
            </div>
          </template>

          <span v-else class="ml-auto text-xs text-gray-400">&mdash;</span>
        </div>

        <p v-if="availError" class="text-sm text-red-600">{{ availError }}</p>
        <p v-if="availSuccess" class="text-sm text-green-700">{{ availSuccess }}</p>

        <div class="flex items-center justify-between">
          <button type="button" class="text-sm text-gray-500 hover:text-gray-700" @click="step = 1">
            &larr; Back
          </button>
          <Button type="submit" :disabled="availLoading">
            {{ availLoading ? 'Submitting...' : 'Submit & Continue' }}
          </Button>
        </div>
      </form>
    </div>

    <!-- Step 3: Anonymous Feedback -->
    <div v-if="step === 3">
      <h1 class="text-lg font-medium text-gray-900 mb-1">Team Feedback</h1>
      <p class="text-sm text-gray-500 mb-4">How is your experience on the dev team? Be honest — this is anonymous.</p>

      <!-- Anonymity proof -->
      <div class="rounded border border-gray-200 bg-gray-50 px-3 py-3 mb-4">
        <p class="text-xs font-medium text-gray-700 mb-2">How we keep this anonymous:</p>
        <ul class="text-xs text-gray-500 space-y-1">
          <li>&bull; This form sends <strong>no auth token</strong> — the server cannot identify you</li>
          <li>&bull; Feedback is stored in a separate table with <strong>no name or ID</strong> attached</li>
          <li>&bull; Only the text below and a timestamp are saved — nothing else</li>
        </ul>

        <button
          class="mt-2 text-xs text-blue-600 hover:text-blue-700"
          @click="showRequestPreview = !showRequestPreview"
        >
          {{ showRequestPreview ? 'Hide' : 'Show' }} exact request that will be sent
        </button>

        <div v-if="showRequestPreview" class="mt-2 rounded bg-white border border-gray-200 p-2">
          <pre class="text-[11px] text-gray-600 whitespace-pre-wrap font-mono">POST /api/feedback
Content-Type: application/json
(no Authorization header)

{{ JSON.stringify({ text: feedbackText.trim() || '(your text here)' }, null, 2) }}</pre>
        </div>
      </div>

      <textarea
        v-model="feedbackText"
        class="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none resize-none"
        rows="4"
        placeholder="Share your thoughts..."
        maxlength="2000"
      />
      <p class="text-xs text-gray-400 mt-1 text-right">{{ feedbackText.length }}/2000</p>

      <p v-if="feedbackError" class="text-sm text-red-600 mt-2">{{ feedbackError }}</p>
      <p v-if="feedbackSuccess" class="text-sm text-green-700 mt-2">{{ feedbackSuccess }}</p>

      <div class="mt-3 flex items-center justify-between">
        <button type="button" class="text-sm text-gray-500 hover:text-gray-700" @click="step = 2">
          &larr; Back
        </button>
        <div class="flex items-center gap-3">
          <button
            v-if="!feedbackSuccess"
            type="button"
            class="text-sm text-gray-400 hover:text-gray-600"
            @click="finish"
          >
            Skip
          </button>
          <Button
            v-if="!feedbackSuccess"
            :disabled="feedbackLoading || !feedbackText.trim()"
            @click="handleSubmitFeedback"
          >
            {{ feedbackLoading ? 'Sending...' : 'Submit Anonymously' }}
          </Button>
          <Button v-if="feedbackSuccess" @click="finish">
            Done
          </Button>
        </div>
      </div>
    </div>

    <!-- Done state -->
    <div v-if="step === 4" class="text-center py-12">
      <p class="text-lg font-medium text-gray-900 mb-1">All done</p>
      <p class="text-sm text-gray-500">Your availability has been submitted. Thanks!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

definePageMeta({ middleware: 'auth' })

const { name: authName, getHeaders, loadAuth } = useAuth()
loadAuth()

const stepLabels = ['Timezone', 'Availability', 'Feedback']
const step = ref(1)

// --- Step 1: Timezone ---
const tzMode = ref<'auto' | 'list'>('auto')
const browserTimezone = ref('')
const listTimezone = ref('')
const tzSearch = ref('')

// Get all IANA timezones from the browser
const allTimezones = computed(() => {
  try {
    return (Intl as any).supportedValuesOf('timeZone') as string[]
  } catch {
    // Fallback for older browsers
    return [
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Anchorage', 'America/Toronto', 'America/Vancouver', 'America/Sao_Paulo',
      'America/Mexico_City', 'America/Argentina/Buenos_Aires',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
      'Europe/Istanbul', 'Europe/Amsterdam', 'Europe/Madrid', 'Europe/Rome',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai',
      'Asia/Singapore', 'Asia/Seoul', 'Asia/Bangkok', 'Asia/Hong_Kong',
      'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
      'Pacific/Honolulu', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
    ]
  }
})

const filteredTimezones = computed(() => {
  const q = tzSearch.value.toLowerCase()
  if (!q) return allTimezones.value
  return allTimezones.value.filter((tz) => tz.toLowerCase().includes(q))
})

onMounted(() => {
  browserTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone
})

const selectedTimezone = computed(() => {
  if (tzMode.value === 'auto') return browserTimezone.value
  if (tzMode.value === 'list') return listTimezone.value
  return ''
})

// --- Step 2: Availability ---
interface DayState {
  key: string
  label: string
  available: boolean
  startTime: string
  endTime: string
}

const days = reactive<DayState[]>([
  { key: 'monday', label: 'Mon', available: true, startTime: '09:00', endTime: '17:00' },
  { key: 'tuesday', label: 'Tue', available: true, startTime: '09:00', endTime: '17:00' },
  { key: 'wednesday', label: 'Wed', available: true, startTime: '09:00', endTime: '17:00' },
  { key: 'thursday', label: 'Thu', available: true, startTime: '09:00', endTime: '17:00' },
  { key: 'friday', label: 'Fri', available: true, startTime: '09:00', endTime: '17:00' },
])

const timeOptions: string[] = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    timeOptions.push(
      String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
    )
  }
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return hour12 + ':' + String(m).padStart(2, '0') + ' ' + period
}

const availError = ref('')
const availSuccess = ref('')
const availLoading = ref(false)

async function handleSubmitAvailability() {
  availError.value = ''
  availSuccess.value = ''

  const entries = days
    .filter((d) => d.available)
    .map((d) => ({ day: d.key, startTime: d.startTime, endTime: d.endTime }))

  if (entries.length === 0) {
    availError.value = 'Select at least one available day.'
    return
  }

  for (const entry of entries) {
    if (entry.startTime >= entry.endTime) {
      availError.value = 'Start time must be before end time for ' + entry.day + '.'
      return
    }
  }

  availLoading.value = true
  try {
    await $fetch('/api/availability', {
      method: 'POST',
      headers: getHeaders(),
      body: { entries, timezone: selectedTimezone.value },
    })
    availSuccess.value = 'Availability submitted.'
    step.value = 3
  } catch (e: any) {
    availError.value = e?.data?.statusMessage || 'Failed to submit.'
  } finally {
    availLoading.value = false
  }
}

// --- Step 3: Anonymous Feedback ---
const feedbackText = ref('')
const feedbackError = ref('')
const feedbackSuccess = ref('')
const feedbackLoading = ref(false)
const showRequestPreview = ref(false)

async function handleSubmitFeedback() {
  feedbackError.value = ''
  feedbackSuccess.value = ''

  if (!feedbackText.value.trim()) {
    feedbackError.value = 'Please enter some feedback.'
    return
  }

  feedbackLoading.value = true
  try {
    // Explicitly NO auth headers — this is the anonymity guarantee
    await $fetch('/api/feedback', {
      method: 'POST',
      body: { text: feedbackText.value.trim() },
    })
    feedbackSuccess.value = 'Feedback submitted anonymously. Thank you!'
  } catch (e: any) {
    feedbackError.value = e?.data?.statusMessage || 'Failed to submit.'
  } finally {
    feedbackLoading.value = false
  }
}

function finish() {
  step.value = 4
}
</script>
