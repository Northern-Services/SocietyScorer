<script setup lang="ts">
import { ref, watch } from 'vue'

const searchQuery = ref('')
const courses = ref<any[]>([])
const loading = ref(true)

const fetchCourses = async () => {
  loading.value = true
  try {
    const res: any = await $fetch(`/api/courses?q=${encodeURIComponent(searchQuery.value)}`)
    if (res?.success) {
      courses.value = res.courses
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
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-white">Course Directory</h1>
        <p class="text-xs text-slate-400">Select a pre-configured course or add a new one.</p>
      </div>
      <NuxtLink to="/courses/new" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20">
        + Add New Course
      </NuxtLink>
    </div>

    <!-- Search Input -->
    <input v-model="searchQuery" type="text" placeholder="Search courses by name or location..." class="w-full px-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" />

    <!-- Course Cards List -->
    <div v-if="courses.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="course in courses" :key="course.id" class="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-base font-bold text-white">{{ course.name }}</h2>
            <p class="text-xs text-slate-400">📍 {{ course.location }}</p>
          </div>
          <span class="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md">
            {{ course.numHoles }} Holes
          </span>
        </div>

        <div class="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
          <span>Par {{ course.pars.reduce((a: number, b: number) => a + b, 0) }}</span>
          <NuxtLink :to="`/scorecard?courseId=${course.id}`" class="text-xs text-emerald-400 font-bold hover:underline">
            Play Course →
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="text-center py-12 text-xs text-slate-500">
      No courses found matching your search.
    </div>
  </div>
</template>