import process from 'node:process'
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  routeRules: {
    '/**': { cors: true },
  },

  runtimeConfig: {
    tmdb: {
      apiKey: process.env.TMDB_API_KEY || '',
    },
  },

  compatibilityDate: '2026-04-21',
})
