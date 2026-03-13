interface AuthState {
  token: string | null
  name: string | null
  role: 'member' | 'admin' | null
}

const authState = reactive<AuthState>({
  token: null,
  name: null,
  role: null,
})

export function useAuth() {
  function setAuth(token: string, name: string, role: 'member' | 'admin') {
    authState.token = token
    authState.name = name
    authState.role = role
    if (import.meta.client) {
      sessionStorage.setItem('auth', JSON.stringify({ token, name, role }))
    }
  }

  function loadAuth() {
    if (import.meta.client && !authState.token) {
      const stored = sessionStorage.getItem('auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        authState.token = parsed.token
        authState.name = parsed.name
        authState.role = parsed.role
      }
    }
  }

  function clearAuth() {
    authState.token = null
    authState.name = null
    authState.role = null
    if (import.meta.client) {
      sessionStorage.removeItem('auth')
    }
  }

  function getHeaders(): Record<string, string> {
    return authState.token ? { Authorization: 'Bearer ' + authState.token } : {}
  }

  const isAuthenticated = computed(() => !!authState.token)
  const isAdmin = computed(() => authState.role === 'admin')

  return {
    ...toRefs(authState),
    isAuthenticated,
    isAdmin,
    setAuth,
    loadAuth,
    clearAuth,
    getHeaders,
  }
}
