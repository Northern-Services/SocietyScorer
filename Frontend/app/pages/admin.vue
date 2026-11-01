<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  middleware: 'admin'
})

// ---------- STATE ----------
const activeSection = ref<'overview' | 'users' | 'competitions' | 'courses' | 'audit' | 'settings'>('overview')

// ---------- THEME (persists to localStorage) ----------
const loadTheme = (): 'dark' | 'light' => {
  try {
    return isClient ? (localStorage.getItem('admin_theme') as 'dark' | 'light') || 'dark' : 'dark'
  } catch {
    return 'dark'
  }
}
const saveTheme = (theme: 'dark' | 'light') => {
  try {
    if (isClient) localStorage.setItem('admin_theme', theme)
  } catch {
    console.error('Failed to persist theme')
  }
}
const darkMode = ref<'dark' | 'light'>(loadTheme())

const toggleTheme = () => {
  darkMode.value = darkMode.value === 'dark' ? 'light' : 'dark'
  saveTheme(darkMode.value)
}

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

// ---------- AUDIT LOG (client-side, persists to localStorage) ----------
const AUDIT_STORAGE_KEY = 'admin_audit_log'
const isClient = typeof window !== 'undefined'
const loadAuditLog = (): any[] => {
  try {
    const raw = isClient ? localStorage.getItem(AUDIT_STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
const saveAuditLog = (logs: any[]) => {
  try {
    if (isClient) localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 200)))
  } catch {
    console.error('Failed to persist audit log')
  }
}

const auditLog = ref<any[]>(loadAuditLog())
let auditCounter = auditLog.value.length
const auditSearch = ref('')
const auditActionFilter = ref('all')
const auditActionTypes = computed(() => {
  const types = new Set(auditLog.value.map((log: any) => log.action))
  return Array.from(types).sort()
})

const filteredAuditLog = computed(() => {
  return auditLog.value.filter((log: any) => {
    const matchesSearch = !auditSearch.value ||
      log.action.toLowerCase().includes(auditSearch.value.toLowerCase()) ||
      log.target.toLowerCase().includes(auditSearch.value.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.value.toLowerCase())
    const matchesAction = auditActionFilter.value === 'all' || log.action === auditActionFilter.value
    return matchesSearch && matchesAction
  })
})

const addAuditLog = (action: string, target: string, details: string = '') => {
  try {
    auditLog.value.unshift({
      id: `audit-${Date.now()}-${auditCounter++}`,
      timestamp: new Date().toISOString(),
      action,
      target,
      details,
      admin: 'Admin'
    })
    saveAuditLog(auditLog.value)
  } catch (e) {
    console.error('Audit log error:', e)
  }
}

// ---------- SERVER / SYSTEM STATS ----------
const serverStats = ref<any>(null)
const statsLoading = ref(false)

const fetchServerStats = async () => {
  statsLoading.value = true
  try {
    const res: any = await $fetch('/api/stats')
    serverStats.value = res?.data || { totalPlayers: 0, totalCompetitions: 0, totalPrizePool: 0 }
  } catch (err) {
    console.error('Failed to fetch server stats', err)
    serverStats.value = { totalPlayers: 0, totalCompetitions: 0, totalPrizePool: 0 }
  } finally {
    statsLoading.value = false
  }
}

// ---------- USERS ----------
const { data: playersRes, refresh: refreshPlayers } = await useFetch('/api/players')
const players = computed(() => playersRes.value?.data || [])
const userSearch = ref('')
const filteredUsers = computed(() =>
  players.value.filter((p: any) => p.name.toLowerCase().includes(userSearch.value.toLowerCase()) || p.username.toLowerCase().includes(userSearch.value.toLowerCase()))
)

const updateUserRecord = async (player: any) => {
  try {
    await $fetch(`/api/players/${player.id}`, {
      method: 'PUT',
      body: {
        handicapIndex: player.handicapIndex,
        nextRoundPenalty: player.nextRoundPenalty || 0.0,
        active: player.active ? 1 : 0
      }
    })
    addAuditLog('UPDATE_USER', player.name, `HCP: ${player.handicapIndex}, Active: ${player.active}`)
  } catch (err) {
    alert('Failed to update user')
  }
}

// ---------- COMPETITIONS ----------
const { data: compRes, refresh: refreshCompetitions } = await useFetch('/api/competitions')
const competitions = computed(() => compRes.value?.data || [])

const toggleCompStatus = async (comp: any) => {
  const newStatus = comp.status === 'OPEN' ? 'CLOSED' : 'OPEN'
  try {
    await $fetch(`/api/competitions/${comp.id}`, { method: 'PUT', body: { status: newStatus } })
    await refreshCompetitions()
    addAuditLog('TOGGLE_COMPETITION', comp.name, `Status: ${newStatus}`)
  } catch (err) {
    alert('Failed to update competition status')
  }
}

// ---------- COURSES ----------
const courses = ref<any[]>([])
const fetchCourses = async () => {
  try {
    const res: any = await $fetch('/api/courses')
    if (res?.success) courses.value = res.courses
  } catch (err) {
    console.error('Failed to fetch courses', err)
  }
}

// ---------- MANAGE USER MODAL ----------
const showManageUserModal = ref(false)
const editingUser = ref<any>(null)
const editUserName = ref('')
const editUserHcp = ref(0)

const openManageUserModal = (player: any) => {
  editingUser.value = player
  editUserName.value = player.name || ''
  editUserHcp.value = Number(player.handicapIndex || 0)
  showManageUserModal.value = true
}

const saveManagedUser = async () => {
  if (!editingUser.value?.id) return
  try {
    await $fetch(`/api/players/${editingUser.value.id}`, {
      method: 'PUT',
      body: {
        name: editUserName.value.trim(),
        handicapIndex: editUserHcp.value,
        nextRoundPenalty: editingUser.value.nextRoundPenalty || 0.0,
        active: editingUser.value.active ? 1 : 0
      }
    })
    await refreshPlayers()
    showManageUserModal.value = false
    addAuditLog('UPDATE_USER', editUserName.value, `HCP: ${editUserHcp.value}`)
  } catch (err) {
    alert('Failed to update user')
  }
}

// ---------- CREATE USER MODAL ----------
const showCreateUserModal = ref(false)
const newUserName = ref('')
const newUserUsername = ref('')
const newUserPassword = ref('')

const createUser = async () => {
  if (!newUserName.value || !newUserUsername.value || !newUserPassword.value) {
    alert('Please fill in all fields.')
    return
  }
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: newUserName.value.trim(),
        username: newUserUsername.value.trim().toLowerCase(),
        password: newUserPassword.value,
        handicapIndex: 18.0
      }
    })
    await refreshPlayers()
    showCreateUserModal.value = false
    newUserName.value = ''
    newUserUsername.value = ''
    newUserPassword.value = ''
    addAuditLog('CREATE_USER', newUserName.value, 'New member registered')
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Failed to create user.')
  }
}

// ---------- CREATE COMPETITION MODAL ----------
const showCreateCompModal = ref(false)
const newCompName = ref('')
const newCompCourseId = ref('')
const newCompDate = ref('')
const newCompPrize1st = ref<number | string>('')
const newCompPrize2nd = ref<number | string>('')
const newCompPrize3rd = ref<number | string>('')
const newCompPotAmount = ref<number | string>('')

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
        prize3rd: Number(newCompPrize3rd.value) || 0,
        potAmount: Number(newCompPotAmount.value) || 0
      }
    })
    await refreshCompetitions()
    showCreateCompModal.value = false
    newCompName.value = ''
    newCompCourseId.value = ''
    newCompDate.value = ''
    newCompPrize1st.value = ''
    newCompPrize2nd.value = ''
    newCompPrize3rd.value = ''
    newCompPotAmount.value = ''
    addAuditLog('CREATE_COMPETITION', newCompName.value, 'New fixture scheduled')
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Failed to create competition.')
  }
}

// ---------- CREATE COURSE MODAL ----------
const showCreateCourseModal = ref(false)
const newCourseName = ref('')
const newCourseLocation = ref('')
const newCourseNumHoles = ref(18)
const newCoursePars = ref([4, 5, 3, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 4])
const newCourseSI = ref([6, 12, 8, 18, 2, 14, 10, 4, 16, 5, 9, 13, 1, 17, 3, 7, 11, 15])

const handleHoleCountChange = (count: number) => {
  newCourseNumHoles.value = count
  newCoursePars.value = Array(count).fill(4)
  newCourseSI.value = Array.from({ length: count }, (_, i) => i + 1)
}

const saveNewCourse = async () => {
  if (!newCourseName.value || !newCourseLocation.value) {
    alert('Please enter course name and location.')
    return
  }
  const payload = {
    name: newCourseName.value,
    location: newCourseLocation.value,
    numHoles: newCourseNumHoles.value,
    pars: newCoursePars.value,
    strokeIndexes: newCourseSI.value
  }
  try {
    const res: any = await $fetch('/api/courses', {
      method: 'POST',
      body: payload
    })
    if (res.success) {
      showCreateCourseModal.value = false
      await fetchCourses()
      addAuditLog('CREATE_COURSE', newCourseName.value, `${newCourseNumHoles.value} holes`)
    }
  } catch (err: any) {
    alert(err?.data?.statusMessage || err?.statusMessage || 'Failed to save course.')
  }
}

onMounted(() => {
  fetchServerStats()
  fetchCourses()
})

// ---------- NAVIGATION ----------
const navItems = [
  { key: 'overview', label: 'Dashboard', icon: 'i-heroicons-chart-bar', color: 'text-indigo-400' },
  { key: 'users', label: 'Members', icon: 'i-heroicons-user-group', color: 'text-emerald-400' },
  { key: 'competitions', label: 'Fixtures', icon: 'i-heroicons-trophy', color: 'text-amber-400' },
  { key: 'courses', label: 'Courses', icon: 'i-heroicons-flag', color: 'text-blue-400' },
  { key: 'audit', label: 'Audit Log', icon: 'i-heroicons-document-text', color: 'text-purple-400' },
  { key: 'settings', label: 'Settings', icon: 'i-heroicons-cog-6-tooth', color: 'text-slate-400' }
]
</script>

<template>
  <div
    :class="
      darkMode === 'dark'
        ? 'bg-[#0f172a] text-slate-200 min-h-screen font-sans antialiased selection:bg-indigo-500 selection:text-white relative overflow-x-hidden pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]'
        : 'bg-slate-50 text-slate-900 min-h-screen font-sans antialiased selection:bg-indigo-500 selection:text-white relative overflow-x-hidden pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]'
    "
  >

    <!-- Admin Header -->
    <header
      :class="
        darkMode === 'dark'
          ? 'relative z-20 w-full px-3 pt-3 pb-1.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80'
          : 'relative z-20 w-full px-3 pt-3 pb-1.5 bg-white/80 backdrop-blur-md border-b border-slate-200/80'
      "
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button
            @click="activeSection = 'overview'"
            class="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center hover:bg-indigo-500/40 transition-colors cursor-pointer"
          >
            <UIcon name="i-lucide-house" class="w-4 h-4" />
          </button>
          <button
            @click="toggleTheme"
            class="w-8 h-8 rounded-xl border flex items-center justify-center text-xs transition-colors cursor-pointer"
            :class="
              darkMode === 'dark'
                ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
                : 'border-slate-600/30 text-slate-400 hover:bg-slate-600/10'
            "
          >
            <UIcon :name="darkMode === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-4 h-4" />
          </button>
          <div class="flex items-center gap-2 group cursor-pointer">
            <div class="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
            </div>
            <span class="font-black tracking-tight text-sm sm:text-base" :class="darkMode === 'dark' ? 'text-white' : 'text-slate-900'">Admin</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Sections -->
    <main class="px-3 space-y-4">

      <!-- ============ OVERVIEW / DASHBOARD ============ -->
      <section v-if="activeSection === 'overview'" class="space-y-4">

        <!-- Welcome -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-black text-white">Admin Dashboard</h1>
            <p class="text-xs text-slate-400">Society management, member oversight, and system health.</p>
          </div>
        </div>

        <!-- Stat Cards -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl shadow-xl">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-500 uppercase font-bold block">Total Members</span>
                <span class="text-2xl font-black text-white">{{ serverStats?.totalPlayers || 0 }}</span>
              </div>
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
              </div>
            </div>
          </div>
          <div class="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl shadow-xl">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-500 uppercase font-bold block">Active Fixtures</span>
                <span class="text-2xl font-black text-white">{{ competitions.length }}</span>
              </div>
              <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <UIcon name="i-heroicons-trophy" class="w-4 h-4" />
              </div>
            </div>
          </div>
          <div class="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl shadow-xl">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-500 uppercase font-bold block">Courses</span>
                <span class="text-2xl font-black text-white">{{ courses.length }}</span>
              </div>
              <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <UIcon name="i-heroicons-flag" class="w-4 h-4" />
              </div>
            </div>
          </div>
          <div class="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl shadow-xl">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-500 uppercase font-bold block">Prize Pool</span>
                <span class="text-2xl font-black text-white">£{{ (serverStats?.totalPrizePool || 0).toLocaleString() }}</span>
              </div>
              <div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <UIcon name="i-heroicons-credit-card" class="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl shadow-xl space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span class="text-xs font-bold text-white uppercase tracking-wider">Quick Actions</span>
            <span class="text-[10px] text-slate-500">Admin tools</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button @click="activeSection = 'users'" class="flex flex-col items-center gap-1.5 p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-colors cursor-pointer">
              <UIcon name="i-heroicons-user-plus" class="w-5 h-5 text-emerald-400" />
              <span class="text-[10px] font-bold text-slate-300">Manage Members</span>
            </button>
            <button @click="activeSection = 'competitions'" class="flex flex-col items-center gap-1.5 p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer">
              <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-amber-400" />
              <span class="text-[10px] font-bold text-slate-300">Manage Fixtures</span>
            </button>
            <button @click="activeSection = 'courses'" class="flex flex-col items-center gap-1.5 p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer">
              <UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-blue-400" />
              <span class="text-[10px] font-bold text-slate-300">Manage Courses</span>
            </button>
            <button @click="activeSection = 'audit'" class="flex flex-col items-center gap-1.5 p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-purple-500/20 hover:border-purple-500/40 transition-colors cursor-pointer">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-purple-400" />
              <span class="text-[10px] font-bold text-slate-300">Audit Log</span>
            </button>
          </div>
        </div>
      </section>

      <!-- ============ USERS / MEMBERS ============ -->
      <section v-if="activeSection === 'users'" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-black text-white">Member Directory</h1>
            <p class="text-xs text-slate-400">Manage player handicap indexes and membership status.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{{ filteredUsers.length }} Members</span>
            <button @click="showCreateUserModal = true" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer">
              Create User
            </button>
          </div>
        </div>

        <div class="relative">
          <input
            v-model="userSearch"
            type="text"
            placeholder="Search members..."
            class="w-full pl-8 pr-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        </div>

        <div class="space-y-2">
          <div
            v-for="player in filteredUsers"
            :key="player.id"
            class="bg-slate-800/50 border border-slate-700/50 p-2.5 rounded-xl flex items-center justify-between space-y-2"
          >
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                {{ player.name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <span class="text-xs font-bold text-white block truncate">{{ player.name }}</span>
                <span class="text-[9px] text-slate-500 block truncate">@{{ player.username }} • Role: {{ player.role }}</span>
              </div>
            </div>

            <div class="w-full border-t border-slate-700/50 mt-1"></div>

            <div class="flex items-center justify-between mt-1">
              <button
                @click="openManageUserModal(player)"
                class="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 rounded text-[10px] font-bold hover:bg-indigo-500/40 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
              >
                Manage
              </button>
            </div>
          </div>
        </div>

        <div v-if="filteredUsers.length === 0" class="text-center py-6 text-xs text-slate-500">
          No members found.
        </div>
      </section>

      <!-- ============ COMPETITIONS / FIXTURES ============ -->
      <section v-if="activeSection === 'competitions'" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-black text-white">Fixtures & Competitions</h1>
            <p class="text-xs text-slate-400">Schedule, open, close, and manage society tournaments.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">{{ competitions.length }} Fixtures</span>
            <button @click="showCreateCompModal = true" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer">
              Create Fixture
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="comp in competitions"
            :key="comp.id"
            class="bg-slate-800/50 border border-slate-700/50 p-2.5 rounded-xl flex items-center justify-between"
          >
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" :class="comp.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-500 border border-slate-600'">
                <UIcon :name="comp.status === 'OPEN' ? 'i-heroicons-play' : 'i-heroicons-pause'" class="w-3 h-3" />
              </div>
              <div class="min-w-0">
                <span class="text-xs font-bold text-white block truncate">{{ comp.name }}</span>
                <span class="text-[9px] text-slate-500 block truncate">{{ formatUKDate(comp.date) }} • {{ comp.venue || 'Home Course' }}</span>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <UBadge
                :color="comp.status === 'OPEN' ? 'success' : 'neutral'"
                variant="subtle"
                size="xs"
                class="font-bold uppercase tracking-wider px-2 py-0.5"
              >
                {{ comp.status }}
              </UBadge>
              <button
                @click="toggleCompStatus(comp)"
                class="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors px-1.5 py-1 rounded-md hover:bg-indigo-500/10"
              >
                {{ comp.status === 'OPEN' ? 'Close' : 'Open' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="competitions.length === 0" class="text-center py-6 text-xs text-slate-500">
          No fixtures found.
        </div>
      </section>

      <!-- ============ COURSES ============ -->
      <section v-if="activeSection === 'courses'" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-black text-white">Course Directory</h1>
            <p class="text-xs text-slate-400">Manage course pars, stroke indexes, and handicap rules.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">{{ courses.length }} Courses</span>
            <button @click="showCreateCourseModal = true" class="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer">
              Create Course
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="course in courses"
            :key="course.id"
            class="bg-slate-800/50 border border-slate-700/50 p-2.5 rounded-xl flex items-center justify-between"
          >
            <div class="flex items-center gap-2 min-w-0">
              <div class="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                <UIcon name="i-heroicons-flag" class="w-3 h-3" />
              </div>
              <div class="min-w-0">
                <span class="text-xs font-bold text-white block truncate">{{ course.name }}</span>
                <span class="text-[9px] text-slate-500 block truncate">{{ course.location }} • {{ course.numHoles }} Holes</span>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[9px] text-slate-400 block">Par {{ Array.isArray(course.pars) ? course.pars.reduce((a: number, b: number) => a + b, 0) : '?' }}</span>
              <button class="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors px-1.5 py-1 rounded-md hover:bg-indigo-500/10">Edit</button>
            </div>
          </div>
        </div>

        <div v-if="courses.length === 0" class="text-center py-6 text-xs text-slate-500">
          No courses found.
        </div>
      </section>

      <!-- ============ AUDIT LOG ============ -->
      <section v-if="activeSection === 'audit'" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-black text-white">Audit Log</h1>
            <p class="text-xs text-slate-400">Recent administrative actions within this panel.</p>
          </div>
          <span class="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">{{ filteredAuditLog.length }} Events</span>
        </div>

        <!-- Filters -->
        <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3 shadow-xl space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="relative">
              <input
                v-model="auditSearch"
                type="text"
                placeholder="Search actions, targets, details..."
                class="w-full pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              />
              <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
            <select
              v-model="auditActionFilter"
              class="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Actions</option>
              <option v-for="action in auditActionTypes" :key="action" :value="action">{{ action }}</option>
            </select>
          </div>
        </div>

        <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
          <div v-if="filteredAuditLog.length === 0" class="p-4 text-center text-xs text-slate-500">
            No audit events match your filters.
          </div>
          <div v-else class="divide-y divide-slate-700/50">
            <div
              v-for="log in filteredAuditLog"
              :key="log.id"
              class="p-3 flex items-center justify-between bg-slate-800/30 hover:bg-slate-800/60 transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">{{ log.action }}</span>
                <span class="text-xs font-bold text-white truncate block">{{ log.target }}</span>
                <span class="text-[9px] text-slate-500 block">{{ log.details }}</span>
              </div>
              <div class="text-right">
                <span class="text-[9px] font-bold text-slate-400 block">{{ formatUKDate(log.timestamp) }}</span>
                <span class="text-[10px] text-slate-600 block">{{ log.admin }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-2">
          <button
            @click="addAuditLog('VIEW_AUDIT_LOG', 'Admin Panel', 'Opened audit log section')"
            class="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <UIcon name="i-heroicons-arrow-path" class="w-3 h-3" />
            <span>Record View</span>
          </button>
        </div>
      </section>

      <!-- ============ SETTINGS ============ -->
      <section v-if="activeSection === 'settings'" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-black text-white">System Settings</h1>
            <p class="text-xs text-slate-400">Configure society-wide parameters.</p>
          </div>
        </div>

        <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-3 shadow-xl space-y-4">
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Handicap Cut Rate (Band 1: 0–6)</label>
            <input type="number" step="0.1" class="w-full py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Handicap Cut Rate (Band 2: 7–12)</label>
            <input type="number" step="0.1" class="w-full py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Handicap Cut Rate (Band 3: 13–18)</label>
            <input type="number" step="0.1" class="w-full py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Handicap Cut Rate (Band 4: 19–32)</label>
            <input type="number" step="0.1" class="w-full py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="pt-2 border-t border-slate-700/80">
            <button class="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer">
              Save System Settings
            </button>
          </div>
        </div>
      </section>

      <!-- ============ MANAGE USER MODAL ============ -->
      <div v-if="showManageUserModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md" @click.self="showManageUserModal = false">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-4 shadow-2xl">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-white">Manage Member</h3>
            <button @click="showManageUserModal = false" class="text-slate-400 hover:text-white">✕</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Display Name</label>
              <input v-model="editUserName" type="text" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Handicap Index</label>
              <input v-model.number="editUserHcp" type="number" step="0.1" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="showManageUserModal = false" class="flex-1 py-2 bg-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-600 transition-colors cursor-pointer">
              Cancel
            </button>
            <button @click="saveManagedUser" class="flex-1 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <!-- ============ CREATE USER MODAL ============ -->
      <div v-if="showCreateUserModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md" @click.self="showCreateUserModal = false">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-4 shadow-2xl">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-white">Create New User</h3>
            <button @click="showCreateUserModal = false" class="text-slate-400 hover:text-white">✕</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Display Name</label>
              <input v-model="newUserName" type="text" placeholder="Full name" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Username</label>
              <input v-model="newUserUsername" type="text" placeholder="Username (login)" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Temporary Password</label>
              <input v-model="newUserPassword" type="password" placeholder="Temporary password" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="showCreateUserModal = false" class="flex-1 py-2 bg-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-600 transition-colors cursor-pointer">
              Cancel
            </button>
            <button @click="createUser" class="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 transition-all cursor-pointer">
              Create User
            </button>
          </div>
        </div>
      </div>

      <!-- ============ CREATE COMPETITION MODAL ============ -->
      <div v-if="showCreateCompModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md" @click.self="showCreateCompModal = false">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-4 shadow-2xl">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-white">Create New Fixture</h3>
            <button @click="showCreateCompModal = false" class="text-slate-400 hover:text-white">✕</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Competition Name</label>
              <input v-model="newCompName" type="text" placeholder="e.g. Spring Open 2026" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Select Course</label>
              <select v-model="newCompCourseId" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500">
                <option value="">-- Default / Standard Course --</option>
                <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }} ({{ c.location }})</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Date & Tee Time</label>
              <input v-model="newCompDate" type="datetime-local" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">1st Prize (£)</label>
                <input v-model.number="newCompPrize1st" type="number" placeholder="0" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">2nd Prize (£)</label>
                <input v-model.number="newCompPrize2nd" type="number" placeholder="0" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">3rd Prize (£)</label>
                <input v-model.number="newCompPrize3rd" type="number" placeholder="0" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">2's Club Pot (£)</label>
              <input v-model.number="newCompPotAmount" type="number" placeholder="0" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="showCreateCompModal = false" class="flex-1 py-2 bg-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-600 transition-colors cursor-pointer">
              Cancel
            </button>
            <button @click="createCompetition" class="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/25 transition-all cursor-pointer">
              Create Fixture
            </button>
          </div>
        </div>
      </div>

      <!-- ============ CREATE COURSE MODAL ============ -->
      <div v-if="showCreateCourseModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md" @click.self="showCreateCourseModal = false">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-4 shadow-2xl">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-white">Create New Course</h3>
            <button @click="showCreateCourseModal = false" class="text-slate-400 hover:text-white">✕</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Course Name</label>
              <input v-model="newCourseName" type="text" placeholder="e.g. Blackwood Hamilton" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Location</label>
              <input v-model="newCourseLocation" type="text" placeholder="e.g. Bangor" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div class="flex gap-2 mb-2">
              <button @click="handleHoleCountChange(18)" :class="newCourseNumHoles === 18 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-400'" class="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                18 Holes
              </button>
              <button @click="handleHoleCountChange(9)" :class="newCourseNumHoles === 9 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-400'" class="flex-1 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                9 Holes
              </button>
            </div>
            <div class="overflow-x-auto mb-2">
              <table class="w-full text-center text-[10px]">
                <thead>
                  <tr class="text-slate-400 font-bold uppercase border-b border-slate-700">
                    <th class="py-1 text-left">Hole</th>
                    <th v-for="h in newCourseNumHoles" :key="h" class="py-1">{{ h }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-b border-slate-700/60 font-bold text-emerald-400">
                    <td class="py-1 text-left">Par</td>
                    <td v-for="(_, idx) in newCoursePars" :key="idx" class="p-0.5">
                      <input v-model.number="newCoursePars[idx]" type="number" min="3" max="6" class="w-full text-center py-1 bg-slate-900 border border-slate-700 rounded text-white font-bold text-[10px] focus:outline-none focus:border-indigo-500" />
                    </td>
                  </tr>
                  <tr>
                    <td class="py-1 text-left text-slate-400">S.I.</td>
                    <td v-for="(_, idx) in newCourseSI" :key="idx" class="p-0.5">
                      <input v-model.number="newCourseSI[idx]" type="number" min="1" :max="newCourseNumHoles" class="w-full text-center py-1 bg-slate-900 border border-slate-700 rounded text-white font-bold text-[10px] focus:outline-none focus:border-indigo-500" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="showCreateCourseModal = false" class="flex-1 py-2 bg-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-600 transition-colors cursor-pointer">
              Cancel
            </button>
            <button @click="saveNewCourse" class="flex-1 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold shadow-lg shadow-blue-500/25 transition-all cursor-pointer">
              Save Course
            </button>
          </div>
        </div>
      </div>

    </main>

    <!-- Bottom Navigation (Admin-specific) -->
    <nav class="fixed left-0 right-0 bottom-0 z-40 border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-3xl p-2 pt-1.5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
      <div class="flex items-center justify-between text-[10px] leading-none">
        <template v-for="item in navItems" :key="item.key">
          <button
            @click="activeSection = item.key as typeof activeSection"
            :class="[
              activeSection === item.key
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            ] + ' flex flex-col items-center justify-center gap-0.5 min-w-0 p-1.5 rounded-xl transition-colors'"
          >
            <UIcon :name="item.icon" class="w-4 h-4" />
            <span class="font-bold leading-tight">{{ item.label }}</span>
          </button>
        </template>
      </div>
    </nav>
  </div>
</template>

<style scoped>
</style>