<script setup lang="ts">
import { ref, computed } from 'vue'

const { data: userRes, error: userError } = await useFetch('/api/auth/me', {
  ignoreResponseError: true
})

const isLoggedIn = computed(() => !!userRes.value?.success && !!userRes.value?.data)

if (userError.value || !isLoggedIn.value) {
  await navigateTo('/login')
}

const { data: compRes, refresh } = await useFetch('/api/competitions')
const competitions = computed(() => compRes.value?.data || [])

const activeTab = ref<'open' | 'closed'>('open')
const search = ref('')

const filteredCompetitions = computed(() => {
  const query = search.value.toLowerCase().trim()
  return competitions.value.filter((c: any) => {
    const isClosed = c.status === 'CLOSED'
    const matchesTab = activeTab.value === 'closed' ? isClosed : !isClosed
    const matchesSearch = !query ||
      c.name?.toLowerCase().includes(query) ||
      c.venue?.toLowerCase().includes(query)
    return matchesTab && matchesSearch
  })
})

const openCount = computed(() => competitions.value.filter((c: any) => c.status !== 'CLOSED').length)
const closedCount = computed(() => competitions.value.filter((c: any) => c.status === 'CLOSED').length)

const formatUKDate = (isoString: string) => {
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return isoString
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} at ${hours}:${mins}`
}

const isLiveToday = (dateString: string) => {
  if (!dateString) return false
  const today = new Date().toISOString().split('T')[0]
  const compDay = new Date(dateString).toISOString().split('T')[0]
  return today >= compDay
}
</script>

<template>
  <div class="px-3 py-4 space-y-5 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Page Header -->
    <div class="relative bg-slate-900/90 border border-slate-800/90 p-3 rounded-3xl backdrop-blur-2xl shadow-2xl overflow-hidden space-y-4">
      <div class="pointer-events-none absolute -top-8 -right-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px]"></div>

      <div class="relative z-10 space-y-2">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md">Society Tournaments</span>
        </div>
        <h1 class="text-lg font-black text-white tracking-tight">Society Competitions</h1>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          Browse upcoming fixtures, join lobbies, enter scorecards on match day, and view archived results.
        </p>
      </div>

      <!-- Search Field -->
      <div class="relative">
        <input
          v-model="search"
          type="text"
          placeholder="Search fixtures or venues..."
          class="w-full pl-8 pr-3 py-2 bg-slate-950/80 border border-slate-800 focus:border-emerald-500/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
        />
        <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-1 pt-2 border-t border-slate-800/80 relative z-10">
        <button
          @click="activeTab = 'open'"
          type="button"
          class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-200 cursor-pointer"
          :class="activeTab === 'open' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm' : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5" />
          <span>Open</span>
          <span class="px-1 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] rounded-md font-black">{{ openCount }}</span>
        </button>
        <button
          @click="activeTab = 'closed'"
          type="button"
          class="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-200 cursor-pointer"
          :class="activeTab === 'closed' ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-sm' : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5" />
          <span>Archived</span>
          <span class="px-1 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] rounded-md font-black">{{ closedCount }}</span>
        </button>
      </div>
    </div>

    <!-- Competitions List -->
    <div class="space-y-3">
      <div v-if="filteredCompetitions.length === 0" class="bg-slate-900/60 border border-slate-800/80 p-5 rounded-3xl text-center space-y-2 backdrop-blur-xl">
        <div class="w-10 h-10 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto text-lg border border-slate-700/50">
          ⛳
        </div>
        <h3 class="text-sm font-bold text-white">No {{ activeTab === 'open' ? 'Active' : 'Archived' }} Competitions</h3>
        <p class="text-[11px] text-slate-400 max-w-xs mx-auto">There are no tournaments matching your current tab or search filter.</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="comp in filteredCompetitions"
          :key="comp.id"
          class="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-3 rounded-3xl backdrop-blur-xl shadow-xl transition-all duration-300 group"
        >
          <div class="space-y-2.5">
            <!-- Badges & Title -->
            <div class="flex items-start gap-1.5 flex-wrap">
              <span
                v-if="comp.status === 'CLOSED'"
                class="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-bold rounded-md flex items-center gap-0.5"
              >
                🔒 Finalized
              </span>
              <span
                v-else-if="isLiveToday(comp.date)"
                class="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold rounded-md flex items-center gap-0.5 animate-pulse"
              >
                🏆 Live Today
              </span>
              <span v-else class="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-bold rounded-md flex items-center gap-0.5">
                ⏳ Lobby Open
              </span>
              <span class="text-[10px] text-slate-500 font-semibold">• {{ comp.status }}</span>
            </div>

            <h2 class="text-sm font-black text-white group-hover:text-emerald-400 transition-colors leading-tight">{{ comp.name }}</h2>

            <!-- Metadata -->
            <div class="flex items-center gap-2.5 text-[10px] text-slate-400 flex-wrap">
              <span class="flex items-center gap-1 font-medium">
                <UIcon name="i-heroicons-calendar" class="w-3 h-3 text-emerald-400" />
                {{ formatUKDate(comp.date) }}
              </span>
              <span class="text-slate-600">•</span>
              <span class="flex items-center gap-1 font-medium">
                <UIcon name="i-heroicons-map-pin" class="w-3 h-3 text-slate-500" />
                {{ comp.venue || 'Home Course' }}
              </span>
            </div>

            <!-- Prize Pool -->
            <div v-if="comp.prize1st || comp.prize2nd || comp.prize3rd" class="mt-1.5 flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
              <span class="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-md text-[9px] uppercase tracking-wider">
                <UIcon name="i-heroicons-trophy" class="w-3 h-3 text-amber-400 shrink-0" />
                Pool: £{{ Number(comp.prize1st || 0) + Number(comp.prize2nd || 0) + Number(comp.prize3rd || 0) }}
              </span>
            </div>
          </div>

          <UButton
            :to="`/competitions/${comp.id}`"
            :color="comp.status === 'CLOSED' ? 'neutral' : 'success'"
            variant="solid"
            size="sm"
            class="font-bold w-full cursor-pointer shrink-0 justify-center"
            :class="comp.status === 'CLOSED' ? 'shadow-slate-800/20' : 'shadow-emerald-500/20'"
          >
            {{ comp.status === 'CLOSED' ? 'View Results' : 'Enter Lobby' }}
          </UButton>
        </div>
      </div>
    </div>

  </div>
</template>