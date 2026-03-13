<template>
  <div class="flex min-h-[calc(100vh-4rem)] items-center justify-center">
    <div class="w-full max-w-sm">
      <div class="space-y-1 mb-4">
        <h1 class="text-lg font-medium text-gray-900">Sign in</h1>
        <p class="text-sm text-gray-500">Enter your name and team access code.</p>
      </div>

      <form class="space-y-3" @submit.prevent="handleSubmit">
        <div class="space-y-1">
          <label for="name" class="text-sm text-gray-700">Name</label>
          <Input id="name" v-model="name" placeholder="Your name" :disabled="loading" />
        </div>

        <div class="space-y-1">
          <label for="code" class="text-sm text-gray-700">Access code</label>
          <Input id="code" v-model="code" type="password" placeholder="Access code" :disabled="loading" />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Continue' }}
        </Button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const name = ref('')
const code = ref('')
const error = ref('')
const loading = ref(false)
const { setAuth } = useAuth()

async function handleSubmit() {
  error.value = ''
  if (!name.value.trim() || !code.value.trim()) {
    error.value = 'Both fields are required.'
    return
  }

  loading.value = true
  try {
    const res = await $fetch('/api/auth', {
      method: 'POST',
      body: { name: name.value.trim(), code: code.value },
    })
    setAuth(res.token, res.name, res.role)

    if (res.role === 'admin') {
      navigateTo('/admin')
    } else {
      navigateTo('/submit')
    }
  } catch (e: any) {
    error.value = e?.data?.statusMessage || 'Invalid access code.'
  } finally {
    loading.value = false
  }
}
</script>
