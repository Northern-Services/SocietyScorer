<script setup lang="ts">
import { ref, computed, watch } from 'vue'

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

// SCORECARD BREAKDOWN MODAL STATE
const selectedScorecard = ref<any>(null)
const showDetailModal = ref(false)

const openScorecardDetail = (sc: any) => {
  let parsedHoles: number[] = []
  try {
    parsedHoles = typeof sc.holeScores === 'string' ? JSON.parse(sc.holeScores) : sc.holeScores || []
  } catch (err) {
    parsedHoles = []
  }
  selectedScorecard.value = { ...sc, parsedHoles }
  showDetailModal.value = true
}

// 1. Fetch live player profile
const { data: userRes, error: userError } = await useFetch('/api/auth/me')

if (userError.value) {
  await navigateTo('/register')
}

const playerProfile = computed(() => userRes.value?.data || {
  id: '', name: 'Society Member', username: '', handicapIndex: 0, nextRoundPenalty: 0, playingHandicap: 0, role: 'MEMBER'
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
  <div class="px-3 py-4 space-y-5 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Player Welcome Card -->
    <div class="relative bg-slate-900/90 border border-slate-800/80 p-4 rounded-3xl backdrop-blur-xl shadow-2xl overflow-hidden space-y-4">
      <div class="pointer-events-none absolute -top-8 -right-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-[60px]"></div>

      <div class="relative z-10 space-y-3">
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg shadow-sm">
            {{ playerProfile.role === 'ADMIN' ? '👑 Society Admin' : '⭐ Active Member' }}
          </span>
          <span class="text-[11px] font-medium text-slate-400">@{{ playerProfile.username }}</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">
          Welcome back, <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">{{ playerProfile.name }}</span>
        </h1>
        <p class="text-[12px] text-slate-400 leading-relaxed">
          Manage fixtures, inspect handicaps, and review your live digital scorecards.
        </p>
      </div>

      <!-- Primary Actions -->
      <div class="flex flex-col gap-2 pt-2 relative z-10">
        <UButton
          to="/scorecard"
          color="success"
          variant="solid"
          size="sm"
          icon="i-heroicons-pencil-square"
          block
          class="font-bold shadow-xl shadow-emerald-500/20 cursor-pointer"
        >
          Start Scorecard
        </UButton>
        <UButton
          to="/members"
          color="neutral"
          variant="soft"
          size="sm"
          icon="i-heroicons-user-group"
          block
          class="font-semibold cursor-pointer"
        >
          Find Members
        </UButton>
      </div>

      <!-- Stats Grid (2 columns on mobile) -->
      <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 relative z-10">
        <div class="bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl space-y-1 shadow-inner group hover:border-emerald-500/40 transition-all">
          <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">WHS Handicap</span>
          <div class="text-xl sm:text-2xl font-black text-white">{{ playerProfile.handicapIndex }}</div>
        </div>
        <div class="bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl space-y-1 shadow-inner group hover:border-emerald-500/40 transition-all">
          <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Rounds Played</span>
          <div class="text-xl sm:text-2xl font-black text-emerald-400">{{ userScorecards.length }}</div>
        </div>
        <div class="bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl space-y-1 shadow-inner group hover:border-emerald-500/40 transition-all">
          <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Best Stableford</span>
          <div class="text-xl sm:text-2xl font-black text-amber-400">{{ bestScore }} <span class="text-[10px] text-amber-500 font-bold block">pts</span></div>
        </div>
        <div class="bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl space-y-1 shadow-inner group hover:border-emerald-500/40 transition-all">
          <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Playing HCP</span>
          <div class="text-xl sm:text-2xl font-black text-emerald-400">{{ playerProfile.playingHandicap }}</div>
        </div>
      </div>
    </div>

    <!-- Society Fixtures -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white flex items-center gap-2">
          <div class="w-5 h-5 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <UIcon name="i-heroicons-trophy" class="w-3 h-3" />
          </div>
          <span>Society Fixtures</span>
        </h2>
        <span class="text-[10px] text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          {{ upcomingCompetitions.length }} Active
        </span>
      </div>

      <div v-if="upcomingCompetitions.length === 0" class="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl text-center space-y-2">
        <UIcon name="i-heroicons-calendar" class="w-8 h-8 text-slate-600 mx-auto" />
        <h3 class="text-sm font-bold text-white">No Open Competitions</h3>
        <p class="text-[11px] text-slate-400 max-w-xs mx-auto">No active fixtures scheduled. Check back for the next tee time.</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="comp in upcomingCompetitions"
          :key="comp.id"
          class="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-3.5 rounded-3xl backdrop-blur-xl shadow-xl transition-all duration-300 space-y-3 group"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{{ comp.name }}</span>
              <span :class="comp.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'" class="px-2 py-0.5 border text-[9px] font-bold rounded-lg uppercase tracking-wider">
                {{ comp.status }}
              </span>
            </div>
            <div class="space-y-1.5 text-[11px] text-slate-400">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{{ formatUKDate(comp.date) }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{{ comp.venue }}</span>
              </div>
            </div>
          </div>
          <UButton
            :to="`/competitions/${comp.id}`"
            color="success"
            variant="solid"
            size="sm"
            block
            icon="i-heroicons-clipboard-document-check"
            class="font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            Enter Lobby
          </UButton>
        </div>
      </div>
    </div>

    <!-- My Friends -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white flex items-center gap-2">
          <div class="w-5 h-5 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <UIcon name="i-heroicons-user-group" class="w-3 h-3" />
          </div>
          <span>My Friends</span>
        </h2>
        <NuxtLink to="/members" class="text-[10px] text-emerald-400 hover:underline font-bold">Find More →</NuxtLink>
      </div>

      <div class="bg-slate-900/80 border border-slate-800 p-3.5 rounded-3xl backdrop-blur-xl shadow-xl space-y-3">
        <div v-if="acceptedFriends.length === 0" class="text-center py-3 space-y-1">
          <p class="text-[11px] text-slate-400">No friends added yet.</p>
          <UButton to="/members" size="xs" color="success" variant="subtle">Search Members</UButton>
        </div>

        <div v-else class="space-y-2">
          <NuxtLink
            v-for="friend in acceptedFriends"
            :key="friend.friendId"
            :to="`/player/${friend.friendId}`"
            class="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl transition-all group"
          >
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                {{ friend.name.charAt(0).toUpperCase() }}
              </div>
              <div class="leading-tight min-w-0">
                <span class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors block truncate">{{ friend.name }}</span>
                <span class="text-[9px] text-slate-400 truncate">@{{ friend.username }}</span>
              </div>
            </div>
            <span class="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              HCP {{ friend.handicapIndex }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- My Recent Rounds -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-white flex items-center gap-2">
          <div class="w-5 h-5 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <UIcon name="i-heroicons-document-text" class="w-3 h-3" />
          </div>
          <span>My Recent Rounds</span>
        </h2>
        <NuxtLink :to="`/player/${playerProfile.id}`" class="text-[10px] text-emerald-400 hover:underline font-bold">Full Profile →</NuxtLink>
      </div>

      <div v-if="userScorecards.length === 0" class="bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl text-center space-y-2">
        <UIcon name="i-heroicons-document-minus" class="w-8 h-8 text-slate-600 mx-auto" />
        <h3 class="text-sm font-bold text-white">No Rounds Recorded</h3>
        <p class="text-[11px] text-slate-400 max-w-xs mx-auto">Play a round and save your scorecard to build your career history.</p>
        <div class="pt-1">
          <UButton to="/scorecard" color="success" size="sm" icon="i-heroicons-plus" block>Play First Round</UButton>
        </div>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="sc in userScorecards.slice(0, 4)"
          :key="sc.id"
          @click="openScorecardDetail(sc)"
          class="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-3.5 rounded-3xl backdrop-blur-xl shadow-xl space-y-3 cursor-pointer transition-all hover:scale-[1.02] group"
        >
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span
                v-if="sc.isCompetition"
                class="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-bold rounded-lg flex items-center gap-1"
              >
                <UIcon name="i-heroicons-trophy" class="w-3 h-3 text-amber-400" />
                Competition Round
              </span>
              <span v-else class="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold rounded-lg flex items-center gap-1">
                <UIcon name="i-heroicons-flag" class="w-3 h-3 text-emerald-400" />
                Normal Round
              </span>
              <span class="text-[9px] text-slate-500 font-medium">{{ formatUKDateOnly(sc.playedAt) }}</span>
            </div>
            <div class="flex items-start justify-between gap-2 mt-0.5">
              <div class="min-w-0">
                <h3 class="font-bold text-white text-sm leading-tight group-hover:text-emerald-400 transition-colors truncate">{{ sc.courseName }}</h3>
                <p v-if="sc.isCompetition && sc.competitionTitle" class="text-[10px] text-amber-400/90 font-semibold truncate mt-0.5">🏆 {{ sc.competitionTitle }}</p>
                <p class="text-[11px] text-slate-400 mt-0.5">📍 {{ sc.courseLocation }}</p>
              </div>
              <div class="text-right shrink-0 bg-slate-950/80 px-2.5 py-1 rounded-2xl border border-slate-800/80 shadow-inner">
                <span class="text-lg font-black text-emerald-400 block">{{ sc.stablefordPoints }}</span>
                <span class="text-[9px] uppercase font-bold text-slate-400 block">pts</span>
              </div>
            </div>
          </div>
          <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
            <span class="text-emerald-400 font-bold group-hover:underline flex items-center gap-1">View Hole-by-Hole →</span>
            <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>

    <!-- HOLE-BY-HOLE SCORECARD BREAKDOWN MODAL (bottom sheet) -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDetailModal && selectedScorecard"
          class="fixed inset-0 z-[999] flex items-end justify-center p-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-slate-950/90 backdrop-blur-md overflow-hidden sm:items-center sm:p-4 sm:pb-0"
          @click.self="showDetailModal = false"
        >
          <div class="bg-slate-900 border border-slate-800 w-full rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[88vh] relative">
            <!-- Drag handle -->
            <div class="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden"></div>

            <!-- Modal Header -->
            <div class="flex items-start justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h2 class="text-sm sm:text-base font-black text-white">{{ selectedScorecard.courseName }}</h2>
                <p class="text-[10px] sm:text-xs text-slate-400">📍 {{ selectedScorecard.courseLocation }} • {{ formatUKDateOnly(selectedScorecard.playedAt) }}</p>
              </div>
              <button @click="showDetailModal = false" class="text-slate-400 hover:text-white text-xs font-bold p-1.5 bg-slate-800/60 rounded-full cursor-pointer leading-none">✕</button>
            </div>

            <!-- Scrollable Content -->
            <div class="overflow-y-auto py-2 sm:py-4 space-y-3 flex-1 pr-1">
              <!-- Total Score Summary -->
              <div class="grid grid-cols-2 gap-2 text-center">
                <div class="bg-slate-950/80 p-2 sm:p-3 rounded-2xl border border-slate-800 shadow-inner">
                  <span class="text-[9px] uppercase font-bold text-slate-400 block">Total Strokes</span>
                  <span class="text-lg sm:text-xl font-black text-white">
                    {{ selectedScorecard.parsedHoles.reduce((a: number, b: number) => a + (b || 0), 0) }}
                  </span>
                </div>
                <div class="bg-slate-950/80 p-2 sm:p-3 rounded-2xl border border-slate-800 shadow-inner">
                  <span class="text-[9px] uppercase font-bold text-slate-400 block">Stableford Points</span>
                  <span class="text-lg sm:text-xl font-black text-emerald-400">{{ selectedScorecard.stablefordPoints }} pts</span>
                </div>
              </div>

              <!-- Hole Pagination -->
              <div class="space-y-2">
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <span class="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block">Hole-by-Hole Breakdown</span>
                    <p class="text-[10px] text-slate-400">
                      Holes 1–{{ Math.min(9, selectedScorecard.parsedHoles.length) }} of {{ selectedScorecard.parsedHoles.length }}
                    </p>
                  </div>
                  <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      v-for="page in [1, 2]"
                      :key="page"
                      type="button"
                      class="px-2 py-1 rounded-lg text-[9px] transition-all duration-200 cursor-pointer"
                      :class="[
                        page === 1 ? 'bg-emerald-600 text-white font-black shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      ]"
                    >
                      {{ page === 1 ? 'Out (1–9)' : 'In (10–18)' }}
                    </button>
                  </div>
                </div>

                <!-- 2-Column Hole Grid -->
                <div class="grid grid-cols-2 gap-2">
                  <div
                    v-for="(strokes, idx) in selectedScorecard.parsedHoles.slice(0, 9)"
                    :key="idx"
                    class="p-2 bg-slate-950/90 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-1 shadow-sm"
                  >
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="font-black text-slate-300">Hole {{ idx + 1 }}</span>
                      <span class="font-semibold text-slate-500 text-[9px] uppercase">
                        Par {{ 4 }} • SI {{ idx + 1 }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between pt-1 border-t border-slate-900">
                      <span class="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-slate-800 text-slate-300">
                        {{ strokes ? (strokes <= 4 ? 'Birdie' : strokes === 4 ? 'Par' : 'Bogey') : '-' }}
                      </span>
                      <span class="text-sm font-black text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg shadow-inner">
                        {{ strokes ?? '-' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fixed Footer -->
            <div class="pt-3 border-t border-slate-800 shrink-0">
              <UButton @click="showDetailModal = false" color="neutral" variant="ghost" block size="md" class="font-semibold cursor-pointer text-slate-400">
                Close Breakdown
              </UButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
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