<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { calculatePlayingHandicap, calculateHoleStableford, calculateFullScorecard } from '../../server/utils/handicap'

const route = useRoute()
const competitionId = route.query.competitionId as string
const courseIdQuery = route.query.courseId as string

const course = ref<any>(null)
// Initialize with null values so unplayed holes contribute 0 points
const holeScores = ref<(number | null)[]>([])
const currentHoleIndex = ref(0)
const isReviewing = ref(false)
const loading = ref(true)
const submitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Fetch active user details
const { data: userRes } = await useFetch('/api/auth/me')
const currentUser = computed(() => userRes.value?.data || null)

// Playing handicap calculation using WHS rules (.5 rounds up)
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
      // Fallback course with default pars and stroke indexes (SI 1-18)
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

    // CHECK IF PLAYER HAS AN EXISTING SCORECARD FOR THIS SPECIFIC COMPETITION
    if (competitionId && currentUser.value?.id) {
      try {
        const existingCardRes: any = await $fetch(`/api/scores/check?competitionId=${competitionId}`)
        
        if (existingCardRes?.success && existingCardRes?.holeScores) {
          // IF YES: Load existing scores for THIS competition
          const parsed = typeof existingCardRes.holeScores === 'string' 
            ? JSON.parse(existingCardRes.holeScores) 
            : existingCardRes.holeScores
          
          holeScores.value = parsed
        } else {
          // IF NO: Start with a fresh, completely BLANK card
          holeScores.value = Array(numHoles).fill(null)
        }
      } catch (err) {
        // Fallback to blank card
        holeScores.value = Array(numHoles).fill(null)
      }
    } else {
      // Casual / non-competition round -> always start blank
      holeScores.value = Array(numHoles).fill(null)
    }

  } catch (err) {
    console.error('Error setting up scorecard course', err)
  } finally {
    loading.value = false
  }
})

// Current hole details
const currentHoleNumber = computed(() => currentHoleIndex.value + 1)
const currentPar = computed(() => course.value?.pars[currentHoleIndex.value] || 4)
const currentSI = computed(() => course.value?.strokeIndexes[currentHoleIndex.value] || 1)

// Returns entered score, or defaults display to Par when focused for quick scoring
const currentScore = computed({
  get: () => holeScores.value[currentHoleIndex.value] ?? currentPar.value,
  set: (val: number | null) => {
    if (val !== null && val >= 1) {
      holeScores.value[currentHoleIndex.value] = val
    }
  }
})

const nextHole = () => {
  // If player clicks Next without explicitly changing score, record the current score (Par default)
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

// Full Scorecard Calculation using the Earlybirds Utility Engine
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

// Submit Scorecard to Database
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
      successMessage.value = 'Scorecard successfully submitted to your profile!'
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

// Debounce state to prevent rapid API hits while clicking
let liveSyncTimeout: any = null

watch(
  holeScores,
  (newScores) => {
    if (!competitionId) return // Only live sync for official competition scorecards

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
        // Silent failure so play is never interrupted
      }
    }, 400) // Sync 400ms after last score tap
  },
  { deep: true }
)
</script>

<template>
  <div class="max-w-md mx-auto px-4 py-6 space-y-6 pb-24">
    
    <!-- Top Bar -->
    <div class="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
      <!-- Ambient Subtle Background Glow Accent -->
      <div class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-blue-500/5 blur-3xl"></div>

      <div class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        
        <!-- 1. Left: Venue & Course Header -->
        <div class="flex items-center gap-3.5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-inner">
            <UIcon name="i-heroicons-flag" class="h-5 w-5" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="truncate text-base font-black tracking-tight text-white sm:text-lg">
                {{ course ? course.name : 'Digital Scorecard' }}
              </h1>
              <UBadge color="neutral" variant="subtle" size="xs" class="font-bold uppercase tracking-wider">
                {{ course?.numHoles ? `${course.numHoles}H` : '18H' }}
              </UBadge>
            </div>
            <p class="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <UIcon name="i-heroicons-map-pin" class="h-3.5 w-3.5 text-slate-500" />
              <span class="truncate">{{ course ? course.location : 'Standard 18 Holes' }}</span>
            </p>
          </div>
        </div>

        <!-- Right Grouping: Player Badge & Live Score Widget -->
        <div class="flex items-center justify-between gap-3 border-t border-slate-800/60 pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
          
          <!-- 2. Center: Player Profile Chip -->
          <div class="flex items-center gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/70 p-2 pr-4 shadow-sm backdrop-blur-md">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 font-black text-xs text-emerald-300 shadow-sm uppercase">
              {{ currentUser?.name ? currentUser.name.charAt(0) : 'P' }}
            </div>
            <div class="min-w-0">
              <span class="block truncate text-xs font-bold text-white leading-tight">
                {{ currentUser?.name || 'Player' }}
              </span>
              <span class="mt-0.5 block text-[10px] font-semibold tracking-wide text-slate-400">
                PLAYING HCP: <strong class="font-bold text-emerald-400">{{ playingHandicap }}</strong>
              </span>
            </div>
          </div>

          <!-- 3. Far Right: Live Points Counter -->
          <div class="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 px-3.5 py-2 shadow-inner">
            <div class="text-right">
              <span class="block text-[9px] font-black uppercase tracking-widest text-emerald-400/80">
                Stableford
              </span>
              <span class="text-xl font-black tracking-tight text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                {{ totalStablefordPoints }} <span class="text-xs font-bold text-emerald-500/80">PTS</span>
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

    <div v-if="loading" class="text-center py-16 text-xs text-slate-500 animate-pulse">
      Loading scorecard layout...
    </div>

    <template v-else-if="course">
      
      <!-- REVIEW SCORECARD SCREEN -->
      <div v-if="isReviewing" class="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 class="text-base font-black text-white">Review Scorecard</h2>
          <UBadge color="success" variant="subtle">Ready to Submit</UBadge>
        </div>

        <div v-if="successMessage" class="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-semibold text-center">
          {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl font-semibold text-center">
          {{ errorMessage }}
        </div>

        <!-- Summary Stats Card -->
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Strokes</span>
            <span class="text-lg font-black text-white">{{ totalScore }}</span>
          </div>
          <div class="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Vs Par</span>
            <span class="text-lg font-black" :class="scoreDiff > 0 ? 'text-amber-400' : 'text-emerald-400'">
              {{ scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff === 0 ? 'E' : scoreDiff }}
            </span>
          </div>
          <div class="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Stableford</span>
            <span class="text-lg font-black text-emerald-400">{{ totalStablefordPoints }}</span>
          </div>
        </div>

        <!-- Hole-by-Hole Review Grid -->
        <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          <div v-for="(h, idx) in fullScorecardData.holes" :key="idx" class="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs">
            <span class="font-bold text-slate-300">
              Hole {{ h.holeNumber }} 
              <span class="text-[10px] text-slate-500">(Par {{ h.par }}, SI {{ h.si }})</span>
            </span>
            <div class="flex items-center gap-3">
              <span class="font-bold text-emerald-400">+{{ h.points }} pts</span>
              <span class="font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">{{ h.strokes ?? '-' }} strokes</span>
              <button @click="{ currentHoleIndex = idx; isReviewing = false; }" class="text-emerald-400 hover:underline font-semibold">Edit</button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-2">
          <UButton @click="prevHole" color="neutral" variant="soft" block size="lg" class="font-semibold cursor-pointer">Back to Holes</UButton>
          <UButton @click="submitScorecard" :disabled="submitting" color="success" block size="lg" class="font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer">
            {{ submitting ? 'Saving Round...' : 'Confirm & Save' }}
          </UButton>
        </div>
      </div>

      <!-- FOCUSED HOLE CARD -->
      <div v-else class="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
        
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-xl flex items-center justify-center">
              {{ currentHoleNumber }}
            </div>
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block">Hole {{ currentHoleNumber }} of {{ course.numHoles }}</span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-slate-500 font-medium">Stroke Index: <strong class="text-slate-300">{{ currentSI }}</strong></span>
                <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  +{{ fullScorecardData.holes[currentHoleIndex]?.shotsReceived || 0 }} shots
                </span>
              </div>
            </div>
          </div>

          <div class="text-right bg-slate-950/80 border border-slate-800/80 px-4 py-2 rounded-xl">
            <span class="text-[10px] uppercase font-bold text-emerald-400 block">Hole Par</span>
            <span class="text-xl font-black text-white">{{ currentPar }}</span>
          </div>
        </div>

        <!-- Score Stepper -->
        <div class="space-y-3 text-center py-2">
          <div class="flex items-center justify-between px-2">
            <span class="text-xs uppercase font-bold text-slate-400 tracking-widest">Strokes Taken</span>
            <span class="text-xs font-black text-emerald-400">
              Points: {{ fullScorecardData.holes[currentHoleIndex]?.points || 0 }} pts
            </span>
          </div>
          
          <div class="flex items-center justify-center gap-6">
            <button @click="currentScore--" class="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 text-white text-2xl font-black hover:border-emerald-500 transition-all cursor-pointer active:scale-95 flex items-center justify-center">-</button>
            <div class="w-24 text-center">
              <input v-model.number="currentScore" type="number" min="1" max="15" class="w-full text-center bg-slate-950 border border-slate-800 rounded-2xl text-white text-4xl font-black py-2 focus:border-emerald-500 focus:outline-none" />
            </div>
            <button @click="currentScore++" class="w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-2xl font-black transition-all cursor-pointer active:scale-95 shadow-lg shadow-emerald-600/30 flex items-center justify-center">+</button>
          </div>
          <div class="text-[11px] font-medium text-slate-500">
            Running Total: <strong class="text-slate-300">{{ fullScorecardData.holes[currentHoleIndex]?.runningTotal || 0 }} pts</strong>
          </div>
        </div>

        <!-- Quick Score Presets -->
        <div class="grid grid-cols-4 gap-2 pt-2">
          <button @click="setScoreRelativeToPar(-1)" class="py-2.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-emerald-400 cursor-pointer">Birdie ({{ currentPar - 1 }})</button>
          <button @click="setScoreRelativeToPar(0)" class="py-2.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-white cursor-pointer">Par ({{ currentPar }})</button>
          <button @click="setScoreRelativeToPar(1)" class="py-2.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-amber-400 cursor-pointer">Bogey ({{ currentPar + 1 }})</button>
          <button @click="setScoreRelativeToPar(2)" class="py-2.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-red-400 cursor-pointer">Double+</button>
        </div>

        <!-- Navigation -->
        <div class="flex gap-3 pt-4 border-t border-slate-800">
          <UButton @click="prevHole" :disabled="currentHoleIndex === 0" color="neutral" variant="soft" size="lg" block icon="i-heroicons-arrow-left" class="font-semibold cursor-pointer">Previous</UButton>
          <UButton @click="nextHole" color="success" size="lg" block icon="i-heroicons-arrow-right" class="font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer">
            {{ currentHoleIndex === course.numHoles - 1 ? 'Review Card' : 'Next Hole' }}
          </UButton>
        </div>

      </div>

      <!-- Quick Jumper Grid -->
      <div v-if="!isReviewing" class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">Jump to Hole</span>
        <div class="flex flex-wrap gap-1.5 justify-center">
          <button 
            v-for="(_, idx) in course.numHoles" 
            :key="idx"
            @click="currentHoleIndex = idx"
            :class="[
              currentHoleIndex === idx ? 'bg-emerald-600 text-white font-black scale-105 shadow-md shadow-emerald-600/30' : 
              holeScores[idx] !== null ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-500/30' : 'bg-slate-950 text-slate-400 font-semibold border border-slate-800'
            ]"
            class="w-8 h-8 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer"
          >
            {{ idx + 1 }}
          </button>
        </div>
      </div>

    </template>
  </div>
</template>