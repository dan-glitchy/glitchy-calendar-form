<template>
  <div>
    <div class="mb-6 flex items-baseline justify-between">
      <div>
        <h1 class="text-lg font-medium text-gray-900">Weekly Availability</h1>
        <p class="text-sm text-gray-500">
          {{ authName }} &middot; {{ detectedTimezone }}
        </p>
      </div>
    </div>

    <form class="space-y-3" @submit.prevent="handleSubmit">
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

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="success" class="text-sm text-green-700">{{ success }}</p>

      <Button type="submit" :disabled="loading">
        {{ loading ? 'Submitting...' : 'Submit Availability' }}
      </Button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

definePageMeta({ middleware: 'auth' })

const { name: authName, getHeaders, loadAuth } = useAuth()
loadAuth()

const detectedTimezone = ref('')
onMounted(() => {
  detectedTimezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone
})

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

const error = ref('')
const success = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  success.value = ''

  const entries = days
    .filter((d) => d.available)
    .map((d) => ({ day: d.key, startTime: d.startTime, endTime: d.endTime }))

  if (entries.length === 0) {
    error.value = 'Select at least one available day.'
    return
  }

  for (const entry of entries) {
    if (entry.startTime >= entry.endTime) {
      error.value = 'Start time must be before end time for ' + entry.day + '.'
      return
    }
  }

  loading.value = true
  try {
    await $fetch('/api/availability', {
      method: 'POST',
      headers: getHeaders(),
      body: { entries, timezone: detectedTimezone.value },
    })
    success.value = 'Availability submitted successfully.'
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Failed to submit.'
  } finally {
    loading.value = false
  }
}
</script>
