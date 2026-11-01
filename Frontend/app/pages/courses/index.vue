<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'

const { data: userRes, error: userError } = await useFetch('/api/auth/me', {
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
  <div class="px-3 py-4 space-y-4 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-black text-white">Course Directory</h1>
        <p class="text-[11px] text-slate-400">Select a course or add a new one.</p>
      </div>
      <NuxtLink v-if="isLoggedIn" to="/courses/new" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl shadow-lg shadow-emerald-600/20">
        + Add Course
      </NuxtLink>
    </div>

    <!-- Search Input -->
    <input v-model="searchQuery" type="text" placeholder="Search courses by name or location..." class="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" />

    <!-- Course Cards List -->
    <div v-if="courses.length > 0" class="space-y-3">
      <div v-for="course in courses" :key="course.id" class="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-sm font-bold text-white">{{ course.name }}</h2>
            <p class="text-[11px] text-slate-400">📍 {{ course.location }}</p>
          </div>
          <span class="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-md">
            {{ course.numHoles }} Holes
          </span>
        </div>
        <div class="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
          <span>Par {{ course.pars.reduce((a: number, b: number) => a + b, 0) }}</span>
          <NuxtLink v-if="isLoggedIn" :to="`/scorecard?courseId=${course.id}`" class="text-xs text-emerald-400 font-bold hover:underline">Play Course →</NuxtLink>
        </div>
        <div v-if="courseWeather[course.id]" class="mt-1.5 flex items-center gap-2 pt-1 border-t border-slate-800">
          <UIcon name="i-heroicons-cloud" class="w-3 h-3 text-blue-400" />
          <span class="text-[10px] text-slate-400 flex items-center gap-1">
            <span class="text-blue-400 font-bold">{{ courseWeather[course.id].temperature }}°C</span>
            <span>{{ courseWeather[course.id].description }}</span>
            <span v-if="courseWeather[course.id].precipProbability > 0" class="text-blue-400">🌧️ {{ courseWeather[course.id].precipProbability }}%</span>
            <span class="text-slate-400">💨 {{ courseWeather[course.id].windspeed }} km/h</span>
          </span>
        </div>
        <div v-if="course.latitude && course.longitude && !courseWeather[course.id] && !weatherLoading[course.id]" class="mt-1.5 flex items-center gap-2 pt-1 border-t border-slate-800">
          <span class="text-[10px] text-slate-500">Weather unavailable</span>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="text-center py-8 text-[11px] text-slate-500">
      No courses found matching your search.
    </div>
  </div>
</template>