<script setup lang="ts">
import { ref, computed } from 'vue'

const formatUKDate = (isoString: string) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return isoString
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const mins = String(d.getMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} at ${hours}:${mins}`
}

const formatUKDateOnly = (isoString: string) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return isoString
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

// ----------------------------------------------------
// SCORECARD BREAKDOWN MODAL STATE
// ----------------------------------------------------
const selectedScorecard = ref<any>(null)
const showDetailModal = ref(false)

const openScorecardDetail = (sc: any) => {
  let parsedHoles: number[] = []
  try {
    parsedHoles = typeof sc.holeScores === 'string' ? JSON.parse(sc.holeScores) : sc.holeScores || []
  } catch (err) {
    parsedHoles = []
  }

  selectedScorecard.value = {
    ...sc,
    parsedHoles
  }
  showDetailModal.value = true
}

// 1. Fetch live player profile and score history stats
const { data: userRes, error: userError } = await useFetch('/api/auth/me')

if (userError.value) {
  await navigateTo('/register')
}

const playerProfile = computed(() => userRes.value?.data || {
  id: '',
  name: 'Society Member',
  username: '',
  handicapIndex: 0,
  nextRoundPenalty: 0,
  playingHandicap: 0,
  role: 'MEMBER'
})

// 2. Fetch active & upcoming competitions
const { data: compRes } = await useFetch('/api/competitions/upcoming')
const upcomingCompetitions = computed(() => compRes.value?.data || [])

// 3. Fetch user's profile details including scorecard history
const { data: profileRes } = await useFetch(() => `/api/users/${playerProfile.value.id}`, {
  immediate: !!playerProfile.value.id
})
const userScorecards = computed(() => profileRes.value?.data?.scorecards || [])

// 4. Fetch accepted friends list
const { data: friendsRes } = await useFetch('/api/friends/list', {
  immediate: !!playerProfile.value.id
})
const acceptedFriends = computed(() => friendsRes.value?.friends || [])

// Career Stat Calculations
const bestScore = computed(() => {
  if (userScorecards.value.length === 0) return 0
  return Math.max(...userScorecards.value.map((sc: any) => sc.stablefordPoints || 0))
})

// Optional course definition fallbacks for Par & SI
const currentCoursePars = ref([4, 5, 3, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4])
const currentCourseSI = ref([6, 12, 8, 18, 2, 14, 10, 4, 16, 5, 9, 13, 1, 17, 3, 7, 11, 15])

// Pagination Config (9 holes per view for 18-hole courses)
const pageSize = ref(9) 
const currentPage = ref(1)

const totalHolesCount = computed(() => {
  return selectedScorecard.value?.parsedHoles?.length || 18
})

const totalPages = computed(() => {
  return Math.ceil(totalHolesCount.value / pageSize.value)
})

const currentStartHole = computed(() => {
  return (currentPage.value - 1) * pageSize.value
})

// Paginated hole slice
const paginatedHoles = computed(() => {
  const holes = selectedScorecard.value?.parsedHoles || []
  const start = currentStartHole.value
  const end = start + pageSize.value

  return holes.slice(start, end).map((strokes: number, idx: number) => {
    const holeNumber = start + idx + 1
    const par = currentCoursePars.value[holeNumber - 1] || 4
    const si = currentCourseSI.value[holeNumber - 1] || holeNumber

    return {
      holeNumber,
      strokes,
      par,
      si
    }
  })
})

const getPageLabel = (page: number) => {
  if (pageSize.value === 9) {
    return page === 1 ? 'Out (1–9)' : 'In (10–18)'
  }
  return `Holes ${((page - 1) * pageSize.value) + 1}–${Math.min(page * pageSize.value, totalHolesCount.value)}`
}

// Color-coded golf badges
const getScoreBadgeClass = (strokes: number, par: number) => {
  if (!strokes) return 'bg-slate-900 text-slate-500'
  const diff = strokes - par
  if (diff <= -2) return 'bg-amber-500/20 text-amber-400 border border-amber-500/30' // Eagle
  if (diff === -1) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' // Birdie
  if (diff === 0) return 'bg-slate-800 text-slate-300' // Par
  if (diff === 1) return 'bg-orange-500/20 text-orange-400 border border-orange-500/30' // Bogey
  return 'bg-rose-500/20 text-rose-400 border border-rose-500/30' // Double Bogey+
}

const getScoreLabel = (strokes: number, par: number) => {
  if (!strokes) return 'N/A'
  const diff = strokes - par
  if (diff <= -2) return 'Eagle'
  if (diff === -1) return 'Birdie'
  if (diff === 0) return 'Par'
  if (diff === 1) return 'Bogey'
  return `+${diff}`
}

// Prevent background scrolling when modal is open
watch(showDetailModal, (isOpen) => {
  if (typeof document !== 'undefined') {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }
})
</script>

<template>
  <UContainer class="py-12 max-w-6xl mx-auto space-y-10">
    
    <!-- Player Welcome & Hero Card -->
    <div class="relative bg-slate-900/90 border border-slate-800/80 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl overflow-hidden space-y-8">
      
      <!-- Ambient Glow Effects -->
      <div class="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>

      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div class="space-y-3">
          <div class="flex items-center gap-2.5">
            <span class="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg shadow-sm">
              {{ playerProfile.role === 'ADMIN' ? '👑 Society Admin' : '⭐ Active Member' }}
            </span>
            <span class="text-xs font-medium text-slate-400">@{{ playerProfile.username }}</span>
          </div>
          <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Welcome back, <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{{ playerProfile.name }}</span>
          </h1>
          <p class="text-xs sm:text-sm text-slate-400 max-w-xl">
            Manage your society fixtures, inspect player handicap indexes, and analyze your live digital round scorecards.
          </p>
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto">
          <UButton 
            to="/courses" 
            color="success" 
            variant="solid" 
            size="lg" 
            icon="i-heroicons-pencil-square"
            class="font-bold shadow-xl shadow-emerald-500/20 flex-1 md:flex-initial cursor-pointer"
          >
            Start Scorecard
          </UButton>
          <UButton 
            to="/members" 
            color="neutral" 
            variant="soft" 
            size="lg" 
            icon="i-heroicons-user-group"
            class="font-semibold flex-1 md:flex-initial cursor-pointer"
          >
            Find Members
          </UButton>
        </div>
      </div>

      <!-- Stats Grid Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80 relative z-10">
        <div class="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl space-y-1 shadow-inner group hover:border-emerald-500/40 transition-all">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">WHS Handicap</span>
          <div class="text-2xl sm:text-3xl font-black text-white">{{ playerProfile.handicapIndex }}</div>
        </div>

        <div class="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl space-y-1 shadow-inner group hover:border-emerald-500/40 transition-all">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Rounds Played</span>
          <div class="text-2xl sm:text-3xl font-black text-emerald-400">{{ userScorecards.length }}</div>
        </div>

        <div class="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl space-y-1 shadow-inner group hover:border-emerald-500/40 transition-all">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Best Stableford</span>
          <div class="text-2xl sm:text-3xl font-black text-amber-400">{{ bestScore }} <span class="text-xs text-amber-500 font-bold">pts</span></div>
        </div>

        <div class="bg-slate-950/80 border border-slate-800/80 p-5 rounded-2xl space-y-1 shadow-inner group hover:border-emerald-500/40 transition-all">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Playing HCP</span>
          <div class="text-2xl sm:text-3xl font-black text-emerald-400">{{ playerProfile.playingHandicap }}</div>
        </div>
      </div>
    </div>


    <!-- Main Layout: Fixtures & Friends -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Fixtures Column (2 Spans) -->
      <div class="lg:col-span-2 space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-white flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UIcon name="i-heroicons-trophy" class="w-4 h-4" />
            </div>
            <span>Society Fixtures & Lobby</span>
          </h2>
          <span class="text-xs text-emerald-400 font-bold px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            {{ upcomingCompetitions.length }} Active
          </span>
        </div>

        <div v-if="upcomingCompetitions.length === 0" class="bg-slate-900/60 border border-slate-800/80 p-12 rounded-3xl text-center space-y-3">
          <UIcon name="i-heroicons-calendar" class="w-10 h-10 text-slate-600 mx-auto" />
          <h3 class="text-base font-bold text-white">No Open Competitions</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">There are currently no active fixtures scheduled. Check back soon for the next tee time.</p>
        </div>

        <div v-else class="space-y-4">
          <div 
            v-for="comp in upcomingCompetitions" 
            :key="comp.id"
            class="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl backdrop-blur-xl shadow-xl transition-all duration-300 space-y-5 flex flex-col justify-between group"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">{{ comp.name }}</span>
                <span :class="comp.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'" class="px-2.5 py-1 border text-[10px] font-bold rounded-lg uppercase tracking-wider">
                  {{ comp.status }}
                </span>
              </div>

              <div class="space-y-2 text-xs text-slate-400">
                <div class="flex items-center gap-2.5">
                  <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{{ formatUKDate(comp.date) }}</span>
                </div>
                <div class="flex items-center gap-2.5">
                  <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{{ comp.venue }}</span>
                </div>
              </div>
            </div>

            <div>
              <UButton 
                :to="`/competitions/${comp.id}`" 
                color="success" 
                variant="solid"
                size="md" 
                block 
                icon="i-heroicons-clipboard-document-check"
                class="font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Enter Competition Lobby
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Friends Column (1 Span) -->
      <div class="space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-white flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
            </div>
            <span>My Friends</span>
          </h2>
          <NuxtLink to="/members" class="text-xs text-emerald-400 hover:underline font-bold">
            Find More →
          </NuxtLink>
        </div>

        <div class="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl shadow-xl space-y-4">
          <div v-if="acceptedFriends.length === 0" class="text-center py-8 space-y-3">
            <p class="text-xs text-slate-400">No friends added yet.</p>
            <UButton to="/members" size="xs" color="success" variant="subtle">Search Members</UButton>
          </div>

          <div v-else class="space-y-3">
            <NuxtLink 
              v-for="friend in acceptedFriends" 
              :key="friend.friendId"
              :to="`/player/${friend.friendId}`"
              class="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl transition-all group"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {{ friend.name.charAt(0).toUpperCase() }}
                </div>
                <div class="leading-tight truncate">
                  <span class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors block truncate">{{ friend.name }}</span>
                  <span class="text-[10px] text-slate-400">@{{ friend.username }}</span>
                </div>
              </div>
              <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                HCP {{ friend.handicapIndex }}
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>

    </div>


    <!-- RECENT ROUNDS & SCORECARD HISTORY SECTION -->
    <div class="space-y-5 pt-6">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-bold text-white flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
          </div>
          <span>My Recent Rounds</span>
        </h2>
        <NuxtLink :to="`/player/${playerProfile.id}`" class="text-xs text-emerald-400 hover:underline font-bold">
          View Full Profile →
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div v-if="userScorecards.length === 0" class="bg-slate-900/60 border border-slate-800/80 p-12 rounded-3xl text-center space-y-3">
        <UIcon name="i-heroicons-document-minus" class="w-10 h-10 text-slate-600 mx-auto" />
        <h3 class="text-base font-bold text-white">No Rounds Recorded</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">You haven't submitted any scorecards yet. Play a round and save your scorecard to build your career history.</p>
        <div class="pt-2">
          <UButton to="/scorecard" color="success" size="sm" icon="i-heroicons-plus">Play First Round</UButton>
        </div>
      </div>

      <!-- Recent Rounds Cards Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div 
          v-for="sc in userScorecards.slice(0, 6)" 
          :key="sc.id"
          @click="openScorecardDetail(sc)"
          class="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-3xl backdrop-blur-xl shadow-xl space-y-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] group"
        >
          <div class="space-y-3">
            
            <!-- Type Badge (Competition vs Normal Round) -->
            <div class="flex items-center justify-between">
              <span 
                v-if="sc.isCompetition" 
                class="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold rounded-lg flex items-center gap-1.5"
              >
                <UIcon name="i-heroicons-trophy" class="w-3 h-3 text-amber-400" />
                Competition Round
              </span>
              <span 
                v-else 
                class="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-lg flex items-center gap-1.5"
              >
                <UIcon name="i-heroicons-flag" class="w-3 h-3 text-emerald-400" />
                Normal Round
              </span>

              <span class="text-[10px] text-slate-500 font-medium">{{ formatUKDateOnly(sc.playedAt) }}</span>
            </div>

            <div class="flex items-start justify-between gap-2 pt-1">
              <div>
                <h3 class="font-bold text-white text-base leading-tight group-hover:text-emerald-400 transition-colors">
                  {{ sc.courseName }}
                </h3>
                <p v-if="sc.isCompetition && sc.competitionTitle" class="text-[11px] text-amber-400/90 font-semibold truncate max-w-[170px] mt-0.5">
                  🏆 {{ sc.competitionTitle }}
                </p>
                <p class="text-xs text-slate-400 mt-0.5">📍 {{ sc.courseLocation }}</p>
              </div>

              <div class="text-right shrink-0 bg-slate-950/80 px-3 py-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
                <span class="text-lg font-black text-emerald-400">{{ sc.stablefordPoints }}</span>
                <span class="text-[9px] uppercase font-bold text-slate-400 block -mt-1">pts</span>
              </div>
            </div>

          </div>

          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span class="text-emerald-400 font-bold group-hover:underline flex items-center gap-1">
              View Hole-by-Hole Scores →
            </span>
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>

    <!-- HOLE-BY-HOLE SCORECARD BREAKDOWN MODAL -->
    <Teleport to="body">
      <Transition name="modal">
        <div 
          v-if="showDetailModal && selectedScorecard" 
          class="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md overflow-hidden"
          @click.self="showDetailModal = false"
        >
          <!-- Modal Container -->
          <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[88vh] relative my-auto">
            
            <!-- Modal Header (Fixed) -->
            <div class="flex items-start justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h2 class="text-base sm:text-lg font-black text-white">{{ selectedScorecard.courseName }}</h2>
                <p class="text-[11px] sm:text-xs text-slate-400">📍 {{ selectedScorecard.courseLocation }} • {{ formatUKDateOnly(selectedScorecard.playedAt) }}</p>
              </div>
              <button 
                @click="showDetailModal = false" 
                class="text-slate-400 hover:text-white text-xs font-bold p-1.5 bg-slate-800/60 rounded-full cursor-pointer leading-none"
              >
                ✕
              </button>
            </div>

            <!-- Scrollable Inner Content Area -->
            <div class="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
              
              <!-- Total Score Summary -->
              <div class="grid grid-cols-2 gap-3 text-center">
                <div class="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shadow-inner">
                  <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Strokes</span>
                  <span class="text-xl font-black text-white">
                    {{ selectedScorecard.parsedHoles.reduce((a: number, b: number) => a + (b || 0), 0) }}
                  </span>
                </div>
                <div class="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shadow-inner">
                  <span class="text-[10px] uppercase font-bold text-slate-400 block">Stableford Points</span>
                  <span class="text-xl font-black text-emerald-400">{{ selectedScorecard.stablefordPoints }} pts</span>
                </div>
              </div>

              <!-- Hole-by-Hole Grid Header & Tabs -->
              <div class="space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span class="text-xs font-bold uppercase tracking-wider text-emerald-400 block">Hole-by-Hole Breakdown</span>
                    <p class="text-[10px] text-slate-400">
                      Holes {{ currentStartHole + 1 }}–{{ Math.min(currentStartHole + pageSize, totalHolesCount) }} of {{ totalHolesCount }}
                    </p>
                  </div>

                  <!-- Page Switcher Tabs -->
                  <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button 
                      v-for="page in totalPages" 
                      :key="page"
                      type="button"
                      @click="currentPage = page"
                      :class="currentPage === page ? 'bg-emerald-600 text-white font-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'"
                      class="px-2.5 py-1 rounded-lg text-xs transition-all duration-200 cursor-pointer"
                    >
                      {{ getPageLabel(page) }}
                    </button>
                  </div>
                </div>

                <!-- 2-Column Responsive Hole Grid -->
                <div class="grid grid-cols-2 gap-2">
                  <div 
                    v-for="hole in paginatedHoles" 
                    :key="hole.holeNumber" 
                    class="p-2.5 bg-slate-950/90 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-1.5 shadow-sm"
                  >
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="font-black text-slate-300">Hole {{ hole.holeNumber }}</span>
                      <span class="font-semibold text-slate-500 text-[9px] uppercase">
                        Par {{ hole.par }} • SI {{ hole.si }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between pt-1 border-t border-slate-900">
                      <span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" :class="getScoreBadgeClass(hole.strokes, hole.par)">
                        {{ getScoreLabel(hole.strokes, hole.par) }}
                      </span>
                      <span class="text-sm font-black text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg shadow-inner">
                        {{ hole.strokes ?? '-' }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Page Pagination Navigation -->
                <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                  <UButton 
                    @click="currentPage--" 
                    :disabled="currentPage === 1"
                    color="neutral" 
                    variant="soft" 
                    size="xs" 
                    icon="i-heroicons-chevron-left"
                    class="font-semibold cursor-pointer disabled:opacity-30"
                  >
                    Previous
                  </UButton>

                  <div class="text-[10px] font-bold text-slate-400">
                    Page <span class="text-white">{{ currentPage }}</span> of {{ totalPages }}
                  </div>

                  <UButton 
                    @click="currentPage++" 
                    :disabled="currentPage === totalPages"
                    color="neutral" 
                    variant="soft" 
                    size="xs" 
                    trailing
                    icon="i-heroicons-chevron-right"
                    class="font-semibold cursor-pointer disabled:opacity-30"
                  >
                    Next
                  </UButton>
                </div>

              </div>

            </div>

            <!-- Fixed Modal Footer -->
            <div class="pt-3 border-t border-slate-800 shrink-0">
              <UButton @click="showDetailModal = false" color="neutral" variant="ghost" block size="md" class="font-semibold cursor-pointer text-slate-400">
                Close Breakdown
              </UButton>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

  </UContainer>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>