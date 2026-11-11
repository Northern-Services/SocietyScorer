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
const holePage = ref<1 | 2>(1)

const openScorecardDetail = (sc: any) => {
  let parsedHoles: number[] = []
  try {
    parsedHoles = typeof sc.holeScores === 'string' ? JSON.parse(sc.holeScores) : sc.holeScores || []
  } catch (err) {
    parsedHoles = []
  }
  holePage.value = 1
  selectedScorecard.value = { ...sc, parsedHoles }
  showDetailModal.value = true
}

const displayedHoles = computed(() => {
  if (!selectedScorecard.value?.parsedHoles) return []
  return holePage.value === 1
    ? selectedScorecard.value.parsedHoles.slice(0, 9)
    : selectedScorecard.value.parsedHoles.slice(9, 18)
})

// 1. Fetch live player profile and require auth
const { data: userRes, error: userError } = await useFetch('/api/auth/me', {
  ignoreResponseError: true
})

const isLoggedIn = computed(() => !!userRes.value?.success && !!userRes.value?.data)

if (userError.value || !isLoggedIn.value) {
  await navigateTo('/login')
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
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Player Telemetry Console -->
    <section class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl">
      <!-- Top Status Strip -->
      <div class="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] font-mono">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          <span class="text-orange-400 font-bold uppercase tracking-wider">
            {{ playerProfile.role === 'ADMIN' ? 'ROLE // ADMIN' : 'ROLE // MEMBER' }}
          </span>
        </div>
        <span class="text-zinc-400">@{{ playerProfile.username }}</span>
      </div>

      <!-- Profile Header & Actions -->
      <div class="p-4 sm:p-5 space-y-4">
        <div class="space-y-1">
          <h1 class="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
            Welcome back, <span class="text-orange-400">{{ playerProfile.name }}</span>
          </h1>
          <p class="text-xs text-zinc-400 leading-relaxed">
            Manage society fixtures, verify WHS playing handicaps, and inspect digital scorecards.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <UButton
            to="/scorecard"
            size="sm"
            icon="i-heroicons-pencil-square"
            block
            class="rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold tracking-tight transition-colors cursor-pointer"
          >
            Start Scorecard
          </UButton>
          <UButton
            to="/members"
            variant="outline"
            size="sm"
            icon="i-heroicons-user-group"
            block
            class="rounded-sm border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 font-semibold transition-colors cursor-pointer"
          >
            Find Members
          </UButton>
        </div>
      </div>

      <!-- Border-Collapsed Telemetry Matrix -->
      <div class="grid grid-cols-2 sm:grid-cols-4 border-t border-zinc-800 divide-x divide-y sm:divide-y-0 divide-zinc-800 bg-zinc-900/20 font-mono">
        <div class="p-3.5 space-y-1">
          <span class="text-[10px] uppercase tracking-wider text-zinc-500 block">WHS Index</span>
          <div class="text-xl font-bold text-zinc-100">{{ playerProfile.handicapIndex }}</div>
        </div>
        <div class="p-3.5 space-y-1">
          <span class="text-[10px] uppercase tracking-wider text-zinc-500 block">Playing HCP</span>
          <div class="text-xl font-bold text-orange-400">{{ playerProfile.playingHandicap }}</div>
        </div>
        <div class="p-3.5 space-y-1">
          <span class="text-[10px] uppercase tracking-wider text-zinc-500 block">Rounds Logged</span>
          <div class="text-xl font-bold text-zinc-100">{{ userScorecards.length }}</div>
        </div>
        <div class="p-3.5 space-y-1">
          <span class="text-[10px] uppercase tracking-wider text-zinc-500 block">Best Stableford</span>
          <div class="text-xl font-bold text-emerald-400">
            {{ bestScore }} <span class="text-[10px] text-zinc-500 font-normal">PTS</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Society Fixtures -->
    <section class="space-y-3">
      <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-orange-400" />
          <h2 class="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">Society Fixtures</h2>
        </div>
        <span class="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-sm">
          {{ upcomingCompetitions.length }} ACTIVE
        </span>
      </div>

      <div v-if="upcomingCompetitions.length === 0" class="border border-zinc-800 bg-zinc-950/60 p-6 rounded-sm text-center space-y-2">
        <UIcon name="i-heroicons-calendar" class="w-6 h-6 text-zinc-600 mx-auto" />
        <h3 class="text-xs font-mono font-bold uppercase text-zinc-300">No Open Competitions</h3>
        <p class="text-xs text-zinc-500 max-w-xs mx-auto">No active fixtures scheduled. Check back for the next tee time.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="comp in upcomingCompetitions"
          :key="comp.id"
          class="group relative border border-zinc-800 bg-zinc-950 hover:border-zinc-700 p-4 rounded-sm transition-colors flex flex-col justify-between space-y-4"
        >
          <div class="absolute top-0 left-0 w-full h-[2px] bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

          <div class="space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <span class="font-bold text-zinc-100 text-sm group-hover:text-orange-400 transition-colors leading-snug">
                {{ comp.name }}
              </span>
              <span
                :class="comp.status === 'OPEN'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'"
                class="px-1.5 py-0.5 border text-[9px] font-mono font-bold rounded-sm uppercase tracking-wider shrink-0"
              >
                {{ comp.status }}
              </span>
            </div>

            <div class="space-y-1 text-xs font-mono text-zinc-400">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>{{ formatUKDate(comp.date) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span class="truncate">{{ comp.venue }}</span>
              </div>
            </div>
          </div>

          <UButton
            :to="`/competitions/${comp.id}`"
            size="xs"
            block
            icon="i-heroicons-arrow-right-circle"
            class="rounded-sm bg-zinc-900 hover:bg-[#F6821F] text-zinc-200 hover:text-zinc-950 border border-zinc-700 hover:border-[#F6821F] font-mono font-bold uppercase tracking-wider py-2 transition-colors cursor-pointer"
          >
            Enter Lobby
          </UButton>
        </div>
      </div>
    </section>

    <!-- My Recent Rounds -->
    <section class="space-y-3">
      <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-document-text" class="w-4 h-4 text-orange-400" />
          <h2 class="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">Recent Scorecards</h2>
        </div>
        <NuxtLink :to="`/player/${playerProfile.id}`" class="text-[11px] font-mono text-orange-400 hover:underline">
          ROUND_ARCHIVE →
        </NuxtLink>
      </div>

      <div v-if="userScorecards.length === 0" class="border border-zinc-800 bg-zinc-950/60 p-6 rounded-sm text-center space-y-3">
        <UIcon name="i-heroicons-document-minus" class="w-6 h-6 text-zinc-600 mx-auto" />
        <div class="space-y-1">
          <h3 class="text-xs font-mono font-bold uppercase text-zinc-300">No Rounds Recorded</h3>
          <p class="text-xs text-zinc-500 max-w-xs mx-auto">Log a scorecard on the course to populate your career telemetry.</p>
        </div>
        <UButton
          to="/scorecard"
          size="xs"
          icon="i-heroicons-plus"
          class="rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-mono font-bold uppercase"
        >
          Play First Round
        </UButton>
      </div>

      <div v-else class="border border-zinc-800 divide-y divide-zinc-800 bg-zinc-950 rounded-sm overflow-hidden">
        <div
          v-for="sc in userScorecards.slice(0, 4)"
          :key="sc.id"
          @click="openScorecardDetail(sc)"
          class="p-3.5 hover:bg-zinc-900/60 transition-colors cursor-pointer group flex items-center justify-between gap-3"
        >
          <div class="min-w-0 space-y-1.5">
            <div class="flex items-center gap-2">
              <span
                v-if="sc.isCompetition"
                class="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-mono font-bold rounded-sm uppercase"
              >
                COMPETITION
              </span>
              <span
                v-else
                class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400 text-[9px] font-mono font-bold rounded-sm uppercase"
              >
                GENERAL
              </span>
              <span class="text-[10px] font-mono text-zinc-500">{{ formatUKDateOnly(sc.playedAt) }}</span>
            </div>

            <div>
              <h3 class="font-bold text-zinc-100 text-sm group-hover:text-orange-400 transition-colors truncate">
                {{ sc.courseName }}
              </h3>
              <p v-if="sc.isCompetition && sc.competitionTitle" class="text-[11px] font-mono text-amber-400/90 truncate">
                {{ sc.competitionTitle }}
              </p>
              <p class="text-[11px] text-zinc-500 truncate">{{ sc.courseLocation }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <div class="text-right bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-sm font-mono">
              <span class="text-base font-bold text-orange-400 block leading-none">{{ sc.stablefordPoints }}</span>
              <span class="text-[9px] uppercase text-zinc-500 block mt-0.5">PTS</span>
            </div>
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors" />
          </div>
        </div>
      </div>
    </section>

    <!-- My Friends -->
    <section class="space-y-3">
      <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user-group" class="w-4 h-4 text-orange-400" />
          <h2 class="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">Society Connections</h2>
        </div>
        <NuxtLink to="/members" class="text-[11px] font-mono text-orange-400 hover:underline">
          DIRECTORY →
        </NuxtLink>
      </div>

      <div class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden">
        <div v-if="acceptedFriends.length === 0" class="p-5 text-center space-y-2">
          <p class="text-xs font-mono text-zinc-500">NO_CONNECTIONS_FOUND</p>
          <UButton
            to="/members"
            size="xs"
            variant="outline"
            class="rounded-sm border-zinc-700 text-zinc-300 hover:bg-zinc-900 font-mono text-[11px]"
          >
            Search Members
          </UButton>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800">
          <NuxtLink
            v-for="friend in acceptedFriends"
            :key="friend.friendId"
            :to="`/player/${friend.friendId}`"
            class="flex items-center justify-between p-3 hover:bg-zinc-900/60 transition-colors group"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-7 h-7 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                {{ friend.name.charAt(0).toUpperCase() }}
              </div>
              <div class="leading-tight min-w-0">
                <span class="text-xs font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors block truncate">
                  {{ friend.name }}
                </span>
                <span class="text-[10px] font-mono text-zinc-500 block truncate">@{{ friend.username }}</span>
              </div>
            </div>
            <span class="text-[10px] font-mono font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-sm shrink-0">
              HCP {{ friend.handicapIndex }}
            </span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- HOLE-BY-HOLE SCORECARD BREAKDOWN MODAL -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDetailModal && selectedScorecard"
          class="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm"
          @click.self="showDetailModal = false"
        >
          <div class="bg-zinc-950 border-t sm:border border-zinc-800 w-full sm:max-w-lg rounded-t-md sm:rounded-sm shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
            
            <!-- Modal Header -->
            <div class="flex items-start justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 shrink-0">
              <div>
                <div class="text-[10px] font-mono text-orange-400 uppercase tracking-wider">SCORECARD_TELEMETRY</div>
                <h2 class="text-sm sm:text-base font-bold text-zinc-100 mt-0.5">{{ selectedScorecard.courseName }}</h2>
                <p class="text-[11px] font-mono text-zinc-400">
                  {{ selectedScorecard.courseLocation }} • {{ formatUKDateOnly(selectedScorecard.playedAt) }}
                </p>
              </div>
              <button
                @click="showDetailModal = false"
                class="w-7 h-7 flex items-center justify-center rounded-sm border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 font-mono text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <!-- Scrollable Content -->
            <div class="overflow-y-auto p-4 space-y-4 flex-1">
              
              <!-- Total Score Summary Matrix -->
              <div class="grid grid-cols-2 border border-zinc-800 divide-x divide-zinc-800 bg-zinc-900/30 text-center font-mono">
                <div class="p-3">
                  <span class="text-[10px] uppercase text-zinc-500 block">Total Strokes</span>
                  <span class="text-xl font-bold text-zinc-100">
                    {{ selectedScorecard.parsedHoles.reduce((a: number, b: number) => a + (b || 0), 0) }}
                  </span>
                </div>
                <div class="p-3">
                  <span class="text-[10px] uppercase text-zinc-500 block">Stableford Points</span>
                  <span class="text-xl font-bold text-orange-400">{{ selectedScorecard.stablefordPoints }} PTS</span>
                </div>
              </div>

              <!-- Hole Pagination Controls -->
              <div class="space-y-2.5">
                <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div>
                    <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-300 block">
                      Hole-by-Hole Log
                    </span>
                    <p class="text-[10px] font-mono text-zinc-500">
                      {{ holePage === 1 ? 'HOLES 01–09 (OUT)' : 'HOLES 10–18 (IN)' }}
                    </p>
                  </div>

                  <div v-if="selectedScorecard.parsedHoles.length > 9" class="flex border border-zinc-800 rounded-sm overflow-hidden font-mono">
                    <button
                      type="button"
                      @click="holePage = 1"
                      class="px-2.5 py-1 text-[10px] uppercase transition-colors cursor-pointer"
                      :class="holePage === 1 ? 'bg-[#F6821F] text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
                    >
                      Out (1–9)
                    </button>
                    <button
                      type="button"
                      @click="holePage = 2"
                      class="px-2.5 py-1 text-[10px] uppercase border-l border-zinc-800 transition-colors cursor-pointer"
                      :class="holePage === 2 ? 'bg-[#F6821F] text-zinc-950 font-bold' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'"
                    >
                      In (10–18)
                    </button>
                  </div>
                </div>

                <!-- 3-Column Hole Matrix -->
                <div class="grid grid-cols-3 gap-2 font-mono">
                  <div
                    v-for="(strokes, idx) in displayedHoles"
                    :key="idx"
                    class="p-2.5 bg-zinc-900/50 border border-zinc-800 rounded-sm flex flex-col justify-between space-y-1.5"
                  >
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="font-bold text-zinc-300">
                        H{{ String((holePage === 1 ? 0 : 9) + idx + 1).padStart(2, '0') }}
                      </span>
                      <span class="text-zinc-500 text-[9px]">P4</span>
                    </div>

                    <div class="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                      <span
                        class="text-[9px] uppercase px-1 py-0.5 rounded-sm"
                        :class="!strokes
                          ? 'text-zinc-600'
                          : strokes <= 3
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : strokes === 4
                              ? 'bg-zinc-800 text-zinc-300'
                              : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'"
                      >
                        {{ strokes ? (strokes <= 3 ? 'Birdie' : strokes === 4 ? 'Par' : 'Bogey+') : '—' }}
                      </span>
                      <span class="text-sm font-bold text-zinc-100">
                        {{ strokes ?? '-' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fixed Footer -->
            <div class="p-3 bg-zinc-900/60 border-t border-zinc-800 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <UButton
                @click="showDetailModal = false"
                variant="outline"
                block
                size="sm"
                class="rounded-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-mono text-xs uppercase cursor-pointer"
              >
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
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>