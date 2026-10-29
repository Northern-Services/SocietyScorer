<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const route = useRoute()
const compId = route.params.id as string

const { data: compRes, refresh: refreshCompetition } = await useFetch(`/api/competitions/${compId}`)
const competition = computed(() => compRes.value?.data || compRes.value?.competition || null)

const { data: userRes } = await useFetch('/api/auth/me', { ignoreResponseError: true })
const currentUser = computed(() => userRes.value?.data || null)
const isAdmin = computed(() => currentUser.value?.role === 'ADMIN')

const { data: lobbyRes, refresh: refreshLobby } = await useFetch(`/api/competitions/${compId}/lobby`)
const lobbyPlayers = computed(() => lobbyRes.value?.data || [])

const isJoined = computed(() => {
  return lobbyPlayers.value.some((p: any) => p.id === currentUser.value?.id)
})

const { data: leaderboardRes, refresh: refreshLeaderboard } = await useFetch(`/api/competitions/${compId}/leaderboard`)
const liveLeaderboard = computed(() => leaderboardRes.value?.data?.leaderboard || [])

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
  pollTimer = setInterval(() => { refreshLeaderboard() }, 8000)
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
  <div class="px-3 py-4 space-y-4 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Back Link -->
    <NuxtLink to="/competitions" class="text-[11px] font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors">
      ← Back to Competitions
    </NuxtLink>

    <!-- Admin PDF Banner -->
    <div v-if="showDownloadPdfBtn" class="relative bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-900 border border-amber-500/30 p-3 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col items-center justify-between gap-3 overflow-hidden">
      <div class="pointer-events-none absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-[40px]"></div>
      <div class="flex items-center gap-2 text-center relative z-10">
        <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
          <UIcon name="i-heroicons-document-arrow-down" class="w-4 h-4" />
        </div>
        <div class="space-y-0.5">
          <span class="text-sm font-extrabold text-white block">Official Results Ready!</span>
          <p class="text-[10px] text-slate-300">All participants completed 18 holes. Export the PDF summary.</p>
        </div>
      </div>
      <UButton @click="downloadPdfReport" color="warning" size="sm" icon="i-heroicons-arrow-down-tray" :loading="downloading" class="font-bold whitespace-nowrap shadow-xl shadow-amber-500/20">
        Download PDF Report
      </UButton>
    </div>

    <!-- Admin Controls -->
    <div v-if="isAdmin" class="p-3 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-wrap items-center justify-between gap-2 backdrop-blur-2xl">
      <div class="flex items-center gap-2 text-[10px] font-bold text-slate-300 relative z-10">
        <div class="w-6 h-6 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner">
          <UIcon name="i-heroicons-shield-check" class="w-3 h-3" />
        </div>
        <span>Admin Controls</span>
      </div>
      <div class="flex items-center gap-1.5 relative z-10 flex-wrap">
        <UButton v-if="competition?.status !== 'ACTIVE'" @click="updateCompetitionStatus('ACTIVE')" color="success" size="xs" :loading="updatingStatus" class="font-bold shadow-md shadow-emerald-500/20">
          Start Competition
        </UButton>
        <UButton v-if="!isLeaderboardReleased" @click="handleReleaseScores" color="warning" size="xs" :loading="releasingScores" class="font-bold shadow-md shadow-amber-500/20">
          Release Scores
        </UButton>
        <UButton v-if="competition?.status !== 'CLOSED'" @click="updateCompetitionStatus('CLOSED')" color="neutral" variant="soft" size="xs" :loading="updatingStatus" class="font-bold cursor-pointer text-slate-300 hover:text-white">
          Close Competition
        </UButton>
      </div>
    </div>

    <!-- Competition Hero -->
    <div v-if="competition" class="relative bg-slate-900/90 border border-slate-800/90 p-3 rounded-3xl backdrop-blur-2xl shadow-2xl space-y-4 overflow-hidden">
      <div class="pointer-events-none absolute -top-6 -right-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px]"></div>

      <div class="relative z-10 space-y-2">
        <div class="flex items-center gap-2">
          <h1 class="text-lg font-black text-white tracking-tight">{{ competition.name }}</h1>
          <UBadge :color="isClosed ? 'neutral' : isLiveToday ? 'success' : 'warning'" variant="subtle" size="xs" class="font-bold uppercase tracking-wider px-2 py-0.5">
            {{ isClosed ? '🔒 Finalized' : isLiveToday ? '🏆 Live Today' : '⏳ Lobby Open' }}
          </UBadge>
        </div>
        <p class="text-[11px] text-slate-400 flex items-center gap-1">
          <UIcon name="i-heroicons-calendar" class="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Scheduled {{ formatUKDate(competition.date) }} at <strong class="text-white">{{ competition.venue }}</strong></span>
        </p>
      </div>

      <!-- Prize Pool -->
      <div v-if="competition.prize1st || competition.prize2nd || competition.prize3rd" class="bg-slate-950/90 border border-amber-500/30 p-2.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-inner relative z-10">
        <div class="flex items-center gap-1 text-amber-400 font-black text-[10px] uppercase tracking-wider">
          <div class="w-6 h-6 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <UIcon name="i-heroicons-trophy" class="w-3 h-3" />
          </div>
          <span>Prize Pool: £{{ (Number(competition.prize1st || 0) + Number(competition.prize2nd || 0) + Number(competition.prize3rd || 0)) }}</span>
        </div>
      </div>

      <!-- Status / Action Banners -->
      <div v-if="isClosed" class="bg-slate-950/90 border border-slate-800 p-3 rounded-2xl text-center space-y-1 shadow-inner relative z-10">
        <span class="text-sm font-bold text-slate-200 block">Competition Closed</span>
        <p class="text-[11px] text-slate-400">Official scoring is closed. Final standings below.</p>
      </div>

      <div v-else-if="!isLiveToday" class="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex flex-col items-center justify-between gap-2 relative z-10 shadow-xl">
        <div class="space-y-1 text-center">
          <span class="text-sm font-extrabold text-amber-300 block">Competition Lobby Active</span>
          <p class="text-[11px] text-slate-300">Scorecards unlock on competition day. Join the lobby below!</p>
        </div>
        <UButton v-if="!isJoined" @click="handleJoinLobby" color="warning" size="sm" :loading="joining" class="font-bold whitespace-nowrap shadow-lg shadow-amber-500/20 w-full">
          Join Competition Lobby
        </UButton>
        <UBadge v-else color="success" variant="solid" size="sm" class="font-bold px-3 py-1">✓ You're in the Lobby</UBadge>
      </div>

      <div v-else class="bg-emerald-500/15 border border-emerald-500/30 p-3 rounded-2xl flex flex-col items-center justify-between gap-2 relative z-10 shadow-xl">
        <div class="space-y-1 text-center">
          <span class="text-sm font-extrabold text-emerald-300 block">Event is Live Today!</span>
          <p class="text-[11px] text-slate-300">Scorecard submission is open. Enter your 18-hole scores.</p>
        </div>
        <UButton :to="`/scorecard?competitionId=${competition.id}`" color="success" size="sm" icon="i-heroicons-pencil-square" class="font-bold shadow-lg shadow-emerald-500/25 w-full cursor-pointer">
          Start Official Scorecard
        </UButton>
      </div>

      <!-- Leaderboard -->
      <div class="space-y-3 pt-3 border-t border-slate-800/80 relative z-10">
        <div class="flex items-center justify-between">
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <div class="w-6 h-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <UIcon name="i-heroicons-trophy" class="w-3 h-3" />
            </div>
            <span>Leaderboard ({{ liveLeaderboard.length }})</span>
          </h3>
          <span v-if="isLeaderboardReleased" class="text-[9px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">Scores Released</span>
          <span v-else class="text-[9px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">Scores Hidden</span>
        </div>

        <div v-if="!isLeaderboardReleased && !isAdmin" class="p-3 text-center bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2">
          <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
          </div>
          <h4 class="text-sm font-bold text-white">Leaderboard Hidden</h4>
          <p class="text-[11px] text-slate-400 max-w-xs mx-auto">Scores are confidential until the admin releases them.</p>
        </div>

        <template v-else>
          <div v-if="liveLeaderboard.length === 0" class="p-4 text-center bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-1">
            <UIcon name="i-heroicons-document-minus" class="w-6 h-6 text-slate-600 mx-auto" />
            <p class="text-[11px] text-slate-400">No scorecards submitted yet.</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="entry in liveLeaderboard"
              :key="entry.scorecardId"
              @click="viewPlayerCard(entry)"
              class="flex items-center justify-between p-2.5 bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/50 rounded-2xl transition-all cursor-pointer group shadow-sm"
            >
              <div class="flex items-center gap-2">
                <div :class="entry.rank === 1 ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-500/20 shadow-sm' : entry.rank === 2 ? 'bg-slate-300/15 text-slate-200 border-slate-300/30' : entry.rank === 3 ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-slate-900 text-slate-400 border-slate-800'" class="w-6 h-6 rounded-xl border font-black text-[10px] flex items-center justify-center shrink-0">
                  #{{ entry.rank }}
                </div>
                <div class="min-w-0">
                  <span class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors block truncate">{{ entry.playerName }}</span>
                  <span class="text-[10px] text-slate-400 truncate">HCP Index: {{ entry.handicapIndex }}</span>
                </div>
              </div>
              <div class="text-right flex items-center gap-2">
                <div>
                  <span class="text-sm font-black text-emerald-400 block">{{ entry.stablefordPoints }}</span>
                  <span class="text-[9px] uppercase font-bold text-slate-400 block">pts</span>
                </div>
                <div class="w-5 h-5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all">
                  <UIcon name="i-heroicons-chevron-right" class="w-3 h-3" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Lobby Participants -->
      <div class="space-y-3 pt-3 border-t border-slate-800/80 relative z-10">
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <div class="w-6 h-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <UIcon name="i-heroicons-user-group" class="w-3 h-3" />
          </div>
          <span>Registered Players ({{ lobbyPlayers.length }})</span>
        </h3>

        <div v-if="lobbyPlayers.length === 0" class="p-3 text-center bg-slate-950/80 border border-slate-800/80 rounded-2xl text-[11px] text-slate-400">
          No players have joined the lobby yet. Be the first!
        </div>

        <div v-else class="space-y-2">
          <div v-for="p in lobbyPlayers" :key="p.id" class="bg-slate-950/80 border border-slate-800/80 p-2 rounded-2xl flex items-center justify-between shadow-inner">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                {{ p.name.charAt(0).toUpperCase() }}
              </div>
              <div class="leading-tight min-w-0">
                <span class="text-xs font-bold text-white block">{{ p.name }}</span>
                <span class="text-[10px] text-slate-400">HCP Index: {{ p.handicapIndex }}</span>
              </div>
            </div>
            <UBadge color="success" variant="subtle" size="xs">Confirmed</UBadge>
          </div>
        </div>
      </div>
    </div>

    <!-- Player Scorecard Breakdown Modal (bottom sheet) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetailModal && selectedScorecard" class="fixed inset-0 z-[999] flex items-end justify-center p-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-slate-950/90 backdrop-blur-md" @click.self="showDetailModal = false">
          <div class="bg-slate-900 border border-slate-800 w-full rounded-t-3xl p-3 sm:p-4 shadow-2xl flex flex-col max-h-[85vh] relative">
            <div class="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2 sm:hidden"></div>
            <div class="flex items-start justify-between border-b border-slate-800 pb-2 shrink-0">
              <div>
                <h2 class="text-sm font-black text-white">{{ selectedScorecard.playerName }}'s Scorecard</h2>
                <p class="text-[10px] text-slate-400">Stableford Points: <strong class="text-emerald-400">{{ selectedScorecard.stablefordPoints }} pts</strong></p>
              </div>
              <button @click="showDetailModal = false" class="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer">✕</button>
            </div>
            <div class="overflow-y-auto py-2 space-y-2 flex-1 pr-1">
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Hole-by-Hole</span>
              <div class="grid grid-cols-3 gap-1.5">
                <div v-for="(strokes, idx) in selectedScorecard.parsedHoles" :key="idx" class="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-[10px] shadow-sm">
                  <span class="font-bold text-slate-400">Hole {{ idx + 1 }}</span>
                  <span class="font-black text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg shadow-inner">{{ strokes ?? '-' }}</span>
                </div>
              </div>
            </div>
            <div class="pt-2 border-t border-slate-800 shrink-0">
              <UButton @click="showDetailModal = false" color="neutral" variant="ghost" block size="sm" class="font-semibold cursor-pointer text-slate-400">Close Breakdown</UButton>
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