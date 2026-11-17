<script setup lang="ts">
import { computed } from 'vue'

const features = [
  {
    code: 'MOD_01',
    icon: 'i-heroicons-pencil-square',
    title: 'Mobile Scorecard',
    desc: 'Instant stroke entry built for one-handed use on the fairway. Auto-calculates net scores & Stableford points on the fly.'
  },
  {
    code: 'MOD_02',
    icon: 'i-heroicons-calculator',
    title: 'WHS Handicap Engine',
    desc: 'Applies exact playing handicaps, stroke index allocation, and automated post-round society handicap adjustments.'
  },
  {
    code: 'MOD_03',
    icon: 'i-heroicons-trophy',
    title: '2’s Club Detection',
    desc: 'Zero missed pots. Automatically flags birdies on par 3s and calculates real-time dividend breakdowns per entrant.'
  },
  {
    code: 'MOD_04',
    icon: 'i-heroicons-document-arrow-down',
    title: 'Branded PDF Reports',
    desc: 'One-click export of official competition sheets formatted for clubhouse noticeboards and WhatsApp distribution.'
  }
]

const { data: statsRes } = await useFetch('/api/stats')
const stats = computed(() => statsRes.value?.data || { totalPlayers: 0, totalCompetitions: 0, totalPrizePool: 0 })

const metrics = computed(() => [
  { val: `${stats.value.totalPlayers}+`, label: 'ACTIVE MEMBERS', sub: 'WHS Synced' },
  { val: `${stats.value.totalCompetitions}`, label: 'FIXTURES LOGGED', sub: 'Season Telemetry' },
  { val: `£${stats.value.totalPrizePool.toLocaleString()}`, label: 'PRIZE POOL', sub: 'Distributed' }
])

// Simulated hole telemetry presets to showcase the engine to new players
const sampleHoles = [
  { hole: 3, par: 3, si: 14, gross: 3, shots: 0, net: 3, points: 2, badge: 'PAR' },
  { hole: 7, par: 5, si: 2, gross: 4, shots: 1, net: 3, points: 4, badge: 'NET EAGLE' },
  { hole: 12, par: 4, si: 1, gross: 5, shots: 1, net: 4, points: 2, badge: 'NET PAR' },
  { hole: 18, par: 4, si: 6, gross: 4, shots: 1, net: 3, points: 3, badge: 'NET BIRDIE' },
  { hole: 9, par: 3, si: 18, gross: 2, shots: 0, net: 2, points: 3, badge: 'BIRDIE' },
  { hole: 14, par: 5, si: 4, gross: 6, shots: 1, net: 5, points: 2, badge: 'NET PAR' }
]

const activeIndex = ref(0)
let intervalId: any = null

onMounted(() => {
  // Start on a random hole preset
  activeIndex.value = Math.floor(Math.random() * sampleHoles.length)
  
  // Rotate demo telemetry every 4 seconds
  intervalId = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % sampleHoles.length
  }, 4000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

const currentDemo = computed(() => sampleHoles[activeIndex.value])
</script>

<template>
  <div class="relative min-h-screen bg-[#0B0D10] text-zinc-100 selection:bg-orange-500/30 selection:text-orange-200 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)] overflow-hidden">
    
    <!-- Subtle Cloudflare Architectural Dot Grid Background -->
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>

    <!-- Main Container -->
    <div class="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 space-y-12">

      <!-- Hero Section -->
      <section class="space-y-6">
        <div class="inline-flex items-center gap-2 px-2.5 py-1 border border-orange-500/30 bg-orange-500/10 text-orange-400 font-mono text-[11px] uppercase tracking-wider">
          <span>Society Scorer</span>
          <span class="text-zinc-600">/</span>
          <span>Live Telemetry</span>
        </div>

        <div class="space-y-4">
          <h1 class="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">
            Precision golf scoring.
            <span class="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
              Zero math on the 18th.
            </span>
          </h1>

          <p class="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed font-normal">
            The mobile scoring infrastructure for Earlybirds Golf Society. Real-time WHS handicap strokes, Stableford calculation, and automated 2’s club payouts.
          </p>
        </div>

        <!-- Sharp Cloudflare-style Action Buttons -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <UButton
            to="/dashboard"
            size="md"
            icon="i-lucide-layout-dashboard"
            class="justify-center rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold tracking-tight transition-colors shadow-[0_0_25px_rgba(246,130,31,0.25)]"
          >
            Enter Dashboard
          </UButton>
          <UButton
            to="/courses"
            variant="outline"
            size="md"
            icon="i-heroicons-pencil-square"
            class="justify-center rounded-sm border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-500 text-zinc-200 font-semibold transition-colors"
          >
            Start Scorecard
          </UButton>
        </div>

        <!-- Mini Live Engine Preview Card (Cloudflare Console Aesthetic) -->
        <div class="border border-zinc-800 bg-zinc-950/90 font-mono text-xs shadow-2xl rounded-sm overflow-hidden">
          
          <!-- Top Header Bar -->
          <div class="px-3.5 py-2 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <Transition name="fade" mode="out-in">
              <span :key="currentDemo.hole">HOLE_{{ currentDemo.hole }} // PAR {{ currentDemo.par }} • SI {{ currentDemo.si }}</span>
            </Transition>
            <span class="text-emerald-400 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>LIVE SIMULATION</span>
            </span>
          </div>
          
          <!-- Telemetry Grid with Smooth Transition -->
          <Transition name="slide-fade" mode="out-in">
            <div :key="activeIndex" class="grid grid-cols-4 divide-x divide-zinc-800/80 text-center py-3.5 bg-zinc-950">
              <div>
                <div class="text-[10px] text-zinc-500 uppercase">Gross</div>
                <div class="text-sm font-bold text-white mt-0.5">{{ currentDemo.gross }}</div>
              </div>
              <div>
                <div class="text-[10px] text-zinc-500 uppercase">Shots</div>
                <div class="text-sm font-bold text-orange-400 mt-0.5">+{{ currentDemo.shots }}</div>
              </div>
              <div>
                <div class="text-[10px] text-zinc-500 uppercase">Net</div>
                <div class="text-sm font-bold text-white mt-0.5">{{ currentDemo.net }}</div>
              </div>
              <div>
                <div class="text-[10px] text-zinc-500 uppercase">Points</div>
                <div class="text-sm font-bold text-emerald-400 mt-0.5">{{ currentDemo.points }} PTS</div>
              </div>
            </div>
          </Transition>

        </div>
      </section>

      <!-- Telemetry Metrics Strip (Border-Collapsed Matrix) -->
      <section id="metrics" class="scroll-mt-24">
        <div class="border border-zinc-800 bg-zinc-900/30 grid grid-cols-3 divide-x divide-zinc-800">
          <div v-for="(metric, i) in metrics" :key="i" class="p-3.5 sm:p-5 space-y-1">
            <div class="text-[10px] font-mono text-zinc-500 tracking-wider uppercase truncate">
              {{ metric.label }}
            </div>
            <div class="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight">
              {{ metric.val }}
            </div>
            <div class="text-[10px] text-orange-400/80 font-mono hidden sm:block">
              {{ metric.sub }}
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section (Architectural Bento Grid) -->
      <section id="features" class="scroll-mt-24 space-y-4">
        <div class="flex items-end justify-between border-b border-zinc-800 pb-3">
          <div>
            <div class="text-[11px] font-mono text-orange-400 uppercase tracking-widest">System Architecture</div>
            <h2 class="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">Built for the fairway</h2>
          </div>
          <span class="text-xs font-mono text-zinc-500 hidden sm:inline">04 MODULES</span>
        </div>

        <!-- 1px Hairline Border Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 border-t border-l border-zinc-800 bg-zinc-950/60">
          <div
            v-for="(item, i) in features"
            :key="i"
            class="group relative border-r border-b border-zinc-800 p-5 hover:bg-zinc-900/60 transition-colors space-y-3"
          >
            <!-- Top Corner Accent Bar on Hover -->
            <div class="absolute top-0 left-0 w-full h-[2px] bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

            <div class="flex items-center justify-between">
              <div class="w-8 h-8 border border-zinc-700 bg-zinc-900 text-orange-400 flex items-center justify-center group-hover:border-orange-500/50 transition-colors">
                <UIcon :name="item.icon" class="w-4 h-4" />
              </div>
              <span class="font-mono text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
                {{ item.code }}
              </span>
            </div>

            <div class="space-y-1.5">
              <h3 class="text-base font-bold text-zinc-100 group-hover:text-orange-400 transition-colors">
                {{ item.title }}
              </h3>
              <p class="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {{ item.desc }}
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
/* Smooth Fade & Slide Animation */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>