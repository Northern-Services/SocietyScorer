<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'

const { data: userRes } = await useFetch('/api/auth/me', {
  ignoreResponseError: true
})

const isLoggedIn = computed(() => !!userRes.value?.success && !!userRes.value?.data)

const searchQuery = ref('')
const courses = ref<any[]>([])
const courseWeather = ref<Record<string, any>>({})
const weatherLoading = ref<Record<string, boolean>>({})
const loading = ref(true)

const fetchCourses = async () => {
  loading.value = true
  try {
    const res: any = await $fetch(`/api/courses?q=${encodeURIComponent(searchQuery.value)}`)
    if (res?.success) {
      courses.value = res.courses
      // Fetch weather for courses with coordinates
      await Promise.all(
        courses.value.map(async (course: any) => {
          if (course.latitude && course.longitude) {
            weatherLoading.value[course.id] = true
            try {
              const weatherRes: any = await $fetch('/api/weather', {
                query: { latitude: course.latitude, longitude: course.longitude }
              })
              courseWeather.value[course.id] = weatherRes?.data || null
            } catch (e) {
              console.error('Weather fetch failed for course', course.id, e)
            } finally {
              weatherLoading.value[course.id] = false
            }
          }
        })
      )
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

let timeout: any = null
watch(searchQuery, () => {
  clearTimeout(timeout)
  timeout = setTimeout(() => fetchCourses(), 250)
})

onMounted(() => fetchCourses())
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Page Header -->
    <div class="flex items-end justify-between border-b border-zinc-800 pb-3">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100 mt-0.5">Course Directory</h1>
        <p class="text-xs text-zinc-400 mt-0.5">Select a venue to initialize a scorecard or inspect live weather telemetry.</p>
      </div>
      <NuxtLink
        v-if="isLoggedIn"
        to="/courses/new"
        class="px-3 py-1.5 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider rounded-sm shadow-md transition-colors shrink-0"
      >
        + Add Course
      </NuxtLink>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Query courses by name or location..."
        class="w-full pl-9 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-sm text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
      />
      <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
      <span v-if="loading" class="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin absolute right-3 top-3"></span>
    </div>

    <!-- Course Cards Grid -->
    <div v-if="courses.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="course in courses"
        :key="course.id"
        class="group relative border border-zinc-800 bg-zinc-950 hover:border-zinc-700 rounded-sm transition-colors flex flex-col justify-between overflow-hidden"
      >
        <!-- Hover Top Bar -->
        <div class="absolute top-0 left-0 w-full h-[2px] bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

        <div class="p-4 space-y-3">
          <!-- Title & Hole Count Badge -->
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h2 class="text-sm font-bold text-zinc-100 group-hover:text-orange-400 transition-colors truncate">
                {{ course.name }}
              </h2>
              <div class="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mt-1">
                <UIcon name="i-heroicons-map-pin" class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span class="truncate">{{ course.location }}</span>
              </div>
            </div>
            <span class="px-2 py-0.5 bg-zinc-900 border border-zinc-700 text-orange-400 text-[10px] font-mono font-bold rounded-sm shrink-0 uppercase">
              {{ course.numHoles }}H
            </span>
          </div>

          <!-- Weather Telemetry Strip -->
          <div class="pt-2.5 border-t border-zinc-800/80 font-mono text-[10px]">
            <div v-if="weatherLoading[course.id]" class="text-zinc-500 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
              <span>FETCHING_MET_DATA...</span>
            </div>

            <div v-else-if="courseWeather[course.id]" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400">
              <span class="flex items-center gap-1 text-zinc-200 font-bold">
                <UIcon name="i-heroicons-cloud" class="w-3.5 h-3.5 text-orange-400" />
                {{ courseWeather[course.id].temperature }}°C
              </span>
              <span class="text-zinc-400">{{ courseWeather[course.id].description }}</span>
              <span v-if="courseWeather[course.id].precipProbability > 0" class="text-sky-400">
                RAIN {{ courseWeather[course.id].precipProbability }}%
              </span>
              <span class="text-zinc-500">
                WIND {{ courseWeather[course.id].windspeed }}km/h
              </span>
            </div>

            <div v-else-if="course.latitude && course.longitude" class="text-zinc-600">
              MET_DATA // UNAVAILABLE
            </div>
            <div v-else class="text-zinc-600">
              GPS_COORDS // NOT_SET
            </div>
          </div>
        </div>

        <!-- Card Footer (Par + Play Trigger) -->
        <div class="px-4 py-2.5 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between font-mono text-xs">
          <span class="text-[11px] text-zinc-400">
            PAR <strong class="text-zinc-100">{{ Array.isArray(course.pars) ? course.pars.reduce((a: number, b: number) => a + b, 0) : '?' }}</strong>
          </span>

          <NuxtLink
            v-if="isLoggedIn"
            :to="`/scorecard?courseId=${course.id}`"
            class="text-[11px] font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
          >
            <span>START ROUND</span>
            <span>→</span>
          </NuxtLink>
          <span v-else class="text-[10px] text-zinc-600">SIGN IN TO PLAY</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="border border-zinc-800 bg-zinc-950/60 p-8 rounded-sm text-center font-mono space-y-1">
      <div class="text-xs font-bold text-zinc-300">NO_COURSES_FOUND</div>
      <p class="text-[11px] text-zinc-500">Adjust your search query or register a new course venue.</p>
    </div>
  </div>
</template>