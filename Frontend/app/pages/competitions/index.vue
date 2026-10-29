<script setup lang="ts">
import { ref, computed } from 'vue'

// Fetch all competitions from the backend API
const { data: compRes, refresh } = await useFetch('/api/competitions')
const competitions = computed(() => compRes.value?.data || [])

// Tab State: 'open' | 'closed'
const activeTab = ref<'open' | 'closed'>('open')

const search = ref('')

// Filter competitions by tab and search query
const filteredCompetitions = computed(() => {
  const query = search.value.toLowerCase().trim()
  
  return competitions.value.filter((c: any) => {
    // Tab check (Treat status 'CLOSED' as closed, everything else as open)
    const isClosed = c.status === 'CLOSED'
    const matchesTab = activeTab.value === 'closed' ? isClosed : !isClosed

    // Search check
    const matchesSearch = !query || 
      c.name?.toLowerCase().includes(query) || 
      c.venue?.toLowerCase().includes(query)

    return matchesTab && matchesSearch
  })
})

// Tab Counters
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
  <UContainer class="py-12 max-w-5xl mx-auto space-y-8">
    
    <!-- PAGE HEADER -->
    <div class="relative bg-slate-900/90 border border-slate-800/90 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl overflow-hidden space-y-6">
      
      <!-- Ambient Glows -->
      <div class="pointer-events-none absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-20 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl"></div>

      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md">
              Society Tournaments
            </span>
          </div>
          <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">Society Competitions</h1>
          <p class="text-xs sm:text-sm text-slate-400 max-w-lg">
            Browse upcoming society fixtures, register in lobbies, enter scorecards on match day, and view archived results.
          </p>
        </div>

        <!-- Search Field -->
        <div class="w-full md:w-72 relative">
          <input 
            v-model="search"
            type="text"
            placeholder="Search fixtures or venues..."
            class="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-emerald-500/80 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
        </div>
      </div>

      <!-- NAVIGATION TABS: OPEN VS CLOSED -->
      <div class="flex items-center gap-2 pt-2 border-t border-slate-800/80 relative z-10">
        <button 
          @click="activeTab = 'open'"
          type="button"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
          :class="activeTab === 'open' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-md' : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <UIcon name="i-heroicons-trophy" class="w-4 h-4" />
          <span>Open & Active Fixtures</span>
          <span class="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-md font-black">
            {{ openCount }}
          </span>
        </button>

        <button 
          @click="activeTab = 'closed'"
          type="button"
          class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
          :class="activeTab === 'closed' ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-md' : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
          <span>Completed Archives</span>
          <span class="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded-md font-black">
            {{ closedCount }}
          </span>
        </button>
      </div>

    </div>

    <!-- COMPETITIONS LIST -->
    <div class="space-y-4">
      
      <!-- Empty State -->
      <div v-if="filteredCompetitions.length === 0" class="bg-slate-900/60 border border-slate-800/80 p-12 rounded-3xl text-center space-y-3 backdrop-blur-xl">
        <div class="w-12 h-12 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto text-xl border border-slate-700/50">
          ⛳
        </div>
        <h3 class="text-base font-bold text-white">No {{ activeTab === 'open' ? 'Active' : 'Archived' }} Competitions Found</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">There are no tournaments matching your current tab or search filter.</p>
      </div>

      <!-- Competition Item Card -->
      <div 
        v-for="comp in filteredCompetitions" 
        :key="comp.id"
        class="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl backdrop-blur-xl shadow-xl transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group relative overflow-hidden"
      >
        <div class="space-y-3.5 flex-1">
          
          <!-- Badges & Title -->
          <div class="space-y-1.5">
            <div class="flex items-center gap-2.5 flex-wrap">
              <span 
                v-if="comp.status === 'CLOSED'" 
                class="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold rounded-md flex items-center gap-1"
              >
                🔒 Finalized
              </span>
              <span 
                v-else-if="isLiveToday(comp.date)" 
                class="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-md flex items-center gap-1 animate-pulse"
              >
                🏆 Live Competition Day
              </span>
              <span 
                v-else 
                class="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded-md flex items-center gap-1"
              >
                ⏳ Lobby Open
              </span>

              <span class="text-xs text-slate-500 font-semibold">• {{ comp.status }}</span>
            </div>

            <h2 class="text-xl font-black text-white group-hover:text-emerald-400 transition-colors">
              {{ comp.name }}
            </h2>
          </div>

          <!-- Metadata (Date & Venue) -->
          <div class="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            <span class="flex items-center gap-1.5 font-medium">
              <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-emerald-400" />
              {{ formatUKDate(comp.date) }}
            </span>
            <span class="text-slate-600">•</span>
            <span class="flex items-center gap-1.5 font-medium">
              <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-slate-500" />
              {{ comp.venue || 'Home Course' }}
            </span>
          </div>

          <!-- PRIZE POOL BREAKDOWN -->
          <div 
            v-if="comp.prize1st || comp.prize2nd || comp.prize3rd" 
            class="pt-1 flex items-center gap-2 flex-wrap text-xs font-bold"
          >
            <span class="text-[10px] uppercase font-black text-amber-400 tracking-wider mr-1 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-amber-400" />
              Pool: £{{ Number(comp.prize1st || 0) + Number(comp.prize2nd || 0) + Number(comp.prize3rd || 0) }}
            </span>
            
            <span v-if="comp.prize1st" class="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-[11px]">
              🥇 £{{ comp.prize1st }}
            </span>
            <span v-if="comp.prize2nd" class="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-[11px]">
              🥈 £{{ comp.prize2nd }}
            </span>
            <span v-if="comp.prize3rd" class="px-2.5 py-0.5 bg-amber-900/20 border border-amber-800/40 text-amber-500 rounded-lg text-[11px]">
              🥉 £{{ comp.prize3rd }}
            </span>
          </div>

        </div>

        <!-- Action Button -->
        <UButton 
          :to="`/competitions/${comp.id}`"
          :color="comp.status === 'CLOSED' ? 'neutral' : 'success'" 
          variant="solid" 
          size="md"
          class="font-bold whitespace-nowrap cursor-pointer shadow-lg shrink-0 self-stretch sm:self-auto justify-center"
          :class="comp.status === 'CLOSED' ? 'shadow-slate-800/20' : 'shadow-emerald-500/20'"
        >
          {{ comp.status === 'CLOSED' ? 'View Final Results' : 'Enter Lobby & Leaderboard' }}
        </UButton>

      </div>

    </div>

  </UContainer>
</template>