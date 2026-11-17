<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { USER_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, isAdminRole, type UserRole } from '@/utils/roles'

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

// ---------- SITE-WIDE SETTINGS (persists to localStorage) ----------
const SETTINGS_STORAGE_KEY = 'site_wide_settings'
const isClient = typeof window !== 'undefined'
const loadSiteSettings = () => {
  try {
    const raw = isClient ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : {
      allowNonAdminCourseCreation: false,
      enablePrizePool: true
    }
  } catch {
    return {
      allowNonAdminCourseCreation: false,
      enablePrizePool: true
    }
  }
}

const siteSettings = ref(loadSiteSettings())
const settingsSavedMessage = ref('')

const saveSiteSettings = () => {
  try {
    if (isClient) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(siteSettings.value))
    }
    settingsSavedMessage.value = 'SITE SETTINGS APPLIED SUCCESSFULLY'
    addAuditLog('UPDATE_SITE_SETTINGS', 'Global Configuration', `Allow Non-Admin Courses: ${siteSettings.value.allowNonAdminCourseCreation}, Prize Pools Enabled: ${siteSettings.value.enablePrizePool}`)
    setTimeout(() => {
      settingsSavedMessage.value = ''
    }, 3500)
  } catch (err) {
    alert('Failed to save site settings.')
  }
}

// ---------- AUDIT LOG (client-side, persists to localStorage) ----------
const AUDIT_STORAGE_KEY = 'admin_audit_log'
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
const editUserRole = ref<UserRole>(USER_ROLES.MEMBER)

const openManageUserModal = (player: any) => {
  editingUser.value = player
  editUserName.value = player.name || ''
  editUserHcp.value = Number(player.handicapIndex || 0)
  editUserRole.value = player.role || USER_ROLES.MEMBER
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
        active: editingUser.value.active ? 1 : 0,
        role: editUserRole.value
      }
    })
    await refreshPlayers()
    showManageUserModal.value = false
    addAuditLog('UPDATE_USER', editUserName.value, `Role: ${editUserRole.value}, HCP: ${editUserHcp.value}`)
  } catch (err) {
    alert('Failed to update user')
  }
}

// ---------- CREATE USER MODAL ----------
const showCreateUserModal = ref(false)
const newUserName = ref('')
const newUserUsername = ref('')
const newUserPassword = ref('')
const newUserRole = ref<UserRole>(USER_ROLES.MEMBER)

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
        handicapIndex: 18.0,
        role: newUserRole.value
      }
    })
    await refreshPlayers()
    showCreateUserModal.value = false
    newUserName.value = ''
    newUserUsername.value = ''
    newUserPassword.value = ''
    newUserRole.value = USER_ROLES.MEMBER
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
const newCourseLatitude = ref('')
const newCourseLongitude = ref('')

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
    strokeIndexes: newCourseSI.value,
    latitude: Number(newCourseLatitude.value) || null,
    longitude: Number(newCourseLongitude.value) || null
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
  { key: 'overview', label: 'Dashboard', icon: 'i-heroicons-chart-bar' },
  { key: 'users', label: 'Members', icon: 'i-heroicons-user-group' },
  { key: 'competitions', label: 'Fixtures', icon: 'i-heroicons-trophy' },
  { key: 'courses', label: 'Courses', icon: 'i-heroicons-flag' },
  { key: 'audit', label: 'Audit Log', icon: 'i-heroicons-document-text' },
  { key: 'settings', label: 'Settings', icon: 'i-heroicons-cog-6-tooth' }
]
</script>

<template>
  <div
    :class="
      darkMode === 'dark'
        ? 'bg-[#0B0D10] text-zinc-100 min-h-screen font-sans antialiased selection:bg-orange-500/30 selection:text-orange-200 relative overflow-x-hidden pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]'
        : 'bg-zinc-100 text-zinc-900 min-h-screen font-sans antialiased selection:bg-orange-500/30 selection:text-orange-200 relative overflow-x-hidden pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]'
    "
  >
    <!-- Background Architectural Dot Matrix -->
    <div 
      class="pointer-events-none fixed inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_90%_60%_at_50%_0%,#000_65%,transparent_100%)] opacity-40 z-0"
    />

    <!-- Admin Header -->
    <header
      :class="
        darkMode === 'dark'
          ? 'relative z-20 w-full px-4 py-2.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 font-mono'
          : 'relative z-20 w-full px-4 py-2.5 bg-white/90 backdrop-blur-md border-b border-zinc-200 font-mono'
      "
    >
      <div class="max-w-3xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            @click="activeSection = 'overview'"
            class="w-7 h-7 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 flex items-center justify-center hover:border-orange-500 transition-colors cursor-pointer"
            aria-label="Home"
          >
            <UIcon name="i-lucide-house" class="w-3.5 h-3.5" />
          </button>
          <button
            @click="toggleTheme"
            class="w-7 h-7 rounded-sm border border-zinc-700 bg-zinc-900 flex items-center justify-center text-xs transition-colors cursor-pointer text-orange-400 hover:border-orange-500"
            aria-label="Toggle Theme"
          >
            <UIcon :name="darkMode === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-3.5 h-3.5" />
          </button>
        </div>
        <span class="text-[11px] text-orange-400">SECURE_ROOT</span>
      </div>
    </header>

    <!-- Main Sections Container -->
    <main class="relative z-10 max-w-3xl mx-auto px-4 py-6 space-y-6">

      <!-- ============ OVERVIEW / DASHBOARD ============ -->
      <section v-if="activeSection === 'overview'" class="space-y-6">

        <div class="space-y-1">
          <div class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">// SYSTEM STATUS</div>
          <h1 class="text-2xl font-bold tracking-tight text-zinc-100 font-sans">Admin Dashboard</h1>
          <p class="text-xs text-zinc-400 font-sans">Society infrastructure oversight, member telemetry, and audit logs.</p>
        </div>

        <!-- Stat Cards Matrix -->
        <div class="grid grid-cols-2 gap-3 font-mono">
          <div class="border border-zinc-800 bg-zinc-950 p-4 rounded-sm shadow-xl space-y-1">
            <span class="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Members</span>
            <div class="text-2xl font-bold text-zinc-100">{{ serverStats?.totalPlayers || 0 }}</div>
          </div>
          <div class="border border-zinc-800 bg-zinc-950 p-4 rounded-sm shadow-xl space-y-1">
            <span class="text-[10px] text-zinc-500 uppercase tracking-wider block">Active Fixtures</span>
            <div class="text-2xl font-bold text-orange-400">{{ competitions.length }}</div>
          </div>
          <div class="border border-zinc-800 bg-zinc-950 p-4 rounded-sm shadow-xl space-y-1">
            <span class="text-[10px] text-zinc-500 uppercase tracking-wider block">Courses Logged</span>
            <div class="text-2xl font-bold text-zinc-100">{{ courses.length }}</div>
          </div>
          <div class="border border-zinc-800 bg-zinc-950 p-4 rounded-sm shadow-xl space-y-1">
            <span class="text-[10px] text-zinc-500 uppercase tracking-wider block">Total Prize Pool</span>
            <div class="text-2xl font-bold text-emerald-400">£{{ (serverStats?.totalPrizePool || 0).toLocaleString() }}</div>
          </div>
        </div>

        <!-- Quick Actions Matrix -->
        <div class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-xl font-mono">
          <div class="px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-300">
            <span>Quick Actions</span>
            <span class="text-[9px] text-orange-400">// SHORTCUTS</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 divide-x sm:divide-x-y-0 divide-y sm:divide-y-0 divide-zinc-800/80 bg-zinc-900/20">
            
            <!-- Manage Members -->
            <button @click="activeSection = 'users'" class="p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-zinc-900 transition-all cursor-pointer text-center group">
              <div class="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400 group-hover:border-orange-500/50 group-hover:scale-105 transition-all">
                <UIcon name="i-heroicons-user-plus" class="w-4 h-4" />
              </div>
              <span class="text-[10px] font-bold text-zinc-200 group-hover:text-orange-400 transition-colors uppercase tracking-wider">Members</span>
            </button>

            <!-- Manage Fixtures -->
            <button @click="activeSection = 'competitions'" class="p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-zinc-900 transition-all cursor-pointer text-center group">
              <div class="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400 group-hover:border-orange-500/50 group-hover:scale-105 transition-all">
                <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
              </div>
              <span class="text-[10px] font-bold text-zinc-200 group-hover:text-orange-400 transition-colors uppercase tracking-wider">Fixtures</span>
            </button>

            <!-- Manage Courses -->
            <button @click="activeSection = 'courses'" class="p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-zinc-900 transition-all cursor-pointer text-center group">
              <div class="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400 group-hover:border-orange-500/50 group-hover:scale-105 transition-all">
                <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
              </div>
              <span class="text-[10px] font-bold text-zinc-200 group-hover:text-orange-400 transition-colors uppercase tracking-wider">Courses</span>
            </button>

            <!-- Audit Log -->
            <button @click="activeSection = 'audit'" class="p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-zinc-900 transition-all cursor-pointer text-center group">
              <div class="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400 group-hover:border-orange-500/50 group-hover:scale-105 transition-all">
                <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
              </div>
              <span class="text-[10px] font-bold text-zinc-200 group-hover:text-orange-400 transition-colors uppercase tracking-wider">Audit Log</span>
            </button>

            <!-- Site Settings -->
            <button @click="activeSection = 'settings'" class="p-3.5 flex flex-col items-center justify-center gap-2 hover:bg-zinc-900 transition-all cursor-pointer text-center group col-span-2 sm:col-span-1">
              <div class="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400 group-hover:border-orange-500/50 group-hover:scale-105 transition-all">
                <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
              </div>
              <span class="text-[10px] font-bold text-zinc-200 group-hover:text-orange-400 transition-colors uppercase tracking-wider">Settings</span>
            </button>

          </div>
        </div>
      </section>

      <!-- ============ USERS / MEMBERS ============ -->
      <section v-if="activeSection === 'users'" class="space-y-4">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">// DIRECTORY</div>
            <h1 class="text-xl font-bold tracking-tight text-zinc-100 font-sans">Member Oversight</h1>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-1 rounded-sm">
              {{ filteredUsers.length }} REGISTERED
            </span>
            <button @click="showCreateUserModal = true" class="px-3 py-1.5 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold font-mono text-xs rounded-sm shadow-md transition-colors cursor-pointer">
              + NEW USER
            </button>
          </div>
        </div>

        <div class="relative">
          <input
            v-model="userSearch"
            type="text"
            placeholder="Search member names or usernames..."
            class="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-sm text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
        </div>

        <div class="border border-zinc-800 divide-y divide-zinc-800 bg-zinc-950 rounded-sm overflow-hidden font-mono">
          <div
            v-for="player in filteredUsers"
            :key="player.id"
            class="p-3 flex items-center justify-between hover:bg-zinc-900/60 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-7 h-7 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 font-bold text-xs flex items-center justify-center shrink-0">
                {{ player.name.charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <span class="text-xs font-semibold text-zinc-100 block truncate font-sans">{{ player.name }}</span>
                <span class="text-[10px] text-zinc-500 block truncate">@{{ player.username }} • HCP: {{ player.handicapIndex }}</span>
                <span
                  class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm"
                  :class="
                    player.role === USER_ROLES.SITE_ADMIN
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : player.role === USER_ROLES.DEVELOPER
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                        : player.role === USER_ROLES.UNION_ADMIN
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'"
                >
                  {{ ROLE_LABELS[player.role as keyof typeof ROLE_LABELS] || player.role }}
                </span>
              </div>
            </div>

            <button
              @click="openManageUserModal(player)"
              class="px-2.5 py-1 bg-zinc-900 border border-zinc-700 text-orange-400 hover:border-orange-500 rounded-sm text-[10px] font-bold transition-colors cursor-pointer shrink-0"
            >
              CONFIGURE
            </button>
          </div>
        </div>

        <div v-if="filteredUsers.length === 0" class="text-center py-8 font-mono text-xs text-zinc-500">
          NO_MEMBERS_MATCHING_CRITERIA
        </div>
      </section>

      <!-- ============ COMPETITIONS / FIXTURES ============ -->
      <section v-if="activeSection === 'competitions'" class="space-y-4">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">// TOURNAMENTS</div>
            <h1 class="text-xl font-bold tracking-tight text-zinc-100 font-sans">Fixture Management</h1>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-1 rounded-sm">
              {{ competitions.length }} FIXTURES
            </span>
            <button @click="showCreateCompModal = true" class="px-3 py-1.5 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold font-mono text-xs rounded-sm shadow-md transition-colors cursor-pointer">
              + NEW FIXTURE
            </button>
          </div>
        </div>

        <div class="border border-zinc-800 divide-y divide-zinc-800 bg-zinc-950 rounded-sm overflow-hidden font-mono">
          <div
            v-for="comp in competitions"
            :key="comp.id"
            class="p-3.5 flex items-center justify-between hover:bg-zinc-900/60 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-7 h-7 rounded-sm border flex items-center justify-center shrink-0" :class="comp.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900 text-zinc-500 border-zinc-700'">
                <UIcon :name="comp.status === 'OPEN' ? 'i-heroicons-play' : 'i-heroicons-pause'" class="w-3.5 h-3.5" />
              </div>
              <div class="min-w-0">
                <span class="text-xs font-bold text-zinc-100 block truncate font-sans">{{ comp.name }}</span>
                <span class="text-[10px] text-zinc-500 block truncate">{{ formatUKDate(comp.date) }} • {{ comp.venue || 'Home Course' }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <span
                :class="comp.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-900 text-zinc-400 border-zinc-700'"
                class="px-2 py-0.5 border text-[9px] font-bold rounded-sm uppercase"
              >
                {{ comp.status }}
              </span>
              <button
                @click="toggleCompStatus(comp)"
                class="px-2 py-1 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white rounded-sm text-[10px] font-bold transition-colors cursor-pointer"
              >
                {{ comp.status === 'OPEN' ? 'CLOSE' : 'OPEN' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="competitions.length === 0" class="text-center py-8 font-mono text-xs text-zinc-500">
          NO_SCHEDULED_FIXTURES
        </div>
      </section>

      <!-- ============ COURSES ============ -->
      <section v-if="activeSection === 'courses'" class="space-y-4">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">// VENUES</div>
            <h1 class="text-xl font-bold tracking-tight text-zinc-100 font-sans">Course Directory</h1>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-1 rounded-sm">
              {{ courses.length }} COURSES
            </span>
            <button @click="showCreateCourseModal = true" class="px-3 py-1.5 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold font-mono text-xs rounded-sm shadow-md transition-colors cursor-pointer">
              + NEW COURSE
            </button>
          </div>
        </div>

        <div class="border border-zinc-800 divide-y divide-zinc-800 bg-zinc-950 rounded-sm overflow-hidden font-mono">
          <div
            v-for="course in courses"
            :key="course.id"
            class="p-3.5 flex items-center justify-between hover:bg-zinc-900/60 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-7 h-7 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 flex items-center justify-center shrink-0">
                <UIcon name="i-heroicons-flag" class="w-3.5 h-3.5" />
              </div>
              <div class="min-w-0">
                <span class="text-xs font-bold text-zinc-100 block truncate font-sans">{{ course.name }}</span>
                <span class="text-[10px] text-zinc-500 block truncate">{{ course.location }} • {{ course.numHoles }} Holes</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="text-[10px] text-orange-400 block font-bold">Par {{ Array.isArray(course.pars) ? course.pars.reduce((a: number, b: number) => a + b, 0) : '?' }}</span>
            </div>
          </div>
        </div>

        <div v-if="courses.length === 0" class="text-center py-8 font-mono text-xs text-zinc-500">
          NO_COURSES_CONFIGURED
        </div>
      </section>

      <!-- ============ AUDIT LOG ============ -->
      <section v-if="activeSection === 'audit'" class="space-y-4">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">// TELEMETRY</div>
            <h1 class="text-xl font-bold tracking-tight text-zinc-100 font-sans">Audit Trail</h1>
          </div>
          <span class="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-1 rounded-sm">
            {{ filteredAuditLog.length }} EVENTS
          </span>
        </div>

        <!-- Audit Filters -->
        <div class="border border-zinc-800 bg-zinc-950 p-3 rounded-sm space-y-3 font-mono">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="relative">
              <input
                v-model="auditSearch"
                type="text"
                placeholder="Search action logs..."
                class="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            </div>
            <select
              v-model="auditActionFilter"
              class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-xs text-zinc-100 focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="all">All Action Types</option>
              <option v-for="action in auditActionTypes" :key="action" :value="action">{{ action }}</option>
            </select>
          </div>
        </div>

        <div class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden font-mono">
          <div v-if="filteredAuditLog.length === 0" class="p-6 text-center text-xs text-zinc-500">
            NO_AUDIT_LOG_MATCHES
          </div>
          <div v-else class="divide-y divide-zinc-800">
            <div
              v-for="log in filteredAuditLog"
              :key="log.id"
              class="p-3 flex items-center justify-between hover:bg-zinc-900/60 transition-colors"
            >
              <div class="min-w-0 space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold text-orange-400 uppercase tracking-wider">{{ log.action }}</span>
                  <span class="text-xs font-semibold text-zinc-200 truncate">{{ log.target }}</span>
                </div>
                <p class="text-[10px] text-zinc-500 truncate">{{ log.details }}</p>
              </div>
              <div class="text-right shrink-0 pl-3">
                <span class="text-[10px] text-zinc-400 block font-bold">{{ formatUKDate(log.timestamp) }}</span>
                <span class="text-[9px] text-zinc-600 block">{{ log.admin }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ SETTINGS (SITE-WIDE CONFIGURATION) ============ -->
      <section v-if="activeSection === 'settings'" class="space-y-4">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <div class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">// GLOBAL CONTROLS</div>
            <h1 class="text-xl font-bold tracking-tight text-zinc-100 font-sans">Site-Wide Infrastructure Settings</h1>
          </div>
        </div>

        <div class="border border-zinc-800 bg-zinc-950 p-5 rounded-sm space-y-5 font-mono">
          
          <div v-if="settingsSavedMessage" class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-sm">
            ✓ {{ settingsSavedMessage }}
          </div>

          <!-- Setting 1: Non-Admin Course Creation -->
          <div class="flex items-center justify-between gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-sm">
            <div class="space-y-0.5 min-w-0">
              <span class="text-xs font-bold text-zinc-100 block font-sans">Restrict Course Creation to Admins</span>
              <p class="text-[11px] text-zinc-400 font-sans">When enabled, only administrators can register new golf course venues.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" v-model="siteSettings.allowNonAdminCourseCreation" class="sr-only peer">
              <div class="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-sm peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-sm after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F6821F]"></div>
            </label>
          </div>

          <!-- Setting 2: Competition Prize Pools -->
          <div class="flex items-center justify-between gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-sm">
            <div class="space-y-0.5 min-w-0">
              <span class="text-xs font-bold text-zinc-100 block font-sans">Enable Competition Prize Pools & 2's Pots</span>
              <p class="text-[11px] text-zinc-400 font-sans">Allow setting monetary prizes and pots when scheduling fixtures.</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" v-model="siteSettings.enablePrizePool" class="sr-only peer">
              <div class="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-sm peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-sm after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F6821F]"></div>
            </label>
          </div>

          <!-- Handicap Cut Rates Parameters -->
          <div class="space-y-3 pt-3 border-t border-zinc-800">
            <div class="text-[10px] uppercase tracking-wider text-orange-400">// HANDICAP CUT MULTIPLIERS</div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="space-y-1">
                <label class="text-[9px] uppercase tracking-wider text-zinc-400 block">Band 1 (0–6)</label>
                <input type="number" step="0.1" value="0.3" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
              </div>
              <div class="space-y-1">
                <label class="text-[9px] uppercase tracking-wider text-zinc-400 block">Band 2 (7–12)</label>
                <input type="number" step="0.1" value="0.4" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
              </div>
              <div class="space-y-1">
                <label class="text-[9px] uppercase tracking-wider text-zinc-400 block">Band 3 (13–18)</label>
                <input type="number" step="0.1" value="0.5" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
              </div>
            </div>
          </div>

          <div class="pt-2">
            <button @click="saveSiteSettings" class="w-full py-2.5 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-md">
              Save Site Settings
            </button>
          </div>
        </div>
      </section>

      <!-- ============ MANAGE USER MODAL ============ -->
      <div v-if="showManageUserModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" @click.self="showManageUserModal = false">
        <div class="border border-zinc-800 bg-zinc-950 w-full max-w-md rounded-sm p-5 shadow-2xl font-mono space-y-4">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-100">Configure Member Profile</h3>
            <button @click="showManageUserModal = false" class="text-zinc-400 hover:text-white text-xs cursor-pointer">✕</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Display Name</label>
              <input v-model="editUserName" type="text" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Handicap Index</label>
              <input v-model.number="editUserHcp" type="number" step="0.1" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500 font-bold" />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Role</label>
              <select v-model="editUserRole" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500">
                <option v-for="(label, key) in ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
              <p class="text-[9px] text-zinc-500 mt-1">{{ ROLE_DESCRIPTIONS[editUserRole as keyof typeof ROLE_DESCRIPTIONS] || '' }}</p>
            </div>
          </div>
          <div class="flex gap-2 pt-2 border-t border-zinc-800">
            <button @click="showManageUserModal = false" class="flex-1 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-sm font-bold text-xs hover:bg-zinc-800 transition-colors cursor-pointer">
              Cancel
            </button>
            <button @click="saveManagedUser" class="flex-1 py-2 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold text-xs rounded-sm transition-colors cursor-pointer">
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <!-- ============ CREATE USER MODAL ============ -->
      <div v-if="showCreateUserModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" @click.self="showCreateUserModal = false">
        <div class="border border-zinc-800 bg-zinc-950 w-full max-w-md rounded-sm p-5 shadow-2xl font-mono space-y-4">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-100">Provision New Member</h3>
            <button @click="showCreateUserModal = false" class="text-zinc-400 hover:text-white text-xs cursor-pointer">✕</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Full Name</label>
              <input v-model="newUserName" type="text" placeholder="e.g. John Doe" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Username</label>
              <input v-model="newUserUsername" type="text" placeholder="username" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Password</label>
              <input v-model="newUserPassword" type="password" placeholder="••••••••" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Role</label>
              <select v-model="newUserRole" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500">
                <option v-for="(label, key) in ROLE_LABELS" :key="key" :value="key">{{ label }}</option>
              </select>
              <p class="text-[9px] text-zinc-500 mt-1">{{ ROLE_DESCRIPTIONS[newUserRole as keyof typeof ROLE_DESCRIPTIONS] || '' }}</p>
            </div>
          </div>
          <div class="flex gap-2 pt-2 border-t border-zinc-800">
            <button @click="showCreateUserModal = false" class="flex-1 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-sm font-bold text-xs hover:bg-zinc-800 transition-colors cursor-pointer">
              Cancel
            </button>
            <button @click="createUser" class="flex-1 py-2 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold text-xs rounded-sm transition-colors cursor-pointer">
              Create
            </button>
          </div>
        </div>
      </div>

      <!-- ============ CREATE COMPETITION MODAL ============ -->
      <div v-if="showCreateCompModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" @click.self="showCreateCompModal = false">
        <div class="border border-zinc-800 bg-zinc-950 w-full max-w-md rounded-sm p-5 shadow-2xl font-mono space-y-4">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-100">Schedule New Fixture</h3>
            <button @click="showCreateCompModal = false" class="text-zinc-400 hover:text-white text-xs cursor-pointer">✕</button>
          </div>
          <div class="space-y-3">
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Competition Title</label>
              <input v-model="newCompName" type="text" placeholder="e.g. Spring Championship" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Select Venue Course</label>
              <select v-model="newCompCourseId" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500">
                <option value="">-- Standard Venue --</option>
                <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }} ({{ c.location }})</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Date & Tee Time</label>
              <input v-model="newCompDate" type="datetime-local" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
            </div>
            
            <!-- Conditional Prize Pool Fields based on Site Settings -->
            <template v-if="siteSettings.enablePrizePool">
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">1st (£)</label>
                  <input v-model.number="newCompPrize1st" type="number" placeholder="0" class="w-full px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label class="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">2nd (£)</label>
                  <input v-model.number="newCompPrize2nd" type="number" placeholder="0" class="w-full px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label class="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">3rd (£)</label>
                  <input v-model.number="newCompPrize3rd" type="number" placeholder="0" class="w-full px-2 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">2's Club Pot (£)</label>
                <input v-model.number="newCompPotAmount" type="number" placeholder="0" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
              </div>
            </template>
          </div>
          <div class="flex gap-2 pt-2 border-t border-zinc-800">
            <button @click="showCreateCompModal = false" class="flex-1 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-sm font-bold text-xs hover:bg-zinc-800 transition-colors cursor-pointer">
              Cancel
            </button>
            <button @click="createCompetition" class="flex-1 py-2 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold text-xs rounded-sm transition-colors cursor-pointer">
              Schedule
            </button>
          </div>
        </div>
      </div>

      <!-- ============ CREATE COURSE MODAL ============ -->
      <div v-if="showCreateCourseModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" @click.self="showCreateCourseModal = false">
        <div class="border border-zinc-800 bg-zinc-950 w-full max-w-xl rounded-sm p-5 shadow-2xl font-mono space-y-4 max-h-[90vh] overflow-y-auto">
          
          <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <div class="text-[10px] text-orange-400 uppercase tracking-widest">// VENUE PROVISIONING</div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-100 mt-0.5">Configure New Course</h3>
            </div>
            <button @click="showCreateCourseModal = false" class="w-6 h-6 flex items-center justify-center rounded-sm border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white text-xs cursor-pointer">✕</button>
          </div>

          <div class="space-y-4">
            <!-- General Info -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Course Name</label>
                <input v-model="newCourseName" type="text" placeholder="e.g. Royal Links" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500 font-sans" />
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-wider text-zinc-400 block mb-1">Location / Town</label>
                <input v-model="newCourseLocation" type="text" placeholder="e.g. St Andrews" class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500 font-sans" />
              </div>
            </div>

            <!-- Weather Geolocation Coordinates -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded-sm">
              <div>
                <label class="text-[10px] uppercase tracking-wider text-sky-400 block mb-1">Latitude (Weather)</label>
                <input v-model="newCourseLatitude" type="number" step="any" placeholder="e.g. 55.2044" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label class="text-[10px] uppercase tracking-wider text-sky-400 block mb-1">Longitude (Weather)</label>
                <input v-model="newCourseLongitude" type="number" step="any" placeholder="e.g. -6.6533" class="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-sm text-zinc-100 text-xs focus:outline-none focus:border-orange-500" />
              </div>
            </div>

            <!-- Hole Count Selector -->
            <div class="space-y-1.5">
              <label class="text-[10px] uppercase tracking-wider text-zinc-400 block">Course Layout</label>
              <div class="flex gap-2">
                <button @click="handleHoleCountChange(18)" type="button" :class="newCourseNumHoles === 18 ? 'bg-[#F6821F] text-zinc-950 font-bold border-[#F6821F]' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-100'" class="flex-1 py-2 rounded-sm text-xs cursor-pointer transition-colors uppercase tracking-wider">
                  18 Holes
                </button>
                <button @click="handleHoleCountChange(9)" type="button" :class="newCourseNumHoles === 9 ? 'bg-[#F6821F] text-zinc-950 font-bold border-[#F6821F]' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-100'" class="flex-1 py-2 rounded-sm text-xs cursor-pointer transition-colors uppercase tracking-wider">
                  9 Holes
                </button>
              </div>
            </div>

            <!-- Hole Breakdown List / Grid (Clean & Readable) -->
            <div class="space-y-2 pt-2 border-t border-zinc-800">
              <div class="flex items-center justify-between">
                <span class="text-[10px] uppercase tracking-wider text-orange-400">// HOLE BREAKDOWN (PAR & S.I.)</span>
                <span class="text-[10px] text-zinc-500">Configure parameters per hole</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                <div
                  v-for="(_, idx) in newCourseNumHoles"
                  :key="idx"
                  class="border border-zinc-800 bg-zinc-900/40 rounded-sm p-2.5 space-y-1.5"
                >
                  <div class="flex items-center justify-between text-xs font-bold text-zinc-300">
                    <span>HOLE {{ String(idx + 1).padStart(2, '0') }}</span>
                    <span class="text-[10px] text-orange-400 font-mono">Par {{ newCoursePars[idx] }} • SI {{ newCourseSI[idx] }}</span>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-[9px] uppercase tracking-wider text-zinc-500 block mb-0.5">Par</label>
                      <input
                        v-model.number="newCoursePars[idx]"
                        type="number"
                        min="3"
                        max="6"
                        class="w-full text-center py-1.5 bg-zinc-950 border border-zinc-800 rounded-sm text-white font-bold text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label class="text-[9px] uppercase tracking-wider text-zinc-500 block mb-0.5">Stroke Index</label>
                      <input
                        v-model.number="newCourseSI[idx]"
                        type="number"
                        min="1"
                        :max="newCourseNumHoles"
                        class="w-full text-center py-1.5 bg-zinc-950 border border-zinc-800 rounded-sm text-zinc-300 font-bold text-xs focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Action Buttons -->
          <div class="flex gap-2 pt-3 border-t border-zinc-800">
            <button @click="showCreateCourseModal = false" type="button" class="flex-1 py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-sm font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 transition-colors cursor-pointer">
              Cancel
            </button>
            <button @click="saveNewCourse" type="button" class="flex-1 py-2.5 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-sm transition-colors cursor-pointer shadow-md">
              Save Course
            </button>
          </div>

        </div>
      </div>

    </main>

    <!-- Bottom Navigation (Cloudflare Status Bar Style) -->
    <nav class="fixed left-0 right-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-3xl px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl font-mono">
      <div class="max-w-md mx-auto flex items-center justify-between text-[10px] tracking-wider uppercase">
        <template v-for="item in navItems" :key="item.key">
          <button
            @click="activeSection = item.key as typeof activeSection"
            class="group relative flex flex-col items-center justify-center gap-1.5 py-1 px-2 transition-colors flex-1 cursor-pointer"
            :class="activeSection === item.key ? 'text-orange-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'"
          >
            <!-- Active top indicator line -->
            <span
              v-if="activeSection === item.key"
              class="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-orange-500 shadow-[0_0_8px_rgba(246,130,31,0.5)]"
            ></span>

            <div class="relative flex h-5 w-5 items-center justify-center">
              <UIcon
                :name="item.icon"
                class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110"
                :class="activeSection === item.key ? 'text-orange-400' : 'text-zinc-500 group-hover:text-zinc-300'"
              />
            </div>

            <span class="leading-none text-[9px] truncate">{{ item.label }}</span>
          </button>
        </template>
      </div>
    </nav>
  </div>
</template>

<style scoped>
</style>