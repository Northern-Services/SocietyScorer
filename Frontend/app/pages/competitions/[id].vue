<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { isAdminRole } from '@/utils/roles'

const route = useRoute()
const compId = route.params.id as string

const { data: compRes, refresh: refreshCompetition } = await useFetch(`/api/competitions/${compId}`)
const competition = computed(() => compRes.value?.data || compRes.value?.competition || null)

const { data: userRes } = await useFetch('/api/auth/me', { ignoreResponseError: true })
const currentUser = computed(() => userRes.value?.data || null)
const isAdmin = computed(() => isAdminRole(currentUser.value?.role))

const { data: lobbyRes, refresh: refreshLobby } = await useFetch(`/api/competitions/${compId}/lobby`)
const lobbyPlayers = computed(() => lobbyRes.value?.data || [])

const isJoined = computed(() => {
  return lobbyPlayers.value.some((p: any) => p.id === currentUser.value?.id)
})

const { data: leaderboardRes, refresh: refreshLeaderboard } = await useFetch(`/api/competitions/${compId}/leaderboard`)
const liveLeaderboard = computed(() => leaderboardRes.value?.data?.leaderboard || [])

const { data: twosRes, refresh: refreshTwos } = await useFetch(`/api/competitions/${compId}/twos`)
const twosEntries = computed(() => twosRes.value?.data || [])

const twosPot = computed(() => Number(competition.value?.potAmount || 0))
const twosSplit = computed(() => {
  const pot = twosPot.value
  const count = twosEntries.value.length
  return count > 0 ? (pot / count).toFixed(2) : '0.00'
})

// Weather
const weather = ref<any>(null)
const weatherLoading = ref(false)
const fetchWeather = async () => {
  if (!competition.value?.courseId) return
  try {
    const courseRes: any = await $fetch(`/api/courses/${competition.value.courseId}`)
    const course = courseRes?.data
    if (course?.latitude && course?.longitude) {
      weatherLoading.value = true
      const weatherRes: any = await $fetch('/api/weather', { query: { latitude: course.latitude, longitude: course.longitude } })
      weather.value = weatherRes?.data || null
    }
  } catch (e) {
    console.error('Weather fetch failed', e)
  } finally {
    weatherLoading.value = false
  }
}

const isLeaderboardReleased = computed(() => {
  return competition.value?.scoresReleased === 1 || competition.value?.scoresReleased === true || competition.value?.status === 'CLOSED'
})

const allScorecardsFinished = computed(() => {
  if (liveLeaderboard.value.length === 0) return false
  return liveLeaderboard.value.every((p: any) => Number(p.holesCompleted) === 18)
})

const showDownloadPdfBtn = computed(() => {
  const isFinished = competition.value?.status === 'CLOSED' || allScorecardsFinished.value
  return isAdmin.value && isFinished
})

const downloading = ref(false)
const downloadPdfReport = async () => {
  downloading.value = true
  try {
    const res = await fetch(`/api/competitions/${compId}/report`, { method: 'GET', credentials: 'include' })
    if (!res.ok) throw new Error(await res.text() || 'Failed to generate PDF report')
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
    alert(err?.message || 'Failed to download official PDF report.')
  } finally {
    downloading.value = false
  }
}

let pollTimer: any = null
onMounted(async () => {
  await refreshLeaderboard()
  await refreshLobby()
  await refreshTwos()
  await fetchWeather()
  pollTimer = setInterval(() => {
    refreshLeaderboard()
    refreshTwos()
  }, 8000)
})
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

const isLiveToday = computed(() => {
  if (!competition.value?.date) return false
  return new Date().getTime() >= new Date(competition.value.date).getTime()
})

const isClosed = computed(() => competition.value?.status === 'CLOSED')

const joining = ref(false)
const handleJoinLobby = async () => {
  if (!currentUser.value) return navigateTo('/login')
  joining.value = true
  try {
    await $fetch(`/api/competitions/${compId}/join`, { method: 'POST', body: { playerId: currentUser.value.id } })
    await refreshLobby()
    await refreshLeaderboard()
  } catch (err: any) {
    alert(err?.statusMessage || 'Failed to join lobby')
  } finally {
    joining.value = false
  }
}

const selectedScorecard = ref<any>(null)
const showDetailModal = ref(false)

const viewPlayerCard = (entry: any) => {
  let parsedHoles: number[] = []
  try {
    parsedHoles = typeof entry.holeScores === 'string' ? JSON.parse(entry.holeScores) : entry.holeScores || []
  } catch { parsedHoles = [] }
  selectedScorecard.value = { ...entry, parsedHoles }
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

const updatingStatus = ref(false)
const updateCompetitionStatus = async (newStatus: 'ACTIVE' | 'CLOSED' | 'OPEN') => {
  if (!competition.value?.id) return
  updatingStatus.value = true
  try {
    await $fetch(`/api/competitions/${competition.value.id}`, { method: 'PUT', body: { status: newStatus } })
    await refreshCompetition()
  } catch (err: any) {
    alert(err?.data?.statusMessage || err?.statusMessage || 'Failed to update competition status.')
  } finally {
    updatingStatus.value = false
  }
}

const releasingScores = ref(false)
const handleReleaseScores = async () => {
  if (!competition.value?.id) return
  releasingScores.value = true
  try {
    await $fetch(`/api/competitions/${competition.value.id}`, { method: 'PUT', body: { scoresReleased: 1, status: 'CLOSED' } })
    await refreshCompetition()
    await refreshLeaderboard()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Failed to release scores.')
  } finally {
    releasingScores.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Back Link -->
    <NuxtLink to="/competitions" class="text-xs font-mono text-zinc-400 hover:text-orange-400 flex items-center gap-1.5 transition-colors">
      <span>← BACK TO DIRECTORY</span>
    </NuxtLink>

    <!-- Admin PDF Banner -->
    <div v-if="showDownloadPdfBtn" class="border border-amber-500/30 bg-amber-500/10 p-4 rounded-sm shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-sm bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
          <UIcon name="i-heroicons-document-arrow-down" class="w-4 h-4" />
        </div>
        <div>
          <span class="text-xs font-bold text-amber-300 uppercase tracking-wider block">OFFICIAL RESULTS READY</span>
          <p class="text-[11px] text-zinc-400 font-sans mt-0.5">All participants completed 18 holes. Export the certified PDF report.</p>
        </div>
      </div>
      <UButton @click="downloadPdfReport" size="xs" :loading="downloading" class="rounded-sm bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold uppercase tracking-wider shrink-0 cursor-pointer">
        DOWNLOAD PDF REPORT
      </UButton>
    </div>

    <!-- Admin Controls Console -->
    <div v-if="isAdmin" class="border border-zinc-800 bg-zinc-950 p-3.5 rounded-sm shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
      <div class="flex items-center gap-2 text-xs font-bold text-zinc-200">
        <div class="w-6 h-6 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 flex items-center justify-center shrink-0">
          <UIcon name="i-heroicons-shield-check" class="w-3.5 h-3.5" />
        </div>
        <span>ADMIN_CONTROLS</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button v-if="competition?.status !== 'ACTIVE'" @click="updateCompetitionStatus('ACTIVE')" class="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold uppercase rounded-sm transition-colors cursor-pointer">
          START_COMPETITION
        </button>
        <button v-if="!isLeaderboardReleased" @click="handleReleaseScores" class="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 text-[10px] font-bold uppercase rounded-sm transition-colors cursor-pointer">
          RELEASE_SCORES
        </button>
        <button v-if="competition?.status !== 'CLOSED'" @click="updateCompetitionStatus('CLOSED')" class="px-2.5 py-1 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold uppercase rounded-sm transition-colors cursor-pointer">
          CLOSE_COMPETITION
        </button>
      </div>
    </div>

    <!-- Competition Hero Console -->
    <section v-if="competition" class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl space-y-6">
      <!-- Status Top Bar -->
      <div class="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] font-mono">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          <span class="text-zinc-200 font-bold uppercase tracking-wider">TOURNAMENT_LOBBY</span>
        </div>
        <span
          class="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border"
          :class="isClosed ? 'bg-zinc-900 text-zinc-400 border-zinc-700' : isLiveToday ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'"
        >
          {{ isClosed ? 'LOCKED // FINALIZED' : isLiveToday ? '● LIVE TODAY' : 'LOBBY OPEN' }}
        </span>
      </div>

      <div class="p-4 sm:p-6 space-y-6">
        <div class="space-y-1.5 font-sans">
          <div class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">// EVENT INFRASTRUCTURE</div>
          <h1 class="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">{{ competition.name }}</h1>
          <p class="text-xs text-zinc-400 font-mono flex items-center gap-2 pt-1">
            <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-orange-400 shrink-0" />
            <span>{{ formatUKDate(competition.date) }} @ <strong class="text-zinc-200">{{ competition.venue }}</strong></span>
          </p>
        </div>

        <!-- Telemetry Matrix: Prize Pool & 2's Club -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
          <div v-if="competition.prize1st || competition.prize2nd || competition.prize3rd" class="border border-zinc-800 bg-zinc-900/40 p-3.5 rounded-sm space-y-1">
            <div class="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 text-amber-400" />
              <span>Prize Pool</span>
            </div>
            <div class="text-lg font-bold text-amber-400">
              £{{ (Number(competition.prize1st || 0) + Number(competition.prize2nd || 0) + Number(competition.prize3rd || 0)) }}
            </div>
          </div>

          <div v-if="competition.potAmount" class="border border-zinc-800 bg-zinc-900/40 p-3.5 rounded-sm space-y-1">
            <div class="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <UIcon name="i-lucide-flag" class="w-3.5 h-3.5 text-orange-400" />
              <span>2's Club Pot (£{{ twosPot }})</span>
            </div>
            <div class="text-xs text-zinc-300">
              <span class="font-bold text-orange-400">{{ twosEntries.length }} Entrants</span>
              <span v-if="twosEntries.length > 0" class="text-zinc-500"> (£{{ twosSplit }} split)</span>
            </div>
          </div>
        </div>

        <!-- Weather Telemetry Strip -->
        <div v-if="weather" class="border border-zinc-800 bg-zinc-900/40 p-3.5 rounded-sm font-mono text-xs space-y-1">
          <div class="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <UIcon name="i-heroicons-cloud" class="w-3.5 h-3.5 text-sky-400" />
            <span>Course Weather Telemetry</span>
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-300 pt-0.5">
            <span class="font-bold text-zinc-100">{{ weather.temperature }}°C</span>
            <span class="text-zinc-400">{{ weather.description }}</span>
            <span class="text-zinc-500">High {{ weather.maxTemp }}° / Low {{ weather.minTemp }}°</span>
            <span v-if="weather.precipProbability > 0" class="text-sky-400">RAIN {{ weather.precipProbability }}%</span>
            <span class="text-zinc-500">WIND {{ weather.windspeed }} km/h</span>
          </div>
        </div>

        <!-- Action Banners -->
        <div v-if="isClosed" class="border border-zinc-800 bg-zinc-900/50 p-4 rounded-sm text-center font-mono space-y-1">
          <span class="text-xs font-bold text-zinc-200 uppercase">COMPETITION_FINALIZED</span>
          <p class="text-[11px] text-zinc-500 font-sans">Official scoring is closed. Final standings are locked.</p>
        </div>

        <div v-else-if="!isLiveToday" class="border border-orange-500/30 bg-orange-500/10 p-4 rounded-sm space-y-3 font-mono">
          <div class="space-y-1 text-center sm:text-left font-sans">
            <span class="text-xs font-bold text-orange-400 uppercase tracking-wider block">Lobby Open</span>
            <p class="text-xs text-zinc-300">Scorecard submission unlocks on event day. Secure your spot in the lobby.</p>
          </div>
          <UButton v-if="!isJoined" @click="handleJoinLobby" size="sm" :loading="joining" block class="rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold uppercase tracking-wider cursor-pointer">
            JOIN COMPETITION LOBBY
          </UButton>
          <div v-else class="text-center py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-sm">
            ✓ CONFIRMED LOBBY PARTICIPANT
          </div>
        </div>

        <div v-else class="border border-emerald-500/30 bg-emerald-500/10 p-4 rounded-sm space-y-3 font-mono">
          <div class="space-y-1 text-center sm:text-left font-sans">
            <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider block">Tournament Live Today</span>
            <p class="text-xs text-zinc-300">Match play is active. Initialize your live 18-hole digital scorecard.</p>
          </div>
          <UButton :to="`/scorecard?competitionId=${competition.id}`" size="sm" block icon="i-heroicons-pencil-square" class="rounded-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider cursor-pointer">
            START OFFICIAL SCORECARD
          </UButton>
        </div>

        <!-- Leaderboard Section -->
        <div class="space-y-3 pt-4 border-t border-zinc-800 font-mono">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-orange-400" />
              <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-200">Live Leaderboard ({{ liveLeaderboard.length }})</h3>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-sm border uppercase" :class="isLeaderboardReleased ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'">
              {{ isLeaderboardReleased ? 'SCORES_RELEASED' : 'SCORES_HIDDEN' }}
            </span>
          </div>

          <div v-if="!isLeaderboardReleased && !isAdmin" class="border border-zinc-800 bg-zinc-900/40 p-6 rounded-sm text-center space-y-2">
            <UIcon name="i-heroicons-lock-closed" class="w-5 h-5 text-orange-400 mx-auto" />
            <div class="text-xs font-bold text-zinc-200 uppercase">Leaderboard Confidential</div>
            <p class="text-xs text-zinc-500 font-sans">Standings are hidden until released by society administration.</p>
          </div>

          <template v-else>
            <div v-if="liveLeaderboard.length === 0" class="border border-zinc-800 bg-zinc-900/40 p-6 rounded-sm text-center text-xs text-zinc-500">
              NO_SCORECARDS_SUBMITTED_YET
            </div>

            <div v-else class="border border-zinc-800 divide-y divide-zinc-800 bg-zinc-900/20 rounded-sm overflow-hidden">
              <div
                v-for="entry in liveLeaderboard"
                :key="entry.scorecardId"
                @click="viewPlayerCard(entry)"
                class="p-3 flex items-center justify-between hover:bg-zinc-900/60 transition-colors cursor-pointer group"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div
                    class="w-6 h-6 rounded-sm border font-bold text-[10px] flex items-center justify-center shrink-0"
                    :class="entry.rank === 1 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : entry.rank === 2 ? 'bg-zinc-300/20 text-zinc-200 border-zinc-400/30' : entry.rank === 3 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-zinc-900 text-zinc-500 border-zinc-800'"
                  >
                    #{{ entry.rank }}
                  </div>
                  <div class="min-w-0 font-sans">
                    <span class="text-xs font-bold text-zinc-100 group-hover:text-orange-400 transition-colors block truncate">{{ entry.playerName }}</span>
                    <span class="text-[10px] font-mono text-zinc-500 block truncate">HCP Index: {{ entry.handicapIndex }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <div class="text-right">
                    <span class="text-sm font-bold text-orange-400 block leading-none">{{ entry.stablefordPoints }}</span>
                    <span class="text-[9px] uppercase text-zinc-500 block mt-0.5">PTS</span>
                  </div>
                  <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors" />
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Lobby Participants Section -->
        <div class="space-y-3 pt-4 border-t border-zinc-800 font-mono">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user-group" class="w-4 h-4 text-orange-400" />
            <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-200">Registered Lobby Roster ({{ lobbyPlayers.length }})</h3>
          </div>

          <div v-if="lobbyPlayers.length === 0" class="border border-zinc-800 bg-zinc-900/40 p-4 rounded-sm text-center text-xs text-zinc-500">
            NO_PLAYERS_REGISTERED_YET
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div v-for="p in lobbyPlayers" :key="p.id" class="border border-zinc-800 bg-zinc-900/30 p-2.5 rounded-sm flex items-center justify-between">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-6 h-6 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {{ p.name.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 font-sans">
                  <span class="text-xs font-semibold text-zinc-100 block truncate">{{ p.name }}</span>
                  <span class="text-[10px] font-mono text-zinc-500 block">HCP {{ p.handicapIndex }}</span>
                </div>
              </div>
              <span class="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-sm shrink-0">
                CONFIRMED
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Player Scorecard Breakdown Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetailModal && selectedScorecard" class="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm" @click.self="showDetailModal = false">
          <div class="border border-zinc-800 bg-zinc-950 w-full sm:max-w-md rounded-t-md sm:rounded-sm shadow-2xl font-mono overflow-hidden">
            <div class="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <div class="text-[10px] text-orange-400 uppercase tracking-wider">SCORECARD_TELEMETRY</div>
                <h2 class="text-xs sm:text-sm font-bold text-zinc-100 mt-0.5 font-sans">{{ selectedScorecard.playerName }}</h2>
              </div>
              <button @click="showDetailModal = false" class="w-6 h-6 flex items-center justify-center rounded-sm border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white text-xs cursor-pointer">✕</button>
            </div>

            <div class="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div class="border border-zinc-800 bg-zinc-900/40 p-3 rounded-sm flex items-center justify-between text-xs">
                <span class="text-zinc-400 uppercase">Stableford Total</span>
                <span class="font-bold text-orange-400 text-base">{{ selectedScorecard.stablefordPoints }} PTS</span>
              </div>

              <div class="space-y-1.5">
                <span class="text-[10px] uppercase text-zinc-500 tracking-wider block">Hole-by-Hole Breakdown</span>
                <div class="grid grid-cols-3 gap-1.5">
                  <div v-for="(strokes, idx) in selectedScorecard.parsedHoles" :key="idx" class="p-2 bg-zinc-900/50 border border-zinc-800 rounded-sm flex items-center justify-between text-xs">
                    <span class="text-zinc-500 text-[10px]">H{{ String(Number(idx) + 1).padStart(2, '0') }}</span>
                    <span class="font-bold text-zinc-100">{{ strokes ?? '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="p-3 bg-zinc-900 border-t border-zinc-800">
              <UButton @click="showDetailModal = false" variant="outline" block size="sm" class="rounded-sm border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-mono text-xs uppercase cursor-pointer">
                CLOSE BREAKDOWN
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