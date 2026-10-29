<script setup lang="ts">
import { ref, computed } from 'vue'

// Interactive Demo State
const demoHcp = ref(16)
const demoPar = ref(4)
const demoSi = ref(5)
const demoStrokes = ref(4)

// Live Stableford Calculation Logic
const demoShotsReceived = computed(() => {
  let shots = 0
  if (demoHcp.value >= demoSi.value) shots += 1
  if (demoHcp.value >= demoSi.value + 18) shots += 1
  return shots
})

const demoNetScore = computed(() => Math.max(1, demoStrokes.value - demoShotsReceived.value))

const demoPoints = computed(() => {
  const diff = demoPar.value - demoNetScore.value
  const pts = diff + 2
  return Math.max(0, Math.min(pts, 5))
})

const demoPointsBadgeClass = computed(() => {
  if (demoPoints.value >= 4) return 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  if (demoPoints.value === 3) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  if (demoPoints.value === 2) return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  if (demoPoints.value === 1) return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  return 'bg-slate-800 text-slate-400 border-slate-700'
})

const isTwoClub = computed(() => demoStrokes.value === 2 && demoPar.value === 3)

const features = [
  {
    icon: 'i-heroicons-pencil-square',
    title: 'Mobile Scorecard',
    desc: 'Instant stroke entry built for phone screens on the fairway. Auto-calculates net scores & points on the fly.'
  },
  {
    icon: 'i-heroicons-calculator',
    title: 'WHS & Society Handicap Engine',
    desc: 'Applies playing handicaps, stroke index allocation, and automatically calculates post-round handicap cuts.'
  },
  {
    icon: 'i-heroicons-trophy',
    title: '2’s Club Detection',
    desc: 'Never miss a 2’s pot entry again. Automatically catches birdies on par 3s and generates dividend breakdowns.'
  },
  {
    icon: 'i-heroicons-document-arrow-down',
    title: 'Branded PDF Reports',
    desc: 'One-click export of official, formatted competition sheets ready for club noticeboards or WhatsApp sharing.'
  }
]

// Fetch live app metrics from the server
const { data: statsRes } = await useFetch('/api/stats')
const stats = computed(() => statsRes.value?.data || { totalPlayers: 0, totalCompetitions: 0, totalPrizePool: 0 })

// Dynamic metrics array referencing real data
const metrics = computed(() => [
  { val: `${stats.value.totalPlayers}+`, label: 'Society Members' },
  { val: `${stats.value.totalCompetitions}`, label: 'Fixtures Hosted' },
  { val: `£${stats.value.totalPrizePool.toLocaleString()}`, label: 'Prize Pool Awarded' }
])
</script>

<template>
  <div class="space-y-28 pb-20">
    
    <!-- Hero Section -->
    <section class="relative pt-12 pb-16 lg:pt-24 lg:pb-24">
      <UContainer class="relative z-10 max-w-5xl mx-auto text-center space-y-8">
        
        <!-- Glowing Pill Badge -->
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>SOCIETY SCORER v2.0 • LIVE STABLEFORD ENGINE</span>
        </div>

        <!-- Main Title -->
        <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
          Precision Golf Scoring. <br class="hidden sm:inline"/>
          <span class="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(16,185,129,0.3)]">
            Zero Math On The 18th.
          </span>
        </h1>

        <!-- Subtitle -->
        <p class="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The ultimate mobile companion for Earlybirds Golf Society. automatic handicap adjustments, and 2’s club dividend tracking.
        </p>

      </UContainer>
    </section>

    <!-- Features Grid Section -->
    <section id="features" class="scroll-mt-24">
      <UContainer class="max-w-6xl mx-auto space-y-12">
        <div class="text-center space-y-3 max-w-2xl mx-auto">
          <UBadge variant="subtle" color="success" class="uppercase tracking-widest text-[10px] px-3 py-1 font-bold">Feature Breakdown</UBadge>
          <h2 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Everything Society Golf Needs</h2>
          <p class="text-slate-400 text-sm sm:text-base">Designed specifically around Earlybirds competition rules and mobile ease of use.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            v-for="(item, i) in features" 
            :key="i"
            class="group relative bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] transition-all duration-300 space-y-4"
          >
            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UIcon :name="item.icon" class="w-6 h-6" />
            </div>
            <h3 class="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">{{ item.title }}</h3>
            <p class="text-sm text-slate-400 leading-relaxed">{{ item.desc }}</p>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Metrics Strip Section -->
    <section id="metrics" class="scroll-mt-24 border-y border-slate-800/80 bg-slate-900/40 backdrop-blur-md py-16 relative">
      <UContainer>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
          <div v-for="(metric, i) in metrics" :key="i" class="space-y-2">
            <div class="text-3xl sm:text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent tracking-tight">
              {{ metric.val }}
            </div>
            <div class="text-xs sm:text-sm text-slate-400 font-medium tracking-wide uppercase">{{ metric.label }}</div>
          </div>
        </div>
      </UContainer>
    </section>

  </div>
</template>