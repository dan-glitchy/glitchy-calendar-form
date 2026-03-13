// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt'],
  css: ['~/assets/css/tailwind.css'],
  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET,
    teamCode: process.env.TEAM_CODE,
    adminCode: process.env.ADMIN_CODE,
    databaseUrl: process.env.DATABASE_URL || 'file:./db/availability.db',
  },
})