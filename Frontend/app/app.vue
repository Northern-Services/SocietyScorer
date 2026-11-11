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
      <nav class="fixed left-0 right-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-3xl px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl font-mono">
          <div class="max-w-md mx-auto flex items-center justify-between text-[10px] tracking-wider uppercase">
            <template v-for="(tab, i) in tabs" :key="i">
              <NuxtLink
                :to="tab.to"
                class="group relative flex flex-col items-center justify-center gap-1.5 py-1 px-3 transition-colors flex-1"
                :class="isActive(tab.to) ? 'text-orange-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'"
              >
                <!-- Active top indicator line (Cloudflare status style) -->
                <span
                  v-if="isActive(tab.to)"
                  class="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-orange-500 shadow-[0_0_8px_rgba(246,130,31,0.5)]"
                ></span>

                <div class="relative flex h-5 w-5 items-center justify-center">
                  <UIcon
                    :name="tab.icon"
                    class="w-4 h-4 shrink-0 transition-transform group-hover:scale-115"
                    :class="isActive(tab.to) ? 'text-orange-400' : 'text-zinc-500 group-hover:text-zinc-300'"
                  />
                </div>

                <span class="leading-none text-[9px] truncate">{{ tab.label }}</span>
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