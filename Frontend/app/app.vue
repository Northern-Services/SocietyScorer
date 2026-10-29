<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from '#imports'

const route = useRoute()

// Mobile bottom tab navigation
const tabs = [
  { label: 'Dashboard', to: '/dashboard', icon: 'i-lucide-house' },
  { label: 'Scorecard', to: '/courses', icon: 'i-heroicons-pencil-square' },
  { label: 'Competitions', to: '/competitions', icon: 'i-heroicons-trophy' },
  { label: 'Members', to: '/members', icon: 'i-heroicons-user-group' },
  { label: 'More', to: '/more', icon: 'i-heroicons-ellipsis-vertical' }
]

const isActive = (to: string) => {
  if (to === '/') return route.path === '/'
  if (to === '/more') return route.path.startsWith('/player') || route.path === '/more' || route.path === '/settings'
  return route.path === to
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">

      <!-- Ambient mobile glows (subtle, no desktop sprawl) -->
      <div class="pointer-events-none fixed top-[-10%] left-[-10%] w-[200px] h-[200px] bg-emerald-500/10 blur-[100px] rounded-full z-0"></div>
      <div class="pointer-events-none fixed bottom-[-10%] right-[-10%] w-[240px] h-[240px] bg-teal-500/5 blur-[120px] rounded-full z-0"></div>

      <AppHeader class="relative z-20" />

      <main class="relative z-10">
        <NuxtPage />
      </main>

      <!-- Bottom Tab Navigation (thumb-friendly, full width) -->
      <nav class="fixed left-0 right-0 bottom-0 z-50 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-3xl p-2 pt-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div class="flex items-center justify-between text-[10px] leading-none">
          <template v-for="(tab, i) in tabs" :key="i">
            <NuxtLink
              :to="tab.to"
              :class="isActive(tab.to) ? 'text-emerald-400' : 'text-slate-500'"
              class="flex flex-col items-center justify-center gap-1 min-w-0"
            >
              <div class="relative flex h-6 w-6 items-center justify-center">
                <UIcon :name="tab.icon" class="w-5 h-5 shrink-0" />
                <span v-if="isActive(tab.to)" class="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              </div>
              <span class="font-bold leading-tight">{{ tab.label }}</span>
            </NuxtLink>
          </template>
        </div>
      </nav>

    </div>
  </UApp>
</template>

<style scoped>
html {
  touch-action: manipulation;
}
</style>