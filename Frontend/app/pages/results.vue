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
  <UContainer class="py-12 max-w-4xl mx-auto space-y-8">
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white">Competition Results</h1>
        <p class="text-sm text-slate-400">Official Leaderboard & 2’s Club</p>
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <USelect v-model="selectedCompetition" :options="competitions" size="md" class="w-full sm:w-60" />
        <UButton @click="downloadPDF" :loading="downloading" color="emerald" icon="i-heroicons-document-arrow-down" class="font-semibold">
          PDF
        </UButton>
      </div>
    </div>

    <!-- Leaderboard Table -->
    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <h3 class="font-semibold text-white">Stableford Leaderboard</h3>
        <UBadge color="emerald" variant="subtle">Status: Live / Open</UBadge>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400 font-medium bg-slate-950/40">
              <th class="p-4">Pos</th>
              <th class="p-4">Player</th>
              <th class="p-4 text-center">Points</th>
              <th class="p-4 text-center">HCP Before</th>
              <th class="p-4 text-center">HCP After</th>
              <th class="p-4 text-center">Penalty</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr v-for="row in leaderboard" :key="row.pos" class="hover:bg-slate-800/40 transition-colors">
              <td class="p-4 font-bold text-white">{{ row.pos }}</td>
              <td class="p-4 font-semibold text-white flex items-center gap-2">
                {{ row.name }}
                <span v-if="row.pos === 1" class="text-xs">🏆</span>
              </td>
              <td class="p-4 text-center font-bold text-emerald-400 text-base">{{ row.points }}</td>
              <td class="p-4 text-center text-slate-300">{{ row.before }}</td>
              <td class="p-4 text-center font-semibold text-white">{{ row.after }}</td>
              <td class="p-4 text-center text-slate-400">{{ row.penalty > 0 ? `+${row.penalty}` : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Two's Club Section -->
    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
      <div class="flex items-center gap-2">
        <span class="text-xl">🎯</span>
        <h3 class="font-semibold text-white text-lg">2’s Club Pot</h3>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div v-for="(two, idx) in twosClub" :key="idx" class="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between">
          <span class="font-medium text-white">{{ two.name }}</span>
          <div class="flex gap-1.5">
            <span v-for="hole in two.holes" :key="hole" class="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md text-xs font-semibold">
              Hole {{ hole }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </UContainer>
</template>