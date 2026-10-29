<script setup>
import { ref } from 'vue'

const selectedCompetition = ref('Spring Open 2026')
const competitions = ['Spring Open 2026', 'Captain’s Prize', 'Summer Championship']

const leaderboard = ref([
  { pos: 1, name: 'Dave O’Connor', points: 41, before: 14.4, after: 12.4, penalty: 0 },
  { pos: 2, name: 'Seamus Murphy', points: 38, before: 11.0, after: 10.0, penalty: 0 },
  { pos: 3, name: 'Liam Gallagher', points: 36, before: 18.2, after: 17.7, penalty: 1 },
  { pos: 4, name: 'Cian Ó Murchú', points: 32, before: 9.5, after: 9.5, penalty: 0 },
  { pos: 5, name: 'Padraig Harrington', points: 29, before: 4.2, after: 4.7, penalty: 2 }
])

const twosClub = ref([
  { name: 'Dave O’Connor', holes: [7] },
  { name: 'Seamus Murphy', holes: [3, 15] }
])

const downloading = ref(false)
const downloadPDF = () => {
  downloading.value = true
  setTimeout(() => {
    downloading.value = false
    alert('Branded PDF results sheet downloaded successfully!')
  }, 1000)
}
</script>

<template>
  <div class="px-3 py-4 space-y-5 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Page Header -->
    <div class="flex flex-col items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-white">Competition Results</h1>
        <p class="text-[11px] text-slate-400">Official Leaderboard & 2’s Club</p>
      </div>
      <div class="flex items-center gap-2 w-full">
        <USelect v-model="selectedCompetition" :options="competitions" size="xs" class="w-full" />
        <UButton @click="downloadPDF" :loading="downloading" color="emerald" icon="i-heroicons-document-arrow-down" size="xs" class="font-semibold">
          PDF
        </UButton>
      </div>
    </div>

    <!-- Leaderboard (mobile cards instead of table) -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <h3 class="text-xs font-semibold text-white">Stableford Leaderboard</h3>
        <UBadge color="emerald" variant="subtle" size="xs">Live</UBadge>
      </div>

      <div class="divide-y divide-slate-800">
        <div
          v-for="row in leaderboard"
          :key="row.pos"
          class="p-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
              :class="row.pos === 1 ? 'bg-amber-500 text-slate-950' : row.pos === 2 ? 'bg-slate-300 text-slate-950' : row.pos === 3 ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'"
            >
              #{{ row.pos }}
            </div>
            <div class="min-w-0">
              <span class="text-sm font-bold text-white block">{{ row.name }}</span>
              <span v-if="row.pos === 1" class="text-[10px] text-amber-400">🏆 Winner</span>
            </div>
          </div>

          <div class="text-right flex flex-col items-end gap-0.5">
            <span class="text-xs font-bold text-emerald-400">{{ row.points }}</span>
            <span class="text-[9px] uppercase font-bold text-slate-500 block">pts</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Two's Club Section -->
    <div class="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-3">
      <div class="flex items-center gap-2">
        <span class="text-xl">🎯</span>
        <h3 class="font-semibold text-white text-sm">2’s Club Pot</h3>
      </div>

      <div class="space-y-2">
        <div
          v-for="(two, idx) in twosClub"
          :key="idx"
          class="bg-slate-800/50 border border-slate-700/50 p-2 rounded-xl flex items-center justify-between"
        >
          <span class="text-sm font-medium text-white">{{ two.name }}</span>
          <div class="flex gap-1">
            <span
              v-for="hole in two.holes"
              :key="hole"
              class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md text-[10px] font-semibold"
            >
              Hole {{ hole }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>