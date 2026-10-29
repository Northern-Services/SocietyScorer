<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { calculatePlayingHandicap, calculateHoleStableford, calculateFullScorecard, calculateEarlybirdsHandicapCut } from '../../server/utils/handicap'

const route = useRoute()
const competitionId = route.query.competitionId as string
const courseIdQuery = route.query.courseId as string

const course = ref<any>(null)
const holeScores = ref<(number | null)[]>([])
const currentHoleIndex = ref(0)
const isReviewing = ref(false)
const loading = ref(true)
const submitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const { data: userRes } = await useFetch('/api/auth/me')
const currentUser = computed(() => userRes.value?.data || null)

const playingHandicap = computed(() => {
  const hcpIndex = currentUser.value?.handicapIndex ?? 18.0
  const penalty = currentUser.value?.nextRoundPenalty ?? 0
  return calculatePlayingHandicap(hcpIndex, penalty)
})

onMounted(async () => {
  try {
    let activeCourseId = courseIdQuery

    if (competitionId && !activeCourseId) {
      const compRes: any = await $fetch(`/api/competitions/${competitionId}`)
      activeCourseId = compRes?.data?.courseId
    }

    if (activeCourseId) {
      const courseRes: any = await $fetch(`/api/courses`)
      const found = courseRes?.courses?.find((c: any) => c.id === activeCourseId)
      if (found) {
        course.value = found
      }
    } else {
      course.value = {
        id: 'default-course',
        name: 'Society Championship Course',
        location: 'Home Course',
        numHoles: 18,
        pars: Array(18).fill(4),
        strokeIndexes: Array.from({ length: 18 }, (_, i) => i + 1)
      }
    }

    const numHoles = course.value?.numHoles || 18

    if (competitionId && currentUser.value?.id) {
      try {
        const existingCardRes: any = await $fetch(`/api/scores/check?competitionId=${competitionId}`)
        if (existingCardRes?.success && existingCardRes?.holeScores) {
          const parsed = typeof existingCardRes.holeScores === 'string'
            ? JSON.parse(existingCardRes.holeScores)
            : existingCardRes.holeScores
          holeScores.value = parsed
        } else {
          holeScores.value = Array(numHoles).fill(null)
        }
      } catch (err) {
        holeScores.value = Array(numHoles).fill(null)
      }
    } else {
      holeScores.value = Array(numHoles).fill(null)
    }
  } catch (err) {
    console.error('Error setting up scorecard course', err)
  } finally {
    loading.value = false
  }
})

const currentHoleNumber = computed(() => currentHoleIndex.value + 1)
const currentPar = computed(() => course.value?.pars[currentHoleIndex.value] || 4)
const currentSI = computed(() => course.value?.strokeIndexes[currentHoleIndex.value] || 1)

const currentScore = computed({
  get: () => holeScores.value[currentHoleIndex.value] ?? currentPar.value,
  set: (val: number | null) => {
    if (val !== null && val >= 1) {
      holeScores.value[currentHoleIndex.value] = val
    }
  }
})

const shotsReceived = computed(() => {
  const hcp = playingHandicap.value
  const si = currentSI.value
  let shots = 0
  if (hcp >= si) shots += 1
  if (hcp >= si + 18) shots += 1
  return shots
})

const holePoints = computed(() => {
  const strokes = holeScores.value[currentHoleIndex.value]
  if (!strokes) return 0
  return calculateHoleStableford(strokes, currentPar.value, currentSI.value, playingHandicap.value).points
})

const nextHole = () => {
  if (holeScores.value[currentHoleIndex.value] === null) {
    holeScores.value[currentHoleIndex.value] = currentPar.value
  }
  if (currentHoleIndex.value < (course.value?.numHoles || 18) - 1) {
    currentHoleIndex.value++
  } else {
    isReviewing.value = true
  }
}

const prevHole = () => {
  if (isReviewing.value) {
    isReviewing.value = false
  } else if (currentHoleIndex.value > 0) {
    currentHoleIndex.value--
  }
}

const setScoreRelativeToPar = (diff: number) => {
  currentScore.value = currentPar.value + diff
}

const fullScorecardData = computed(() => {
  if (!course.value || !course.value.pars || !course.value.strokeIndexes) {
    return { front9Points: 0, back9Points: 0, totalPoints: 0, totalStrokes: 0, holesCompleted: 0, holes: [] }
  }
  const courseHoles = course.value.pars.map((par: number, idx: number) => ({
    holeNumber: idx + 1,
    par,
    si: course.value.strokeIndexes[idx] || (idx + 1)
  }))
  return calculateFullScorecard(holeScores.value, courseHoles, playingHandicap.value)
})

const totalStablefordPoints = computed(() => fullScorecardData.value.totalPoints)
const totalScore = computed(() => fullScorecardData.value.totalStrokes)
const totalPar = computed(() => course.value?.pars.reduce((a: number, b: number) => a + b, 0) || 72)
const scoreDiff = computed(() => totalScore.value - totalPar.value)
const holesPlayed = computed(() => holeScores.value.filter(s => s !== null).length)

const submitScorecard = async () => {
  errorMessage.value = ''
  submitting.value = true
  try {
    const res: any = await $fetch('/api/scores/submit', {
      method: 'POST',
      body: {
        competitionId: competitionId || null,
        courseId: course.value.id || 'custom-course',
        holeScores: holeScores.value,
        stablefordPoints: totalStablefordPoints.value
      }
    })
    if (res?.success) {
      // Calculate new handicap based on the round just played
      const currentHcp = Number(currentUser.value?.handicapIndex || 0)
      const points = totalStablefordPoints.value
      const cut = calculateEarlybirdsHandicapCut(currentHcp, points, 'other')
      const newHandicapIndex = cut.newHandicapIndex

      // Update the player's handicap index on the server
      try {
        if (currentUser.value?.id) {
          await $fetch(`/api/players/${currentUser.value.id}`, {
            method: 'PUT',
            body: {
              handicapIndex: newHandicapIndex,
              nextRoundPenalty: cut.nextRoundPenalty,
              name: currentUser.value.name
            }
          })
        }
      } catch (err) {
        console.error('Failed to update handicap after round:', err)
      }

      successMessage.value = `Round saved! New handicap: ${newHandicapIndex}`
      setTimeout(() => {
        navigateTo('/dashboard')
      }, 1500)
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || 'Failed to submit scorecard.'
  } finally {
    submitting.value = false
  }
}

let liveSyncTimeout: any = null
watch(
  holeScores,
  (newScores) => {
    if (!competitionId) return
    clearTimeout(liveSyncTimeout)
    liveSyncTimeout = setTimeout(async () => {
      try {
        await $fetch('/api/scores/live-sync', {
          method: 'POST',
          body: {
            competitionId,
            courseId: course.value?.id || courseIdQuery,
            holeScores: newScores,
            stablefordPoints: totalStablefordPoints.value
          }
        })
      } catch (err) {
        // Silent failure
      }
    }, 400)
  },
  { deep: true }
)
</script>

<template>
  <div class="px-3 py-4 space-y-4 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-xs text-slate-500">
      <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3"></div>
      <span>Loading scorecard...</span>
    </div>

    <template v-else-if="course">

      <!-- Top Bar: Course + Player + Live Points -->
      <div class="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-2xl backdrop-blur-xl">
        <div class="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-[40px]"></div>

        <div class="relative z-10 flex flex-col gap-3">
          <!-- Course -->
          <div class="flex items-center gap-2.5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-inner">
              <UIcon name="i-heroicons-flag" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <h1 class="truncate text-sm font-black tracking-tight text-white">{{ course.name }}</h1>
              <div class="flex items-center gap-1.5 mt-0.5">
                <UBadge color="neutral" variant="subtle" size="xs" class="font-bold uppercase tracking-wider">
                  {{ course.numHoles }}H
                </UBadge>
                <span class="text-[10px] text-slate-500">• {{ totalPar }} Par</span>
              </div>
              <p class="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                <UIcon name="i-heroicons-map-pin" class="h-3 w-3 text-slate-500" />
                <span class="truncate">{{ course.location }}</span>
              </p>
            </div>
          </div>

          <!-- Player Chip + Live Points -->
          <div class="flex items-center justify-between gap-2 border-t border-slate-800/60 pt-3">
            <div class="flex items-center gap-2 rounded-2xl border border-slate-800/90 bg-slate-950/70 p-1.5 shadow-sm backdrop-blur-md">
              <div class="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 font-black text-[10px] text-emerald-300 shadow-sm uppercase">
                {{ currentUser?.name ? currentUser.name.charAt(0) : 'P' }}
              </div>
              <div class="min-w-0">
                <span class="block truncate text-xs font-bold text-white leading-tight">{{ currentUser?.name || 'Player' }}</span>
                <span class="mt-0.5 block text-[9px] font-semibold tracking-wide text-slate-400">
                  PLAYING HCP: <strong class="font-bold text-emerald-400">{{ playingHandicap }}</strong>
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-1.5 shadow-inner">
              <div class="text-right">
                <span class="block text-sm font-black uppercase tracking-widest text-emerald-400/80">Stableford</span>
                <span class="text-xl font-black tracking-tight text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  {{ totalStablefordPoints }} <span class="text-sm font-bold text-emerald-500/80 block">pts</span>
                </span>
              </div>
              <div class="flex h-2 w-2 relative">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- REVIEW SCORECARD SCREEN -->
      <div v-if="isReviewing" class="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 class="text-sm font-black text-white">Review Scorecard</h2>
          <UBadge color="success" variant="subtle" size="xs">Ready to Submit</UBadge>
        </div>

        <div v-if="successMessage" class="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] rounded-xl font-semibold text-center">
          {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="p-2.5 bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] rounded-xl font-semibold text-center">
          {{ errorMessage }}
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
            <span class="text-[9px] uppercase font-bold text-slate-400 block">Total Strokes</span>
            <span class="text-lg font-black text-white">{{ totalScore }}</span>
          </div>
          <div class="bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
            <span class="text-[9px] uppercase font-bold text-slate-400 block">Vs Par</span>
            <span class="text-lg font-black" :class="scoreDiff > 0 ? 'text-amber-400' : 'text-emerald-400'">
              {{ scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff === 0 ? 'E' : scoreDiff }}
            </span>
          </div>
          <div class="bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
            <span class="text-sm uppercase font-bold text-slate-400 block">Stableford</span>
            <span class="text-xl font-black text-emerald-400">{{ totalStablefordPoints }}</span>
          </div>
        </div>

        <!-- Hole-by-Hole Review List -->
        <div class="space-y-2 max-h-[200px] overflow-y-auto pr-1">
          <div
            v-for="(h, idx) in fullScorecardData.holes"
            :key="idx"
            class="flex items-center justify-between p-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs"
          >
            <span class="font-bold text-slate-300">
              Hole {{ h.holeNumber }}
              <span class="text-[10px] text-slate-500">(Par {{ h.par }}, SI {{ h.si }})</span>
            </span>
            <div class="flex items-center gap-2">
              <span class="font-bold text-emerald-400">+{{ h.points }} pts</span>
              <span class="font-black text-white bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">{{ h.strokes ?? '-' }}</span>
              <button
                @click="{ currentHoleIndex = idx; isReviewing = false; }"
                class="text-[10px] text-emerald-400 hover:underline font-bold"
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-2">
          <UButton @click="prevHole" color="neutral" variant="soft" block size="sm" class="font-semibold cursor-pointer flex-1">
            Back to Holes
          </UButton>
          <UButton @click="submitScorecard" :disabled="submitting" color="success" block size="sm" class="font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer flex-1">
            {{ submitting ? 'Saving...' : 'Confirm & Save' }}
          </UButton>
        </div>
      </div>

      <!-- FOCUSED HOLE CARD (main play screen) -->
      <div v-else class="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-4 rounded-3xl shadow-2xl space-y-4 relative overflow-hidden">

        <!-- Hole Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xl flex items-center justify-center">
              {{ currentHoleNumber }}
            </div>
            <div>
              <span class="text-sm font-bold uppercase tracking-wider text-slate-400 block">Hole {{ currentHoleNumber }} of {{ course.numHoles }}</span>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-sm text-slate-500 font-medium">SI: <strong class="text-slate-300">{{ currentSI }}</strong></span>
                <span class="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  +{{ shotsReceived }} shots
                </span>
              </div>
            </div>
          </div>

          <div class="text-right bg-slate-950/80 border border-slate-800/80 px-4 py-2 rounded-xl">
            <span class="text-sm uppercase font-bold text-emerald-400 block">Par</span>
            <span class="text-2xl font-black text-white">{{ currentPar }}</span>
          </div>
        </div>

        <!-- Score Stepper -->
        <div class="space-y-3 text-center">
          <div class="flex items-center justify-between px-2">
            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Strokes Taken</span>
            <span class="text-[10px] font-black text-emerald-400">
              +{{ holePoints }} pts
            </span>
          </div>

          <div class="flex items-center justify-center gap-6">
            <button @click="currentScore--" class="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 text-white text-3xl font-bold hover:border-emerald-500 transition-all cursor-pointer active:scale-95 flex items-center justify-center">−</button>
            <div class="w-28 text-center">
              <input v-model.number="currentScore" type="number" min="1" max="15" inputmode="numeric" class="w-full text-center bg-slate-950 border border-slate-800 rounded-2xl text-white text-6xl font-black py-2 focus:border-emerald-500 focus:outline-none" />
            </div>
            <button @click="currentScore++" class="w-16 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-3xl font-bold transition-all cursor-pointer active:scale-95 shadow-lg shadow-emerald-600/30 flex items-center justify-center">+</button>
          </div>

          <div class="text-sm font-medium text-slate-500">
            Running Total: <strong class="text-slate-300">{{ fullScorecardData.holes[currentHoleIndex]?.runningTotal || 0 }} pts</strong>
          </div>
        </div>

        <!-- Quick Score Presets -->
        <div class="grid grid-cols-4 gap-1 pt-1">
          <button @click="setScoreRelativeToPar(-1)" class="py-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-sm font-bold text-emerald-400 cursor-pointer">
            Birdie
          </button>
          <button @click="setScoreRelativeToPar(0)" class="py-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-sm font-bold text-white cursor-pointer">
            Par
          </button>
          <button @click="setScoreRelativeToPar(1)" class="py-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-sm font-bold text-amber-400 cursor-pointer">
            Bogey
          </button>
          <button @click="setScoreRelativeToPar(2)" class="py-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-sm font-bold text-red-400 cursor-pointer">
            Dbl+
          </button>
        </div>

        <!-- Navigation -->
        <div class="flex gap-2 pt-3 border-t border-slate-800">
          <UButton
            @click="prevHole"
            :disabled="currentHoleIndex === 0"
            color="neutral"
            variant="soft"
            size="sm"
            block
            icon="i-heroicons-arrow-left"
            class="font-bold cursor-pointer flex-1 disabled:opacity-30"
          >
            Previous
          </UButton>
          <UButton
            @click="nextHole"
            color="success"
            size="sm"
            block
            icon="i-heroicons-arrow-right"
            class="font-bold shadow-lg shadow-emerald-500/20 cursor-pointer flex-1"
          >
            {{ currentHoleIndex === course.numHoles - 1 ? 'Review Card' : 'Next Hole' }}
          </UButton>
        </div>
      </div>

      <!-- Quick Jumper Grid -->
      <div v-if="!isReviewing" class="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">Jump to Hole</span>
        <div class="flex flex-wrap gap-1 justify-center">
          <button
            v-for="(_, idx) in Number(course.numHoles || 18)"
            :key="idx"
            @click="currentHoleIndex = idx"
            :class="[
              currentHoleIndex === idx ? 'bg-emerald-600 text-white font-black scale-105 shadow-md shadow-emerald-600/30' :
              holeScores[idx] !== null ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-500/30' :
              'bg-slate-950 text-slate-400 font-semibold border border-slate-800'
            ]"
            class="w-7 h-7 rounded-xl text-[10px] flex items-center justify-center transition-all cursor-pointer"
          >
            {{ idx + 1 }}
          </button>
        </div>
      </div>

    </template>
  </div>
</template>