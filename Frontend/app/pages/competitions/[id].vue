<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const route = useRoute()
const compId = route.params.id as string

// Fetch competition data & refresh handler
const { data: compRes, refresh: refreshCompetition } = await useFetch(`/api/competitions/${compId}`)
const competition = computed(() => compRes.value?.data || compRes.value?.competition || null)

// Fetch current user details to check admin status
const { data: userRes } = await useFetch('/api/auth/me', { ignoreResponseError: true })
const currentUser = computed(() => userRes.value?.data || null)
const isAdmin = computed(() => currentUser.value?.role === 'ADMIN')

// Fetch lobby participants
const { data: lobbyRes, refresh: refreshLobby } = await useFetch(`/api/competitions/${compId}/lobby`)
const lobbyPlayers = computed(() => lobbyRes.value?.data || [])

const isJoined = computed(() => {
  return lobbyPlayers.value.some((p: any) => p.id === currentUser.value?.id)
})

// Fetch Live Leaderboard
const { data: leaderboardRes, refresh: refreshLeaderboard } = await useFetch(`/api/competitions/${compId}/leaderboard`)
const liveLeaderboard = computed(() => leaderboardRes.value?.data?.leaderboard || [])

// Check if scores are released to the public/members
const isLeaderboardReleased = computed(() => {
  return competition.value?.scoresReleased === 1 || competition.value?.scoresReleased === true || competition.value?.status === 'CLOSED'
})

// Check if all submitted scorecards have completed 18 holes
const allScorecardsFinished = computed(() => {
  if (liveLeaderboard.value.length === 0) return false
  return liveLeaderboard.value.every((p: any) => Number(p.holesCompleted) === 18)
})

// PDF Download Button visibility
const showDownloadPdfBtn = computed(() => {
  const isFinished = competition.value?.status === 'CLOSED' || allScorecardsFinished.value
  return isAdmin.value && isFinished
})

// Download PDF Handler
const downloading = ref(false)
const downloadPdfReport = async () => {
  downloading.value = true
  try {
    const res = await fetch(`/api/competitions/${compId}/report`, {
      method: 'GET',
      credentials: 'include'
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(errorText || 'Failed to generate PDF report')
    }

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${competition.value?.name || 'Competition'}_Report.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err: any) {
    console.error('PDF download error:', err)
    alert(err?.message || 'Failed to download official PDF report.')
  } finally {
    downloading.value = false
  }
}

// Setup immediate refresh on mount + 8s polling interval
let pollTimer: any = null
onMounted(async () => {
  await refreshLeaderboard()
  await refreshLobby()

  pollTimer = setInterval(() => {
    refreshLeaderboard()
  }, 8000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

// Exact Timestamp Check: Is current time past the scheduled competition date/time?
const isLiveToday = computed(() => {
  if (!competition.value?.date) return false
  const now = new Date().getTime()
  const compTime = new Date(competition.value.date).getTime()
  return now >= compTime
})

const isClosed = computed(() => competition.value?.status === 'CLOSED')

// Join Lobby Handler
const joining = ref(false)
const handleJoinLobby = async () => {
  if (!currentUser.value) return navigateTo('/login')
  joining.value = true
  try {
    await $fetch(`/api/competitions/${compId}/join`, {
      method: 'POST',
      body: { playerId: currentUser.value.id }
    })
    await refreshLobby()
    await refreshLeaderboard()
  } catch (err: any) {
    alert(err?.statusMessage || 'Failed to join lobby')
  } finally {
    joining.value = false
  }
}

// Player Scorecard Detail Modal State
const selectedScorecard = ref<any>(null)
const showDetailModal = ref(false)

const viewPlayerCard = (entry: any) => {
  let parsedHoles: number[] = []
  try {
    parsedHoles = typeof entry.holeScores === 'string' ? JSON.parse(entry.holeScores) : entry.holeScores || []
  } catch (err) {
    parsedHoles = []
  }

  selectedScorecard.value = {
    ...entry,
    parsedHoles
  }
  showDetailModal.value = true
}

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

// Admin Status Update Handlers
const updatingStatus = ref(false)
const updateCompetitionStatus = async (newStatus: 'ACTIVE' | 'CLOSED' | 'OPEN') => {
  if (!competition.value?.id) return

  updatingStatus.value = true
  try {
    const res: any = await $fetch(`/api/competitions/${competition.value.id}`, {
      method: 'PUT',
      body: { status: newStatus }
    })

    if (res?.success !== false) {
      await refreshCompetition()
    } else {
      alert(res?.statusMessage || 'Failed to update competition status.')
    }
  } catch (err: any) {
    console.error('Failed to update status:', err)
    alert(err?.data?.statusMessage || err?.statusMessage || 'Failed to update competition status.')
  } finally {
    updatingStatus.value = false
  }
}

// Release Scores Handler
const releasingScores = ref(false)
const handleReleaseScores = async () => {
  if (!competition.value?.id) return
  releasingScores.value = true
  try {
    const res: any = await $fetch(`/api/competitions/${competition.value.id}`, {
      method: 'PUT',
      body: { scoresReleased: 1, status: 'CLOSED' }
    })
    if (res?.success !== false) {
      await refreshCompetition()
      await refreshLeaderboard()
    }
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Failed to release scores.')
  } finally {
    releasingScores.value = false
  }
}
</script>

<template>
  <UContainer class="py-12 max-w-4xl mx-auto space-y-8">
    
    <!-- Navigation Back Link -->
    <div>
      <NuxtLink to="/competitions" class="text-xs font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors">
        ← Back to Competitions
      </NuxtLink>
    </div>

    <!-- ADMIN PDF REPORT BANNER -->
    <div 
      v-if="showDownloadPdfBtn" 
      class="relative bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-900 border border-amber-500/30 p-6 rounded-3xl backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-5 overflow-hidden"
    >
      <div class="pointer-events-none absolute -right-10 -bottom-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
      
      <div class="flex items-center gap-4 text-center sm:text-left relative z-10">
        <div class="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
          <UIcon name="i-heroicons-document-arrow-down" class="w-6 h-6" />
        </div>
        <div class="space-y-0.5">
          <span class="text-base font-extrabold text-white block">Official Tournament Results Ready!</span>
          <p class="text-xs text-slate-300">All participants have completed 18 holes. Export the official PDF summary with prize distributions.</p>
        </div>
      </div>

      <UButton 
        @click="downloadPdfReport" 
        color="warning" 
        size="lg" 
        icon="i-heroicons-arrow-down-tray"
        :loading="downloading"
        class="font-bold whitespace-nowrap cursor-pointer shadow-xl shadow-amber-500/20 shrink-0 relative z-10"
      >
        Download PDF Report
      </UButton>
    </div>

    <!-- ADMIN CONTROLS PANEL -->
    <div v-if="isAdmin" class="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-4 backdrop-blur-2xl relative overflow-hidden">
      <div class="pointer-events-none absolute -left-10 -top-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>

      <div class="flex items-center gap-3 text-xs font-bold text-slate-300 relative z-10">
        <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
          <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
        </div>
        <span>ADMIN FIXTURE CONTROLS</span>
      </div>

      <div class="flex items-center gap-2.5 relative z-10 flex-wrap">
        <UButton 
          v-if="competition?.status !== 'ACTIVE'"
          @click="updateCompetitionStatus('ACTIVE')"
          color="success"
          size="sm"
          :loading="updatingStatus"
          class="font-bold cursor-pointer shadow-md shadow-emerald-500/20"
        >
          ⚡ Start Competition Early
        </UButton>

        <!-- RELEASE SCORES BUTTON -->
        <UButton 
          v-if="!isLeaderboardReleased"
          @click="handleReleaseScores"
          color="warning"
          size="sm"
          :loading="releasingScores"
          class="font-bold cursor-pointer shadow-md shadow-amber-500/20"
        >
          🔓 Release Scores & Finalize
        </UButton>

        <UButton 
          v-if="competition?.status !== 'CLOSED'"
          @click="updateCompetitionStatus('CLOSED')"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="updatingStatus"
          class="font-bold cursor-pointer text-slate-300 hover:text-white"
        >
          🔒 Close Competition
        </UButton>
      </div>
    </div>

    <!-- MAIN COMPETITION HERO & LOBBY CARD -->
    <div v-if="competition" class="relative bg-slate-900/90 border border-slate-800/90 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl space-y-8 overflow-hidden">
      
      <!-- Ambient Glows -->
      <div class="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>

      <!-- Header & Status Badge -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative z-10">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight">{{ competition.name }}</h1>
            <UBadge 
              :color="isClosed ? 'neutral' : isLiveToday ? 'success' : 'warning'" 
              variant="subtle" 
              size="md"
              class="font-bold uppercase tracking-wider px-3 py-1"
            >
              {{ isClosed ? '🔒 Finalized' : isLiveToday ? '🏆 Live Competition Day' : '⏳ Lobby Open (Upcoming)' }}
            </UBadge>
          </div>
          <p class="text-xs sm:text-sm text-slate-400 flex items-center gap-2">
            <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Scheduled for {{ formatUKDate(competition.date) }} at <strong class="text-white">{{ competition.venue }}</strong></span>
          </p>
        </div>
      </div>

      <!-- PRIZE POOL BANNER -->
      <div 
        v-if="competition.prize1st || competition.prize2nd || competition.prize3rd" 
        class="bg-slate-950/90 border border-amber-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-inner relative z-10"
      >
        <div class="flex items-center gap-2.5 text-amber-400 font-black text-xs uppercase tracking-wider">
          <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <UIcon name="i-heroicons-trophy" class="w-4 h-4" />
          </div>
          <span>TOTAL PRIZE POOL: £{{ (Number(competition.prize1st || 0) + Number(competition.prize2nd || 0) + Number(competition.prize3rd || 0)) }}</span>
        </div>

        <div class="flex items-center gap-2 text-xs font-bold flex-wrap">
          <span v-if="competition.prize1st" class="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl flex items-center gap-1.5 shadow-sm">
            🥇 1st: £{{ competition.prize1st }}
          </span>
          <span v-if="competition.prize2nd" class="px-3 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-300 rounded-xl flex items-center gap-1.5 shadow-sm">
            🥈 2nd: £{{ competition.prize2nd }}
          </span>
          <span v-if="competition.prize3rd" class="px-3 py-1.5 bg-amber-900/20 border border-amber-800/40 text-amber-500 rounded-xl flex items-center gap-1.5 shadow-sm">
            🥉 3rd: £{{ competition.prize3rd }}
          </span>
        </div>
      </div>

      <!-- Action Banners -->
      <div v-if="isClosed" class="bg-slate-950/90 border border-slate-800 p-6 rounded-2xl text-center space-y-1.5 relative z-10 shadow-inner">
        <span class="text-sm font-bold text-slate-200 block">Competition Closed</span>
        <p class="text-xs text-slate-400">Official scoring is closed for this event. Final podium standings are displayed below.</p>
      </div>

      <div v-else-if="!isLiveToday" class="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10 shadow-xl">
        <div class="space-y-1 text-center sm:text-left">
          <span class="text-sm font-extrabold text-amber-300 block">Competition Lobby Active</span>
          <p class="text-xs text-slate-300">Scorecards unlock on competition day. Join the lobby below to confirm your tournament entry!</p>
        </div>

        <UButton 
          v-if="!isJoined" 
          @click="handleJoinLobby" 
          color="warning" 
          size="lg" 
          :loading="joining"
          class="font-bold whitespace-nowrap cursor-pointer shadow-lg shadow-amber-500/20 shrink-0"
        >
          Join Competition Lobby
        </UButton>
        <UBadge v-else color="success" variant="solid" size="lg" class="font-bold px-4 py-2">
          ✓ You're in the Lobby
        </UBadge>
      </div>

      <div v-else class="bg-emerald-500/15 border border-emerald-500/30 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10 shadow-xl">
        <div class="space-y-1 text-center sm:text-left">
          <span class="text-sm font-extrabold text-emerald-300 block">Event is Live Today!</span>
          <p class="text-xs text-slate-300">Scorecard submission is open. Enter your 18-hole scores to update live leaderboard standings.</p>
        </div>

        <UButton 
          :to="`/scorecard?competitionId=${competition.id}`" 
          color="success" 
          size="lg" 
          icon="i-heroicons-pencil-square"
          class="font-bold shadow-lg shadow-emerald-500/25 cursor-pointer shrink-0"
        >
          Start Official Scorecard
        </UButton>
      </div>

      <!-- LIVE LEADERBOARD SECTION (GATED BY ADMIN RELEASE OR ADMIN ROLE) -->
      <div class="space-y-4 pt-4 border-t border-slate-800/80 relative z-10">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <UIcon name="i-heroicons-trophy" class="w-4 h-4" />
            </div>
            <span>Leaderboard Standings ({{ liveLeaderboard.length }})</span>
          </h3>
          <span v-if="isLeaderboardReleased" class="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            Scores Released
          </span>
          <span v-else class="text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
            Scores Hidden (Admin Only)
          </span>
        </div>

        <!-- NOT RELEASED MESSAGE FOR NON-ADMINS -->
        <div v-if="!isLeaderboardReleased && !isAdmin" class="p-12 text-center bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <UIcon name="i-heroicons-lock-closed" class="w-6 h-6" />
          </div>
          <h4 class="text-sm font-bold text-white">Leaderboard Hidden</h4>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">
            Scores are currently kept confidential and can only be viewed by administrators. The admin will release all scores once the competition concludes.
          </p>
        </div>

        <!-- VISIBLE LEADERBOARD (FOR ADMINS OR WHEN RELEASED) -->
        <template v-else>
          <div v-if="liveLeaderboard.length === 0" class="p-10 text-center bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2">
            <UIcon name="i-heroicons-document-minus" class="w-8 h-8 text-slate-600 mx-auto" />
            <p class="text-xs text-slate-400">No scorecards submitted for this competition yet.</p>
          </div>

          <div v-else class="space-y-3">
            <div 
              v-for="entry in liveLeaderboard" 
              :key="entry.scorecardId"
              @click="viewPlayerCard(entry)"
              class="flex items-center justify-between p-4 bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl transition-all cursor-pointer group shadow-sm hover:shadow-md"
            >
              <div class="flex items-center gap-3.5">
                <!-- Podium Rank Badge -->
                <div 
                  :class="entry.rank === 1 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-500/20 shadow-md' : entry.rank === 2 ? 'bg-slate-300/15 text-slate-200 border-slate-300/30' : entry.rank === 3 ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-slate-900 text-slate-400 border-slate-800'"
                  class="w-9 h-9 rounded-xl border font-black text-xs flex items-center justify-center shrink-0"
                >
                  #{{ entry.rank }}
                </div>

                <div>
                  <span class="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors block">
                    {{ entry.playerName }}
                  </span>
                  <span class="text-[10px] text-slate-400 font-medium">
                    HCP Index: {{ entry.handicapIndex }}
                  </span>
                </div>
              </div>

              <div class="text-right flex items-center gap-4">
                <div>
                  <span class="text-base font-black text-emerald-400 block">
                    {{ entry.stablefordPoints }} <span class="text-xs font-bold text-emerald-500">pts</span>
                  </span>
                  <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {{ entry.holesCompleted === 18 ? 'Finished 18' : `Thru ${entry.holesCompleted}` }}
                  </span>
                </div>
                <div class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all">
                  <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- REGISTERED LOBBY PARTICIPANTS SECTION -->
      <div class="space-y-4 pt-6 border-t border-slate-800/80 relative z-10">
        <h3 class="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
          </div>
          <span>Registered Lobby Participants ({{ lobbyPlayers.length }})</span>
        </h3>

        <div v-if="lobbyPlayers.length === 0" class="p-8 text-center bg-slate-950/80 border border-slate-800/80 rounded-2xl text-xs text-slate-400">
          No players have joined the lobby yet. Be the first to join!
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div 
            v-for="p in lobbyPlayers" 
            :key="p.id" 
            class="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between shadow-inner"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                {{ p.name.charAt(0).toUpperCase() }}
              </div>
              <div class="leading-tight">
                <span class="text-xs font-bold text-white block">{{ p.name }}</span>
                <span class="text-[10px] text-slate-400 mt-0.5 block">HCP Index: {{ p.handicapIndex }}</span>
              </div>
            </div>
            <UBadge color="success" variant="subtle" size="xs">Confirmed</UBadge>
          </div>
        </div>
      </div>

    </div>

    <!-- PLAYER SCORECARD BREAKDOWN MODAL -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetailModal && selectedScorecard" class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[85vh] flex flex-col">
            
            <!-- Modal Header -->
            <div class="flex items-start justify-between border-b border-slate-800 pb-4 shrink-0">
              <div>
                <h2 class="text-base sm:text-lg font-black text-white">{{ selectedScorecard.playerName }}'s Scorecard</h2>
                <p class="text-xs text-slate-400">Stableford Points: <strong class="text-emerald-400">{{ selectedScorecard.stablefordPoints }} pts</strong></p>
              </div>
              <button @click="showDetailModal = false" class="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer">✕</button>
            </div>

            <!-- Scorecard Grid -->
            <div class="space-y-3 overflow-y-auto flex-1 pr-1">
              <span class="text-xs font-bold uppercase tracking-wider text-emerald-400 block">Hole-by-Hole Breakdown</span>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div 
                  v-for="(strokes, idx) in selectedScorecard.parsedHoles" 
                  :key="idx" 
                  class="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs shadow-sm"
                >
                  <span class="font-bold text-slate-400">Hole {{ idx + 1 }}</span>
                  <span class="font-black text-white bg-slate-900 border border-slate-800 px-3 py-0.5 rounded-xl shadow-inner">
                    {{ strokes ?? '-' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Modal Footer -->
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