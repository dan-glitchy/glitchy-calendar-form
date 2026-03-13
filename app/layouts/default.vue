<template>
  <div class="min-h-screen bg-white">
    <header class="border-b border-gray-200 bg-white">
      <div class="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
        <span class="text-sm font-medium text-gray-900">Team Availability</span>
        <button
          v-if="isAuthenticated"
          class="text-xs text-gray-500 hover:text-gray-700"
          @click="logout"
        >
          Sign out
        </button>
      </div>
    </header>
    <main class="mx-auto max-w-3xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, clearAuth } = useAuth()

function logout() {
  clearAuth()
  navigateTo('/')
}
</script>
