<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
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

const { data: userRes, error: userError } = await useFetch('/api/auth/me', {
  ignoreResponseError: true
})

const isLoggedIn = computed(() => !!userRes.value?.success && !!userRes.value?.data)

if (userError.value || !isLoggedIn.value) {
  await navigateTo('/login')
}

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

// Player's personal handicap band for this round
const handicapBand = computed(() => {
  const hcp = playingHandicap.value
  if (hcp <= 6) return { label: 'Band 1 (0–6)', rate: 0.2, color: 'text-emerald-400' }
  if (hcp <= 12) return { label: 'Band 2 (7–12)', rate: 0.4, color: 'text-blue-400' }
  if (hcp <= 18) return { label: 'Band 3 (13–18)', rate: 0.6, color: 'text-amber-400' }
  return { label: 'Band 4 (19–32)', rate: 0.8, color: 'text-rose-400' }
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
      const currentHcp = Number(currentUser.value?.handicapIndex || 0)
      const points = totalStablefordPoints.value
      const cut = calculateEarlybirdsHandicapCut(currentHcp, points, 'other')
      const newHandicapIndex = cut.newHandicapIndex

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
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 font-mono text-xs text-zinc-500 space-y-3">
      <div class="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
      <span>INITIALIZING_SCORECARD...</span>
    </div>

    <template v-else-if="course">

      <!-- Course & Player Telemetry Top Bar -->
      <section class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl font-mono">
        <div class="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span class="text-zinc-200 font-bold uppercase tracking-wider">LIVE_SCORECARD_ENGINE</span>
          </div>
          <span class="text-orange-400">{{ course.numHoles }}H • PAR {{ totalPar }}</span>
        </div>

        <div class="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="space-y-1 min-w-0">
            <div class="text-[10px] text-orange-400 uppercase tracking-widest">// VENUE</div>
            <h1 class="text-lg sm:text-xl font-bold text-zinc-100 font-sans truncate">{{ course.name }}</h1>
            <p class="text-xs text-zinc-400 font-sans flex items-center gap-1.5">
              <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>{{ course.location }}</span>
            </p>
          </div>

          <!-- Live Score Summary Badge -->
          <div class="border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 rounded-sm flex items-center gap-4 shrink-0">
            <div>
              <div class="text-[9px] uppercase tracking-wider text-zinc-400">Stableford Total</div>
              <div class="text-xl font-bold text-orange-400 leading-none mt-0.5">
                {{ totalStablefordPoints }} <span class="text-xs font-normal text-zinc-400">PTS</span>
              </div>
            </div>
            <div class="w-px h-8 bg-zinc-800"></div>
            <div>
              <div class="text-[9px] uppercase tracking-wider text-zinc-400">Playing HCP</div>
              <div class="text-xl font-bold text-zinc-100 leading-none mt-0.5">
                {{ playingHandicap }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- REVIEW SCORECARD SCREEN -->
      <section v-if="isReviewing" class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl font-mono">
        <div class="px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
          <div class="text-xs font-bold uppercase tracking-wider text-zinc-200">Review Scorecard Telemetry</div>
          <span class="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-sm">READY_TO_SUBMIT</span>
        </div>

        <div class="p-5 space-y-5">
          <div v-if="successMessage" class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-sm">
            ✓ {{ successMessage }}
          </div>
          <div v-if="errorMessage" class="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-sm">
            ! {{ errorMessage }}
          </div>

          <!-- Summary Matrix -->
          <div class="grid grid-cols-3 border border-zinc-800 divide-x divide-zinc-800 bg-zinc-900/30 text-center">
            <div class="p-3.5">
              <span class="text-[10px] uppercase text-zinc-500 block">Total Strokes</span>
              <span class="text-xl font-bold text-zinc-100">{{ totalScore }}</span>
            </div>
            <div class="p-3.5">
              <span class="text-[10px] uppercase text-zinc-500 block">Vs Par</span>
              <span class="text-xl font-bold" :class="scoreDiff > 0 ? 'text-orange-400' : 'text-emerald-400'">
                {{ scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff === 0 ? 'E' : scoreDiff }}
              </span>
            </div>
            <div class="p-3.5">
              <span class="text-[10px] uppercase text-zinc-500 block">Stableford</span>
              <span class="text-xl font-bold text-orange-400">{{ totalStablefordPoints }}</span>
            </div>
          </div>

          <!-- Hole-by-Hole Review List -->
          <div class="border border-zinc-800 divide-y divide-zinc-800 max-h-64 overflow-y-auto">
            <div
              v-for="(h, idx) in fullScorecardData.holes"
              :key="idx"
              class="p-2.5 flex items-center justify-between hover:bg-zinc-900/50 transition-colors text-xs"
            >
              <div class="flex items-center gap-3">
                <span class="font-bold text-zinc-400">H{{ String(h.holeNumber).padStart(2, '0') }}</span>
                <span class="text-zinc-500 text-[10px]">Par {{ h.par }} • SI {{ h.si }}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-orange-400 font-bold">+{{ h.points }} pts</span>
                <span class="font-bold text-zinc-100 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-sm">
                  {{ h.strokes ?? '—' }}
                </span>
                <button
                  @click="currentHoleIndex = idx; isReviewing = false;"
                  class="text-[10px] text-orange-400 hover:underline cursor-pointer"
                >
                  EDIT
                </button>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-2 border-t border-zinc-800">
            <UButton
              @click="prevHole"
              variant="outline"
              block
              size="sm"
              class="rounded-sm border-zinc-700 text-zinc-300 hover:bg-zinc-900 font-mono text-xs uppercase cursor-pointer"
            >
              Back to Holes
            </UButton>
            <UButton
              @click="submitScorecard"
              :disabled="submitting"
              block
              size="sm"
              class="rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold font-mono text-xs uppercase cursor-pointer shadow-[0_0_20px_rgba(246,130,31,0.2)]"
            >
              {{ submitting ? 'SAVING...' : 'CONFIRM & SUBMIT' }}
            </UButton>
          </div>
        </div>
      </section>

      <!-- FOCUSED HOLE CARD (Main Play Screen) -->
      <section v-else class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl font-mono">
        
        <!-- Hole Telemetry Header -->
        <div class="px-4 py-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 font-bold text-sm flex items-center justify-center">
              {{ currentHoleNumber }}
            </div>
            <div>
              <div class="text-[10px] text-zinc-500 uppercase tracking-wider">HOLE_LOG // {{ currentHoleNumber }} OF {{ course.numHoles }}</div>
              <div class="text-xs font-semibold text-zinc-200">
                Par <strong class="text-zinc-100">{{ currentPar }}</strong> • Stroke Index <strong class="text-zinc-100">{{ currentSI }}</strong>
              </div>
            </div>
          </div>

          <div class="text-right">
            <span class="text-[10px] text-orange-400 block uppercase">Shots Received</span>
            <span class="text-sm font-bold text-zinc-100">+{{ shotsReceived }}</span>
          </div>
        </div>

        <div class="p-6 space-y-6 text-center">
          
          <!-- Score Stepper Controls -->
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs text-zinc-400 px-2">
              <span class="uppercase tracking-wider">Strokes Taken</span>
              <span class="text-orange-400 font-bold">+{{ holePoints }} PTS EARNED</span>
            </div>

            <div class="flex items-center justify-center gap-4">
              <button
                @click="currentScore--"
                class="w-14 h-14 rounded-sm bg-zinc-900 border border-zinc-700 text-zinc-200 text-2xl font-bold hover:border-orange-500 transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
              >
                −
              </button>
              
              <div class="w-28 text-center">
                <input
                  v-model.number="currentScore"
                  type="number"
                  min="1"
                  max="15"
                  inputmode="numeric"
                  class="w-full text-center bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-4xl font-bold py-2 focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                @click="currentScore++"
                class="w-14 h-14 rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 text-2xl font-bold transition-colors cursor-pointer active:scale-95 flex items-center justify-center shadow-[0_0_15px_rgba(246,130,31,0.2)]"
              >
                +
              </button>
            </div>

            <div class="text-xs text-zinc-500">
              Running Total: <strong class="text-zinc-300">{{ fullScorecardData.holes[currentHoleIndex]?.runningTotal || 0 }} PTS</strong>
            </div>
          </div>

          <!-- Quick Score Presets -->
          <div class="grid grid-cols-4 gap-2 pt-1">
            <button
              @click="setScoreRelativeToPar(-1)"
              class="py-2.5 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-sm text-xs font-bold text-emerald-400 cursor-pointer transition-colors"
            >
              Birdie ({{ currentPar - 1 }})
            </button>
            <button
              @click="setScoreRelativeToPar(0)"
              class="py-2.5 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 rounded-sm text-xs font-bold text-zinc-100 cursor-pointer transition-colors"
            >
              Par ({{ currentPar }})
            </button>
            <button
              @click="setScoreRelativeToPar(1)"
              class="py-2.5 bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 rounded-sm text-xs font-bold text-orange-400 cursor-pointer transition-colors"
            >
              Bogey ({{ currentPar + 1 }})
            </button>
            <button
              @click="setScoreRelativeToPar(2)"
              class="py-2.5 bg-zinc-900 border border-zinc-800 hover:border-red-500/50 rounded-sm text-xs font-bold text-red-400 cursor-pointer transition-colors"
            >
              Dbl+ ({{ currentPar + 2 }}+)
            </button>
          </div>

          <!-- Navigation Footer -->
          <div class="flex gap-3 pt-4 border-t border-zinc-800">
            <UButton
              @click="prevHole"
              :disabled="currentHoleIndex === 0"
              variant="outline"
              size="sm"
              block
              icon="i-heroicons-arrow-left"
              class="rounded-sm border-zinc-700 text-zinc-300 hover:bg-zinc-900 font-mono text-xs uppercase cursor-pointer disabled:opacity-30"
            >
              Previous
            </UButton>
            <UButton
              @click="nextHole"
              size="sm"
              block
              icon="i-heroicons-arrow-right"
              class="rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold font-mono text-xs uppercase cursor-pointer shadow-[0_0_20px_rgba(246,130,31,0.2)]"
            >
              {{ currentHoleIndex === course.numHoles - 1 ? 'Review Card' : 'Next Hole' }}
            </UButton>
          </div>

        </div>
      </section>

      <!-- Quick Hole Jumper Grid -->
      <section v-if="!isReviewing" class="border border-zinc-800 bg-zinc-950 p-4 rounded-sm space-y-2.5 font-mono">
        <div class="text-[10px] uppercase tracking-wider text-zinc-400 text-center">// QUICK JUMP TO HOLE</div>
        <div class="flex flex-wrap gap-1.5 justify-center">
          <button
            v-for="(_, idx) in Number(course.numHoles || 18)"
            :key="idx"
            @click="currentHoleIndex = idx"
            :class="[
              currentHoleIndex === idx
                ? 'bg-[#F6821F] text-zinc-950 font-bold'
                : holeScores[idx] !== null
                  ? 'bg-zinc-900 text-orange-400 border border-orange-500/30'
                  : 'bg-zinc-950 text-zinc-500 border border-zinc-800'
            ]"
            class="w-8 h-8 rounded-sm text-xs flex items-center justify-center transition-colors cursor-pointer"
          >
            {{ idx + 1 }}
          </button>
        </div>
      </section>

    </template>
  </div>
</template>