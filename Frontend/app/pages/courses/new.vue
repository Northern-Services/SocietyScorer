<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
const location = ref('')
const numHoles = ref(18)
const pars = ref<number[]>(Array(18).fill(4))
const strokeIndexes = ref<number[]>(Array.from({ length: 18 }, (_, i) => i + 1))
const loading = ref(false)
const errorMessage = ref('')

const handleHoleCountChange = (count: number) => {
  numHoles.value = count
  pars.value = Array(count).fill(4)
  strokeIndexes.value = Array.from({ length: count }, (_, i) => i + 1)
}

const saveCourse = async () => {
  errorMessage.value = ''

  if (!name.value.trim() || !location.value.trim()) {
    errorMessage.value = 'Please provide both a course name and location.'
    return
  }

  // Validate duplicate SI values
  const siSet = new Set(strokeIndexes.value)
  if (siSet.size !== numHoles.value) {
    errorMessage.value = 'Stroke Index numbers must be unique from 1 to ' + numHoles.value + '.'
    return
  }

  loading.value = true

  try {
    const res: any = await $fetch('/api/courses', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        location: location.value.trim(),
        numHoles: numHoles.value,
        pars: pars.value,
        strokeIndexes: strokeIndexes.value
      }
    })

    if (res?.success) {
      await navigateTo('/courses')
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || 'Failed to save course.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-white">Add New Golf Course</h1>
        <p class="text-xs text-slate-400">Configure course pars and stroke indexes for the society.</p>
      </div>
      <NuxtLink to="/courses" class="text-xs font-semibold text-slate-400 hover:text-white">← Cancel</NuxtLink>
    </div>

    <div v-if="errorMessage" class="p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl font-medium">
      {{ errorMessage }}
    </div>

    <div class="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
      <!-- Details -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Course Name</label>
          <input v-model="name" type="text" placeholder="e.g. Royal Portrush (Dunluce)" class="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div class="space-y-1.5">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Location / Town</label>
          <input v-model="location" type="text" placeholder="e.g. Portrush, Antrim" class="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
      </div>

      <!-- Hole Count Selector -->
      <div class="space-y-1.5">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Number of Holes</label>
        <div class="flex gap-3">
          <button @click="handleHoleCountChange(18)" type="button" :class="numHoles === 18 ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'" class="px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer">18 Holes</button>
          <button @click="handleHoleCountChange(9)" type="button" :class="numHoles === 9 ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'" class="px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer">9 Holes</button>
        </div>
      </div>

      <!-- Hole Pars & Stroke Index Table Grid -->
      <div class="space-y-3">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hole Breakdown (Par & SI)</label>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 font-bold uppercase">
                <th class="py-2 px-2">Hole</th>
                <th v-for="h in numHoles" :key="h" class="py-2 px-2 text-center">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <!-- PAR ROW -->
              <tr class="border-b border-slate-800/60">
                <td class="py-3 px-2 font-bold text-emerald-400">PAR</td>
                <td v-for="(_, idx) in pars" :key="idx" class="p-1">
                  <input v-model.number="pars[idx]" type="number" min="3" max="6" class="w-10 text-center py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-emerald-500" />
                </td>
              </tr>
              <!-- STROKE INDEX ROW -->
              <tr>
                <td class="py-3 px-2 font-bold text-slate-400">S.I.</td>
                <td v-for="(_, idx) in strokeIndexes" :key="idx" class="p-1">
                  <input v-model.number="strokeIndexes[idx]" type="number" min="1" :max="numHoles" class="w-10 text-center py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-bold focus:outline-none focus:border-emerald-500" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button @click="saveCourse" type="button" :disabled="loading" class="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50">
        {{ loading ? 'Saving Course...' : 'Save & Add Course' }}
      </button>
    </div>
  </div>
</template>