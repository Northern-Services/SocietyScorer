// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/content',
    '@nuxt/ui',
    '@vueuse/nuxt',
    'motion-v/nuxt'
  ],

  devtools: {
    enabled: true
  },

  runtimeConfig: {
    public: {
      appUrl: process.env.NODE_ENV === 'production' ? 'https://ppulse.cc' : 'http://localhost:3000'
    }
  },
  vite: {
    server: {
      allowedHosts: [
        'ppulse.cc',
        '.ppulse.cc'
      ],
    }
  },

  css: ['~/assets/css/main.css'],

  content: {
    experimental: {
      sqliteConnector: 'native'
    }
  },

  mdc: {
    highlight: {
      noApiRoute: false
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  prerender: {
    routes: [
      '/'
    ]
  }
})
