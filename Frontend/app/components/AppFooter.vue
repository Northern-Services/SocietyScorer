<script setup lang="ts">
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())

const links = [
  { label: 'Scorecard', to: '/scorecard', icon: 'i-heroicons-pencil-square' },
  { label: 'Competitions', to: '/competitions', icon: 'i-heroicons-trophy' },
  { label: 'Results', to: '/results', icon: 'i-heroicons-chart-bar' },
  { label: 'Admin', to: '/admin', icon: 'i-heroicons-shield-check' },
  { label: 'Privacy Policy', to: '/privacy', icon: 'i-heroicons-lock-closed' }
]
</script>

<template>
  <footer class="relative z-10 w-full pt-6 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <!-- FLOATING GLASS FOOTER CARD -->
    <div class="relative overflow-hidden bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
      
      <!-- Ambient Glow Behind Footer -->
      <div class="pointer-events-none absolute -right-10 -bottom-10 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-blue-500/5 blur-3xl"></div>

      <!-- TOP ROW: Brand Identity & Links Grid -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        
        <!-- Society Identity -->
        <div class="space-y-1.5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-xs">
              EB
            </div>
            <span class="text-base font-bold text-white tracking-tight">Earlybirds Golf Society</span>
          </div>
          <p class="text-xs text-slate-400 max-w-sm">
            Official handicap tracking, live competition scorecards, and automated payout reporting.
          </p>
        </div>

        <!-- Quick Navigation Links -->
        <nav class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <NuxtLink 
            v-for="link in links" 
            :key="link.label" 
            :to="link.to"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 transition-all cursor-pointer group"
          >
            <UIcon :name="link.icon" class="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </nav>

      </div>

      <!-- BOTTOM ROW: Status Indicator & Copyright -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        
        <!-- Live System Status Badge -->
        <div class="flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 px-3 py-1 rounded-full">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span class="text-[11px] font-semibold text-slate-400">Scorer Engine Live</span>
        </div>

        <!-- Copyright & Tech Details -->
        <div class="text-center sm:text-right">
          <p class="text-slate-400 font-medium">
            Earlybirds Society Scorer • Built with Nuxt & SQLite
          </p>
          <p class="text-[10px] text-slate-600 mt-0.5">
            © {{ currentYear }} All rights reserved.
          </p>
        </div>

      </div>

    </div>
  </footer>
</template>