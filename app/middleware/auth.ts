export default defineNuxtRouteMiddleware((to) => {
  const { loadAuth, isAuthenticated } = useAuth()
  loadAuth()

  if (to.path !== '/' && !isAuthenticated.value) {
    return navigateTo('/')
  }
})
