<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const { data: userRes, error: userError } = await useFetch('/api/auth/me', {
  ignoreResponseError: true
})

const isLoggedIn = computed(() => !!userRes.value?.success && !!userRes.value?.data)

if (userError.value || !isLoggedIn.value) {
  await navigateTo('/login')
}

const { data: compRes } = await useFetch('/api/competitions')
const competitions = computed(() => compRes.value?.data || [])

// Weather per competition course
const compWeather = ref<Record<string, any>>({})
const compWeatherLoading = ref<Record<string, boolean>>({})
const courseMap = ref<Record<string, any>>({})

// Fetch all courses once to build a lookup map
const fetchAllCourses = async () => {
  try {
    const coursesRes: any = await $fetch('/api/courses')
    if (coursesRes?.courses) {
      coursesRes.courses.forEach((c: any) => {
        courseMap.value[c.id] = c
      })
    }
  } catch (e) {
    console.error('Failed to fetch courses for weather', e)
  }
}

const fetchCompWeather = async (comp: any) => {
  if (!comp.courseId) return
  const course = courseMap.value[comp.courseId]
  if (!course?.latitude || !course?.longitude) return
  try {
    compWeatherLoading.value[comp.courseId] = true
    const weatherRes: any = await $fetch('/api/weather', {
      query: { latitude: course.latitude, longitude: course.longitude }
    })
    compWeather.value[comp.courseId] = weatherRes?.data || null
  } catch (e) {
    console.error('Weather fetch failed for competition course', comp.courseId, e)
  } finally {
    compWeatherLoading.value[comp.courseId] = false
  }
}

// Fetch weather for all competitions on load
onMounted(async () => {
  await fetchAllCourses()
  competitions.value.forEach((comp: any) => {
    if (comp.courseId) {
      fetchCompWeather(comp)
    }
  })
})

const activeTab = ref<'open' | 'closed'>('open')
const search = ref('')

const filteredCompetitions = computed(() => {
  const query = search.value.toLowerCase().trim()
  return competitions.value.filter((c: any) => {
    const isClosed = c.status === 'CLOSED'
    const matchesTab = activeTab.value === 'closed' ? isClosed : !isClosed
    const matchesSearch = !query ||
      c.name?.toLowerCase().includes(query) ||
      c.venue?.toLowerCase().includes(query)
    return matchesTab && matchesSearch
  })
})

const openCount = computed(() => competitions.value.filter((c: any) => c.status !== 'CLOSED').length)
const closedCount = computed(() => competitions.value.filter((c: any) => c.status === 'CLOSED').length)

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

const isLiveToday = (dateString: string) => {
  if (!dateString) return false
  const today = new Date().toISOString().split('T')[0]
  const compDay = new Date(dateString).toISOString().split('T')[0]
  return today >= compDay
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Page Header Console -->
    <section class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl font-mono">
      <div class="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          <span class="text-zinc-200 font-bold uppercase tracking-wider">TOURNAMENT_DIRECTORY</span>
        </div>
        <span class="text-orange-400">ACTIVE_LOBBIES</span>
      </div>

      <div class="p-4 sm:p-5 space-y-4 font-sans">
        <div class="space-y-1">
          <div class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">// SOCIETY FIXTURES</div>
          <h1 class="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">Society Competitions</h1>
          <p class="text-xs text-zinc-400 leading-relaxed">
            Browse upcoming fixtures, access match lobbies, submit digital scorecards, and audit historical results.
          </p>
        </div>

        <!-- Search Bar -->
        <div class="relative font-mono">
          <input
            v-model="search"
            type="text"
            placeholder="Query fixtures or venues..."
            class="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-sm text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <!-- Navigation Tabs Matrix -->
        <div class="grid grid-cols-2 gap-2 pt-1 font-mono">
          <button
            @click="activeTab = 'open'"
            type="button"
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border"
            :class="activeTab === 'open' ? 'bg-[#F6821F] border-[#F6821F] text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'"
          >
            <UIcon name="i-heroicons-trophy" class="w-4 h-4" />
            <span>Open</span>
            <span class="px-1.5 py-0.5 bg-zinc-950 text-orange-400 text-[10px] rounded-sm font-bold">{{ openCount }}</span>
          </button>
          <button
            @click="activeTab = 'closed'"
            type="button"
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border"
            :class="activeTab === 'closed' ? 'bg-zinc-800 border-zinc-600 text-zinc-100' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'"
          >
            <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
            <span>Archived</span>
            <span class="px-1.5 py-0.5 bg-zinc-950 text-zinc-300 text-[10px] rounded-sm font-bold">{{ closedCount }}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Competitions List Grid -->
    <section class="space-y-3">
      <div v-if="filteredCompetitions.length === 0" class="border border-zinc-800 bg-zinc-950 p-8 rounded-sm text-center font-mono space-y-2">
        <div class="text-xs font-bold text-zinc-300 uppercase">NO_{{ activeTab === 'open' ? 'ACTIVE' : 'ARCHIVED' }}_COMPETITIONS</div>
        <p class="text-[11px] text-zinc-500">There are no tournaments matching your current criteria.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="comp in filteredCompetitions"
          :key="comp.id"
          class="group relative border border-zinc-800 bg-zinc-950 hover:border-zinc-700 p-4 rounded-sm transition-colors flex flex-col justify-between space-y-4"
        >
          <!-- Hover Accent Bar -->
          <div class="absolute top-0 left-0 w-full h-[2px] bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

          <div class="space-y-3">
            <!-- Status & Title -->
            <div class="flex items-start justify-between gap-2">
              <span
                v-if="comp.status === 'CLOSED'"
                class="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-400 text-[9px] font-mono font-bold rounded-sm uppercase tracking-wider"
              >
                LOCKED // FINALIZED
              </span>
              <span
                v-else-if="isLiveToday(comp.date)"
                class="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold rounded-sm uppercase tracking-wider animate-pulse"
              >
                ● LIVE TODAY
              </span>
              <span v-else class="px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[9px] font-mono font-bold rounded-sm uppercase tracking-wider">
                LOBBY OPEN
              </span>
              <span class="text-[10px] font-mono text-zinc-500">{{ comp.status }}</span>
            </div>

            <h2 class="text-sm font-bold text-zinc-100 group-hover:text-orange-400 transition-colors leading-snug">
              {{ comp.name }}
            </h2>

            <!-- Metadata -->
            <div class="space-y-1 text-xs font-mono text-zinc-400">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>{{ formatUKDate(comp.date) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span class="truncate">{{ comp.venue || 'Home Course' }}</span>
              </div>
            </div>

            <!-- Prize Pool -->
            <div v-if="comp.prize1st || comp.prize2nd || comp.prize3rd" class="pt-1 font-mono text-xs">
              <span class="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-sm text-[10px] font-bold">
                <UIcon name="i-heroicons-trophy" class="w-3.5 h-3.5 shrink-0" />
                POOL: £{{ Number(comp.prize1st || 0) + Number(comp.prize2nd || 0) + Number(comp.prize3rd || 0) }}
              </span>
            </div>

            <!-- Weather Telemetry -->
            <div class="pt-2.5 border-t border-zinc-800/80 font-mono text-[10px]">
              <div v-if="comp.courseId && compWeatherLoading[comp.courseId]" class="text-zinc-500 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                <span>FETCHING_MET_DATA...</span>
              </div>
              <div v-else-if="comp.courseId && compWeather[comp.courseId]" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400">
                <span class="flex items-center gap-1 text-zinc-200 font-bold">
                  <UIcon name="i-heroicons-cloud" class="w-3.5 h-3.5 text-orange-400" />
                  {{ compWeather[comp.courseId].temperature }}°C
                </span>
                <span>{{ compWeather[comp.courseId].description }}</span>
                <span v-if="compWeather[comp.courseId].precipProbability > 0" class="text-sky-400">
                  RAIN {{ compWeather[comp.courseId].precipProbability }}%
                </span>
                <span class="text-zinc-500">WIND {{ compWeather[comp.courseId].windspeed }}km/h</span>
              </div>
              <div v-else-if="comp.courseId && !compWeather[comp.courseId] && !compWeatherLoading[comp.courseId]" class="text-zinc-600">
                MET_DATA // UNAVAILABLE
              </div>
            </div>
          </div>

          <!-- Lobby Action Button -->
          <UButton
            :to="`/competitions/${comp.id}`"
            size="xs"
            block
            icon="i-heroicons-arrow-right-circle"
            class="rounded-sm bg-zinc-900 hover:bg-[#F6821F] text-zinc-200 hover:text-zinc-950 border border-zinc-700 hover:border-[#F6821F] font-mono font-bold uppercase tracking-wider py-2 transition-colors cursor-pointer justify-center"
          >
            {{ comp.status === 'CLOSED' ? 'View Results' : 'Enter Lobby' }}
          </UButton>
        </div>
      </div>
    </section>

  </div>
</template>