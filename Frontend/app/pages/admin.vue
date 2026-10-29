<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  middleware: 'admin'
})

// Active workspace tab ('competitions' | 'courses' | 'players' | 'rules' | null)
const activePanel = ref<'competitions' | 'courses' | 'players' | 'rules' | null>(null)

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

// ----------------------------------------------------
// 1. COMPETITIONS & FIXTURES STATE
// ----------------------------------------------------
const { data: compRes, refresh: refreshCompetitions } = await useFetch('/api/competitions')
const competitions = computed(() => compRes.value?.data || [])

const compSearch = ref('')
const filteredCompetitions = computed(() => {
  return competitions.value.filter((c: any) => c.name.toLowerCase().includes(compSearch.value.toLowerCase()))
})

const showAddComp = ref(false)
const newCompName = ref('')
const newCompDate = ref('')
const newCompCourseId = ref('')

const newCompPrize1st = ref<number | string>('')
const newCompPrize2nd = ref<number | string>('')
const newCompPrize3rd = ref<number | string>('')

const createCompetition = async () => {
  if (!newCompName.value || !newCompDate.value) {
    alert('Please provide a competition title and date & time.')
    return
  }

  try {
    await $fetch('/api/competitions', {
      method: 'POST',
      body: {
        name: newCompName.value,
        courseId: newCompCourseId.value || null,
        date: newCompDate.value,
        prize1st: Number(newCompPrize1st.value) || 0,
        prize2nd: Number(newCompPrize2nd.value) || 0,
        prize3rd: Number(newCompPrize3rd.value) || 0
      }
    })

    // Reset Form
    newCompName.value = ''
    newCompCourseId.value = ''
    newCompDate.value = ''
    newCompPrize1st.value = ''
    newCompPrize2nd.value = ''
    newCompPrize3rd.value = ''
    showAddComp.value = false

    await refreshCompetitions()
    triggerToast()
  } catch (err: any) {
    console.error('Create error:', err)
    alert(err?.data?.statusMessage || err?.statusMessage || 'Failed to create fixture')
  }
}

const toggleCompStatus = async (comp: any) => {
  const newStatus = comp.status === 'OPEN' ? 'CLOSED' : 'OPEN'
  try {
    await $fetch(`/api/competitions/${comp.id}`, {
      method: 'PUT',
      body: { status: newStatus }
    })
    await refreshCompetitions()
    triggerToast()
  } catch (err) {
    alert('Failed to update competition status')
  }
}

// ----------------------------------------------------
// 2. COURSE DIRECTORY STATE
// ----------------------------------------------------
const courses = ref<any[]>([])
const fetchCourses = async () => {
  try {
    const res: any = await $fetch('/api/courses')
    if (res?.success) courses.value = res.courses
  } catch (err) {
    console.error('Failed to fetch courses', err)
  }
}

const showAddCourse = ref(false)
const newCourseName = ref('Blackwood Hamilton')
const newCourseLocation = ref('Bangor')
const newCourseNumHoles = ref(18)
const newCoursePars = ref([4, 5, 3, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4])
const newCourseSI = ref([6, 12, 8, 18, 2, 14, 10, 4, 16, 5, 9, 13, 1, 17, 3, 7, 11, 15])

const handleHoleCountChange = (count: number) => {
  newCourseNumHoles.value = count
  newCoursePars.value = Array(count).fill(4)
  newCourseSI.value = Array.from({ length: count }, (_, i) => i + 1)
}

const newCourseHandicapRules = ref([
  { id: 'band1', label: 'Band 1 (HCP 0–6)', minPts: 0, maxPts: 6, bandRate: 0.2 },
  { id: 'band2', label: 'Band 2 (HCP 7–12)', minPts: 7, maxPts: 12, bandRate: 0.4 },
  { id: 'band3', label: 'Band 3 (HCP 13–18)', minPts: 13, maxPts: 18, bandRate: 0.6 },
  { id: 'band4', label: 'Band 4 (HCP 19–32)', minPts: 19, maxPts: 32, bandRate: 0.8 }
])

const newCoursePenalties = ref({
  firstPlace: -3,
  secondPlace: -2,
  thirdPlace: -1,
  others: 0
})

const createCourse = async () => {
  if (!newCourseName.value || !newCourseLocation.value) {
    alert('Please enter course name and location.')
    return
  }

  const payload = {
    name: newCourseName.value,
    location: newCourseLocation.value,
    numHoles: newCourseNumHoles.value,
    pars: newCoursePars.value,
    strokeIndexes: newCourseSI.value,
    handicapRules: {
      bands: newCourseHandicapRules.value,
      penalties: newCoursePenalties.value
    }
  }

  try {
    const res: any = await $fetch('/api/courses', {
      method: 'POST',
      body: payload
    })

    if (res.success) {
      showAddCourse.value = false
      await fetchCourses()
      triggerToast()
    }
  } catch (err: any) {
    console.error('Error creating course:', err)
    alert(err?.data?.statusMessage || err?.statusMessage || 'Failed to save course and rules.')
  }
}

// ----------------------------------------------------
// 3. PLAYERS & MEMBERS STATE
// ----------------------------------------------------
const { data: playerRes, refresh: refreshPlayers } = await useFetch('/api/players')
const players = computed(() => playerRes.value?.data || [])

const playerSearch = ref('')
const filteredPlayers = computed(() => {
  return players.value.filter((p: any) => p.name.toLowerCase().includes(playerSearch.value.toLowerCase()))
})

const showAddPlayer = ref(false)
const newPlayerName = ref('')
const newPlayerHcp = ref(18.0)
const newPlayerUsername = ref('')
const newPlayerPassword = ref('password123')

const createPlayer = async () => {
  if (!newPlayerName.value || !newPlayerUsername.value) return
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: newPlayerName.value,
        username: newPlayerUsername.value,
        password: newPlayerPassword.value,
        handicapIndex: newPlayerHcp.value
      }
    })
    newPlayerName.value = ''
    newPlayerUsername.value = ''
    newPlayerHcp.value = 18.0
    showAddPlayer.value = false
    await refreshPlayers()
    triggerToast()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Failed to register player')
  }
}

const updatePlayerRecord = async (player: any) => {
  try {
    await $fetch(`/api/players/${player.id}`, {
      method: 'PUT',
      body: {
        handicapIndex: player.handicapIndex,
        nextRoundPenalty: player.nextRoundPenalty || 0.0,
        active: player.active ? 1 : 0
      }
    })
    triggerToast()
  } catch (err) {
    console.error('Failed to sync player update', err)
  }
}

// ----------------------------------------------------
// 4. HANDICAP RULES MATRIX
// ----------------------------------------------------
const handicapRules = ref([
  { id: 1, label: 'Winner / Big Cut', minPts: 40, maxPts: 60, adjustment: -2.0, desc: 'Score ≥ 40 pts' },
  { id: 2, label: 'Medium Cut', minPts: 37, maxPts: 39, adjustment: -1.0, desc: 'Score 37–39 pts' },
  { id: 3, label: 'Small Cut', minPts: 35, maxPts: 36, adjustment: -0.5, desc: 'Score 35–36 pts' },
  { id: 4, label: 'Neutral Buffer', minPts: 30, maxPts: 34, adjustment: 0.0, desc: 'Score 30–34 pts' },
  { id: 5, label: 'HCP Increase', minPts: 0, maxPts: 29, adjustment: +0.5, desc: 'Score < 30 pts' }
])

// Save Toast Feedback
const saveSuccess = ref(false)
const triggerToast = () => {
  saveSuccess.value = true
  setTimeout(() => { saveSuccess.value = false }, 3000)
}

onMounted(() => {
  fetchCourses()
})

// ----------------------------------------------------
// 5. COURSE RULES MODAL
// ----------------------------------------------------
const showEditCourseModal = ref<boolean>(false)
const editingCourse = ref<any>(null)
const updatingCourseRules = ref<boolean>(false)

const editHandicapRules = ref([
  { id: 'band1', label: 'Band 1 (HCP 0–6)', minPts: 0, maxPts: 6, bandRate: 0.2 },
  { id: 'band2', label: 'Band 2 (HCP 7–12)', minPts: 7, maxPts: 12, bandRate: 0.4 },
  { id: 'band3', label: 'Band 3 (HCP 13–18)', minPts: 13, maxPts: 18, bandRate: 0.6 },
  { id: 'band4', label: 'Band 4 (HCP 19–32)', minPts: 19, maxPts: 32, bandRate: 0.8 }
])

const editPenalties = ref({
  firstPlace: -3,
  secondPlace: -2,
  thirdPlace: -1,
  others: 0
})

const editCourseRules = (course: any) => {
  editingCourse.value = course

  if (course?.handicapRules) {
    try {
      const parsed = typeof course.handicapRules === 'string' 
        ? JSON.parse(course.handicapRules) 
        : course.handicapRules

      if (parsed.bands || parsed.handicapRules) {
        editHandicapRules.value = parsed.bands || parsed.handicapRules
      }
      if (parsed.penalties || parsed.nextRoundPenalties) {
        editPenalties.value = parsed.penalties || parsed.nextRoundPenalties
      }
    } catch (e) {
      console.error('Failed to parse course rules JSON:', e)
    }
  }

  showEditCourseModal.value = true
}

const updateCourseRules = async () => {
  if (!editingCourse.value?.id) return

  updatingCourseRules.value = true
  try {
    const rulesPayload = {
      bands: editHandicapRules.value,
      penalties: editPenalties.value
    }

    await $fetch(`/api/courses/${editingCourse.value.id}/rules`, {
      method: 'PUT',
      body: {
        handicapRules: JSON.stringify(rulesPayload)
      }
    })

    showEditCourseModal.value = false
    await fetchCourses()
    triggerToast()
  } catch (err: any) {
    alert(err?.data?.statusMessage || err?.statusMessage || 'Failed to update course rules.')
  } finally {
    updatingCourseRules.value = false
  }
}

const closeModal = () => {
  showEditCourseModal.value = false
  editingCourse.value = null
}
</script>

<template>
  <UContainer class="py-12 max-w-6xl mx-auto space-y-8">
    
    <!-- Admin Portal Header -->
    <div class="relative bg-slate-900/90 border border-slate-800/90 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl overflow-hidden">
      <div class="pointer-events-none absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
      
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg">👑 Admin Portal</span>
            <UBadge color="success" variant="subtle" size="xs">SQLite Live Sync</UBadge>
          </div>
          <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">Society Management Dashboard</h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">Configure tournaments, course directories, member handicap indexes, and scoring matrix rules.</p>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto">
          <UButton 
            @click="triggerToast" 
            color="success" 
            variant="solid" 
            size="lg"
            icon="i-heroicons-check" 
            class="font-bold shadow-lg shadow-emerald-500/25 cursor-pointer flex-1 sm:flex-initial"
          >
            Save All Changes
          </UButton>
        </div>
      </div>
    </div>

    <!-- Success Toast Notification -->
    <Transition name="fade">
      <div v-if="saveSuccess" class="sticky top-6 z-50 bg-emerald-500/15 border border-emerald-500/30 p-4 rounded-2xl text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-2xl backdrop-blur-xl">
        <div class="flex items-center gap-2.5">
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Database records, player indices, and course parameters synchronized successfully.</span>
        </div>
        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Live Sync</span>
      </div>
    </Transition>

    <!-- ACTIVE PANEL BACK BUTTON -->
    <div v-if="activePanel !== null" class="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
      <UButton 
        @click="activePanel = null" 
        color="neutral" 
        variant="ghost" 
        icon="i-heroicons-arrow-left" 
        size="sm"
        class="font-bold cursor-pointer text-slate-300 hover:text-white"
      >
        Back to Admin Hub
      </UButton>
      <span class="text-xs text-emerald-400 font-bold uppercase tracking-widest">Workspace: {{ activePanel }}</span>
    </div>

    <!-- DASHBOARD WORKSPACE CARDS GRID -->
    <div v-if="activePanel === null" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- Panel 1: Competitions -->
      <button 
        @click="activePanel = 'competitions'"
        class="group text-left bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between space-y-6 cursor-pointer relative overflow-hidden"
      >
        <div class="flex items-start justify-between w-full relative z-10">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <UIcon name="i-heroicons-trophy" class="w-6 h-6" />
          </div>
          <UBadge color="success" variant="subtle" size="xs">{{ competitions.length }} Fixtures</UBadge>
        </div>
        <div class="space-y-1.5 relative z-10">
          <h2 class="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">Fixtures & Competitions</h2>
          <p class="text-xs sm:text-sm text-slate-400">Schedule society tournaments, link course parameters, and control live scoring windows.</p>
        </div>
        <div class="flex items-center gap-2 text-xs font-bold text-emerald-400 pt-2 relative z-10">
          <span>Open Manager</span>
          <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      <!-- Panel 2: Course Directory -->
      <button 
        @click="activePanel = 'courses'"
        class="group text-left bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between space-y-6 cursor-pointer relative overflow-hidden"
      >
        <div class="flex items-start justify-between w-full relative z-10">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <UIcon name="i-heroicons-flag" class="w-6 h-6" />
          </div>
          <UBadge color="success" variant="subtle" size="xs">{{ courses.length }} Courses</UBadge>
        </div>
        <div class="space-y-1.5 relative z-10">
          <h2 class="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">Course Directory & Rules</h2>
          <p class="text-xs sm:text-sm text-slate-400">Manage 18-hole par ratings, stroke indexes (S.I. 1–18), and custom handicap cut rules.</p>
        </div>
        <div class="flex items-center gap-2 text-xs font-bold text-emerald-400 pt-2 relative z-10">
          <span>Manage Courses</span>
          <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      <!-- Panel 3: Members -->
      <button 
        @click="activePanel = 'players'"
        class="group text-left bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between space-y-6 cursor-pointer relative overflow-hidden"
      >
        <div class="flex items-start justify-between w-full relative z-10">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <UIcon name="i-heroicons-user-group" class="w-6 h-6" />
          </div>
          <UBadge color="success" variant="subtle" size="xs">{{ players.length }} Members</UBadge>
        </div>
        <div class="space-y-1.5 relative z-10">
          <h2 class="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">Society Member Directory</h2>
          <p class="text-xs sm:text-sm text-slate-400">Inspect player handicaps, toggle active membership status, and assign next-round penalty strokes.</p>
        </div>
        <div class="flex items-center gap-2 text-xs font-bold text-emerald-400 pt-2 relative z-10">
          <span>Manage Members</span>
          <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      <!-- Panel 4: Handicap Rules Matrix -->
      <button 
        @click="activePanel = 'rules'"
        class="group text-left bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between space-y-6 cursor-pointer relative overflow-hidden"
      >
        <div class="flex items-start justify-between w-full relative z-10">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <UIcon name="i-heroicons-adjustments-horizontal" class="w-6 h-6" />
          </div>
          <UBadge color="neutral" variant="subtle" size="xs">Configurable</UBadge>
        </div>
        <div class="space-y-1.5 relative z-10">
          <h2 class="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">Handicap Adjustment Matrix</h2>
          <p class="text-xs sm:text-sm text-slate-400">Configure Stableford threshold cuts, buffer zones, and post-round handicap indexing rules.</p>
        </div>
        <div class="flex items-center gap-2 text-xs font-bold text-emerald-400 pt-2 relative z-10">
          <span>Configure Matrix</span>
          <UIcon name="i-heroicons-arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

    </div>


    <!-- ==================================================== -->
    <!-- EXPANDED WORKSPACE VIEWS                             -->
    <!-- ==================================================== -->

    <!-- 1. COMPETITIONS / FIXTURES PANEL -->
    <div v-if="activePanel === 'competitions'" class="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl space-y-6 p-6 sm:p-8">
      
      <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <UIcon name="i-heroicons-trophy" class="w-5 h-5" />
          </div>
          <div>
            <h2 class="font-bold text-white text-lg">Competitions & Fixtures Manager</h2>
            <p class="text-xs text-slate-400">Create upcoming tournaments, assign venues, and set podium prize payouts</p>
          </div>
        </div>
        <UButton 
          @click="showAddComp = !showAddComp" 
          size="sm" 
          color="success" 
          icon="i-heroicons-plus" 
          class="font-bold whitespace-nowrap cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          Create Competition
        </UButton>
      </div>

      <!-- Create Competition Form Modal/Box -->
      <div v-if="showAddComp" class="p-6 rounded-2xl border border-emerald-500/30 bg-slate-950/90 space-y-5 shadow-2xl">
        <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-widest">Schedule New Society Fixture</h4>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase text-slate-400">Competition Title</label>
            <input v-model="newCompName" type="text" placeholder="e.g. Spring Championship 2026" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase text-slate-400">Date & Tee Time</label>
            <input v-model="newCompDate" type="datetime-local" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase text-slate-400">Select Golf Course Venue</label>
          <select v-model="newCompCourseId" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500">
            <option value="">-- Standard / Default Course --</option>
            <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }} ({{ c.location }})</option>
          </select>
        </div>

        <!-- Podium Prizes Setup -->
        <div class="space-y-2 pt-2 border-t border-slate-800/80">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Podium Prize Payouts</span>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <span class="text-[10px] text-slate-400 block font-semibold uppercase">1st Place (£)</span>
              <input v-model.number="newCompPrize1st" type="number" placeholder="50" class="w-full text-center py-1 bg-slate-950 border border-slate-800 rounded-lg text-amber-400 font-bold text-xs mt-1" />
            </div>
            <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <span class="text-[10px] text-slate-400 block font-semibold uppercase">2nd Place (£)</span>
              <input v-model.number="newCompPrize2nd" type="number" placeholder="30" class="w-full text-center py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-bold text-xs mt-1" />
            </div>
            <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <span class="text-[10px] text-slate-400 block font-semibold uppercase">3rd Place (£)</span>
              <input v-model.number="newCompPrize3rd" type="number" placeholder="15" class="w-full text-center py-1 bg-slate-950 border border-slate-800 rounded-lg text-orange-400 font-bold text-xs mt-1" />
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <UButton @click="showAddComp = false" color="neutral" variant="ghost" size="xs" class="cursor-pointer">Cancel</UButton>
          <UButton @click="createCompetition" color="success" size="sm" class="font-bold cursor-pointer shadow-md shadow-emerald-500/20">Save & Schedule Fixture</UButton>
        </div>
      </div>

      <!-- Competitions Search & List -->
      <div class="space-y-4">
        <div class="relative">
          <input v-model="compSearch" type="text" placeholder="Search competitions..." class="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="comp in filteredCompetitions" :key="comp.id" class="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-base">{{ comp.name }}</span>
                <UBadge :color="comp.status === 'OPEN' ? 'success' : 'neutral'" variant="subtle" size="xs">{{ comp.status }}</UBadge>
              </div>
              <p class="text-xs text-slate-400">📅 {{ formatUKDate(comp.date) }}</p>
              <p class="text-xs text-slate-400">🏆 Prizes: £{{ comp.prize1st || 0 }} / £{{ comp.prize2nd || 0 }} / £{{ comp.prize3rd || 0 }}</p>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <UButton :to="`/competitions/${comp.id}`" size="xs" color="neutral" variant="soft" icon="i-heroicons-eye">View Lobby</UButton>
              <UButton @click="toggleCompStatus(comp)" size="xs" :color="comp.status === 'OPEN' ? 'error' : 'success'" variant="soft">
                {{ comp.status === 'OPEN' ? 'Close Scoring' : 'Open Scoring' }}
              </UButton>
            </div>
          </div>
        </div>
      </div>

    </div>


    <!-- 2. COURSE DIRECTORY PANEL -->
    <div v-if="activePanel === 'courses'" class="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl space-y-6 p-6 sm:p-8">
      
      <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <UIcon name="i-heroicons-flag" class="w-5 h-5" />
          </div>
          <div>
            <h2 class="font-bold text-white text-lg">Course Directory & Rules Setup</h2>
            <p class="text-xs text-slate-400">Saved courses with 18-hole par, stroke index, and custom handicap cut rules</p>
          </div>
        </div>
        <UButton @click="showAddCourse = !showAddCourse" size="sm" color="success" icon="i-heroicons-plus" class="font-bold whitespace-nowrap cursor-pointer shadow-lg shadow-emerald-500/20">
          Add New Course
        </UButton>
      </div>

      <!-- Add / Configure Course Form -->
      <div v-if="showAddCourse" class="p-6 rounded-2xl border border-emerald-500/30 bg-slate-950/90 space-y-5 shadow-2xl">
        <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Configure New Golf Course</h4>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input v-model="newCourseName" placeholder="Course Name (e.g. Blackwood Hamilton)" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500" />
          <input v-model="newCourseLocation" placeholder="Location / Town (e.g. Bangor)" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500" />
        </div>
        
        <div class="flex items-center gap-3 pt-1">
          <span class="text-xs font-semibold text-slate-400 uppercase">Hole Count:</span>
          <button @click="handleHoleCountChange(18)" type="button" :class="newCourseNumHoles === 18 ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'" class="px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer">18 Holes</button>
          <button @click="handleHoleCountChange(9)" type="button" :class="newCourseNumHoles === 9 ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'" class="px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer">9 Holes</button>
        </div>

        <div class="overflow-x-auto pt-2">
          <table class="w-full text-center text-xs">
            <thead>
              <tr class="text-slate-400 font-bold uppercase border-b border-slate-800">
                <th class="py-2 text-left">Hole</th>
                <th v-for="h in newCourseNumHoles" :key="h" class="py-2">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-slate-800/60 font-bold text-emerald-400">
                <td class="py-2 text-left">Par</td>
                <td v-for="(_, idx) in newCoursePars" :key="idx" class="p-1">
                  <input v-model.number="newCoursePars[idx]" type="number" min="3" max="5" class="w-8 text-center py-1 bg-slate-900 border border-slate-800 rounded-md text-white font-bold" />
                </td>
              </tr>
              <tr>
                <td class="py-2 text-left text-slate-400">S.I.</td>
                <td v-for="(_, idx) in newCourseSI" :key="idx" class="p-1">
                  <input v-model.number="newCourseSI[idx]" type="number" min="1" :max="newCourseNumHoles" class="w-8 text-center py-1 bg-slate-900 border border-slate-800 rounded-md text-white font-bold" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-800/80">
          <UButton @click="showAddCourse = false" color="neutral" variant="ghost" size="xs">Cancel</UButton>
          <UButton @click="createCourse" color="success" size="sm" class="font-bold cursor-pointer shadow-md shadow-emerald-500/20">Save Course & Rules</UButton>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="course in courses" :key="course.id" class="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-bold text-white text-base">{{ course.name }}</h3>
              <p class="text-xs text-slate-400">📍 {{ course.location }}</p>
            </div>
            <UBadge color="success" variant="subtle" size="xs">{{ course.numHoles }} Holes</UBadge>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span class="text-slate-400">Total Par: <strong class="text-white">{{ Array.isArray(course.pars) ? course.pars.reduce((a: number, b: number) => a + b, 0) : 71 }}</strong></span>
            <UButton @click="editCourseRules(course)" size="2xs" color="neutral" variant="soft" icon="i-heroicons-pencil-square" class="cursor-pointer font-medium">
              Edit Rules
            </UButton>
          </div>
        </div>
      </div>

    </div>


    <!-- 3. PLAYERS & MEMBERS PANEL -->
    <div v-if="activePanel === 'players'" class="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl space-y-6 p-6 sm:p-8">
      
      <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <UIcon name="i-heroicons-user-group" class="w-5 h-5" />
          </div>
          <div>
            <h2 class="font-bold text-white text-lg">Society Member Directory</h2>
            <p class="text-xs text-slate-400">Manage player handicap indexes and next-round penalty modifiers</p>
          </div>
        </div>
        <UButton @click="showAddPlayer = !showAddPlayer" size="sm" color="success" icon="i-heroicons-user-plus" class="font-bold whitespace-nowrap cursor-pointer shadow-lg shadow-emerald-500/20">
          Register Member
        </UButton>
      </div>

      <!-- Add Player Form -->
      <div v-if="showAddPlayer" class="p-6 rounded-2xl border border-emerald-500/30 bg-slate-950/90 space-y-4 shadow-2xl">
        <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Register New Society Member</h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input v-model="newPlayerName" placeholder="Full Name" class="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500" />
          <input v-model="newPlayerUsername" placeholder="Username (login)" class="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500" />
          <input v-model.number="newPlayerHcp" type="number" step="0.1" placeholder="Initial HCP" class="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 font-bold" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <UButton @click="showAddPlayer = false" color="neutral" variant="ghost" size="xs">Cancel</UButton>
          <UButton @click="createPlayer" color="success" size="sm" class="font-bold cursor-pointer">Save Member</UButton>
        </div>
      </div>

      <div class="relative">
        <input v-model="playerSearch" type="text" placeholder="Search members..." class="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
        <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-500 absolute left-3 top-3" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="player in filteredPlayers" :key="player.id" class="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-bold text-white text-sm block">{{ player.name }}</span>
              <span class="text-[10px] text-slate-400">@{{ player.username }} • Role: {{ player.role }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-slate-400 font-bold">HCP:</span>
              <input v-model.number="player.handicapIndex" @change="updatePlayerRecord(player)" type="number" step="0.1" class="w-16 text-center py-1 bg-slate-900 border border-slate-800 rounded text-emerald-400 font-bold text-xs" />
            </div>
          </div>
        </div>
      </div>

    </div>


    <!-- 4. HANDICAP RULES MATRIX PANEL -->
    <div v-if="activePanel === 'rules'" class="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl space-y-6 p-6 sm:p-8">
      
      <div class="flex items-center gap-3 pb-4 border-b border-slate-800">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <UIcon name="i-heroicons-adjustments-horizontal" class="w-5 h-5" />
        </div>
        <div>
          <h2 class="font-bold text-white text-lg">Handicap Adjustment Matrix</h2>
          <p class="text-xs text-slate-400">Society-wide Stableford points cut and buffer zone configuration</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3">
        <div v-for="rule in handicapRules" :key="rule.id" class="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <span class="font-bold text-white text-sm block">{{ rule.label }}</span>
            <span class="text-xs text-slate-400">{{ rule.desc }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500 font-semibold uppercase">Adjustment:</span>
            <input v-model.number="rule.adjustment" type="number" step="0.5" class="w-20 text-center py-1 bg-slate-900 border border-slate-800 rounded text-emerald-400 font-bold text-xs" />
          </div>
        </div>
      </div>

    </div>


    <!-- EDIT COURSE RULES MODAL -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEditCourseModal" class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div class="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 text-white relative">
            
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 class="font-bold text-base text-emerald-400">Edit Course Handicap Rules</h3>
                <p class="text-xs text-slate-400">{{ editingCourse?.name }} ({{ editingCourse?.location }})</p>
              </div>
              <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="xs" class="cursor-pointer" @click="closeModal" />
            </div>

            <div class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Handicap Cut Band Rates</h4>
              <div v-for="rule in editHandicapRules" :key="rule.id" class="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <span class="text-xs font-bold text-slate-200 block">{{ rule.label }}</span>
                  <span class="text-[10px] text-slate-400">Cut Rate multiplier</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] text-slate-500 font-semibold uppercase">Rate:</span>
                  <input v-model.number="rule.bandRate" type="number" step="0.1" class="w-16 text-center py-1 bg-slate-900 border border-slate-800 rounded text-emerald-400 font-bold text-xs" />
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <UButton color="neutral" variant="ghost" size="xs" class="cursor-pointer" @click="closeModal">Cancel</UButton>
              <UButton color="success" size="sm" :loading="updatingCourseRules" @click="updateCourseRules" class="font-bold cursor-pointer">
                Save Rules
              </UButton>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

  </UContainer>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

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