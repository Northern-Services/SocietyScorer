<script setup lang="ts">
import { ref, computed } from 'vue'

const features = [
  {
    icon: 'i-heroicons-pencil-square',
    title: 'Mobile Scorecard',
    desc: 'Instant stroke entry built for phone screens on the fairway. Auto-calculates net scores & points on the fly.'
  },
  {
    icon: 'i-heroicons-calculator',
    title: 'WHS Handicap Engine',
    desc: 'Applies playing handicaps, stroke index allocation, and automatic post-round handicap cuts.'
  },
  {
    icon: 'i-heroicons-trophy',
    title: '2’s Club Detection',
    desc: 'Never miss a 2’s pot entry again. Automatically catches birdies on par 3s and generates dividend breakdowns.'
  },
  {
    icon: 'i-heroicons-document-arrow-down',
    title: 'Branded PDF Reports',
    desc: 'One-click export of official, formatted competition sheets ready for club noticeboards or WhatsApp.'
  }
]

const { data: statsRes } = await useFetch('/api/stats')
const stats = computed(() => statsRes.value?.data || { totalPlayers: 0, totalCompetitions: 0, totalPrizePool: 0 })

const metrics = computed(() => [
  { val: `${stats.value.totalPlayers}+`, label: 'Members' },
  { val: `${stats.value.totalCompetitions}`, label: 'Fixtures' },
  { val: `£${stats.value.totalPrizePool.toLocaleString()}`, label: 'Prize Pool' }
])
</script>

<template>
  <div class="space-y-10 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Hero Section -->
    <section class="relative pt-4 pb-6">
      <div class="relative z-10 px-3 text-center space-y-4">
        
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>SOCIETY SCORER • LIVE STABLEFORD ENGINE</span>
        </div>

        <h1 class="text-3xl font-extrabold tracking-tight text-white leading-[1.15]">
          Precision Golf Scoring.<br class="block"/>
          <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(16,185,129,0.3)]">
            Zero Math On The 18th.
          </span>
        </h1>

        <p class="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
          The mobile companion for Earlybirds Golf Society. Automatic handicap adjustments and 2’s club dividend tracking.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
          <UButton to="/dashboard" color="success" variant="solid" size="sm" icon="i-lucide-house" class="font-bold w-full sm:w-auto shadow-lg shadow-emerald-500/20">
            Enter Dashboard
          </UButton>
          <UButton to="/courses" color="success" variant="soft" size="sm" icon="i-heroicons-pencil-square" class="font-semibold w-full sm:w-auto">
            Start Scorecard
          </UButton>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="scroll-mt-24 px-3 space-y-6">
      <div class="text-center space-y-2">
        <UBadge variant="subtle" color="success" class="uppercase tracking-widest text-[10px] px-3 py-1 font-bold">Feature Breakdown</UBadge>
        <h2 class="text-2xl font-extrabold text-white tracking-tight">Built For The Fairway</h2>
        <p class="text-sm text-slate-400">Every feature designed around phone-first scoring while walking the course.</p>
      </div>

      <div class="space-y-4">
        <div
          v-for="(item, i) in features"
          :key="i"
          class="group relative bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] transition-all duration-300 space-y-3"
        >
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <UIcon :name="item.icon" class="w-5 h-5" />
          </div>
          <h3 class="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">{{ item.title }}</h3>
          <p class="text-sm text-slate-400 leading-relaxed">{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Metrics Strip -->
    <section id="metrics" class="scroll-mt-24 border-t border-slate-800/80 bg-slate-900/40 backdrop-blur-md py-6 relative px-3">
      <div class="grid grid-cols-3 gap-3 text-center">
        <div v-for="(metric, i) in metrics" :key="i" class="space-y-1">
          <div class="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent tracking-tight">
            {{ metric.val }}
          </div>
          <div class="text-[10px] text-slate-400 font-medium tracking-wide uppercase">{{ metric.label }}</div>
        </div>
      </div>
    </section>

  </div>
</template>