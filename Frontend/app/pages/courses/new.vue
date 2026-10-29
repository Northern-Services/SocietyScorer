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
  <div class="px-3 py-4 space-y-4 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-black text-white">Add New Course</h1>
        <p class="text-[11px] text-slate-400">Configure pars and stroke indexes for the society.</p>
      </div>
      <NuxtLink to="/courses" class="text-[11px] font-semibold text-slate-400 hover:text-white">← Cancel</NuxtLink>
    </div>

    <div v-if="errorMessage" class="p-2.5 bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] rounded-xl font-medium">
      {{ errorMessage }}
    </div>

    <div class="bg-slate-900/90 border border-slate-800 p-3 rounded-3xl shadow-xl space-y-4">

      <!-- Details -->
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Course Name</label>
          <input v-model="name" type="text" placeholder="e.g. Royal Portrush (Dunluce)" class="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Location / Town</label>
          <input v-model="location" type="text" placeholder="e.g. Portrush, Antrim" class="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
      </div>

      <!-- Hole Count -->
      <div class="space-y-1.5">
        <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Number of Holes</label>
        <div class="flex gap-2">
          <button @click="handleHoleCountChange(18)" type="button" :class="numHoles === 18 ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'" class="flex-1 px-3 py-2 rounded-xl font-bold text-[11px] cursor-pointer">
            18 Holes
          </button>
          <button @click="handleHoleCountChange(9)" type="button" :class="numHoles === 9 ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'" class="flex-1 px-3 py-2 rounded-xl font-bold text-[11px] cursor-pointer">
            9 Holes
          </button>
        </div>
      </div>

      <!-- Hole Pars & Stroke Index -->
      <div class="space-y-2">
        <label class="text-sm font-bold uppercase tracking-wider text-slate-400 block">Hole Breakdown (Par & S.I.)</label>
        <p class="text-xs text-slate-500 mb-3">Tap each hole to set its Par and Stroke Index.</p>

        <div class="space-y-2">
          <div
            v-for="(_, idx) in numHoles"
            :key="idx"
            class="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2"
          >
            <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              <span>Hole {{ idx + 1 }}</span>
              <span class="text-emerald-400">Par {{ pars[idx] }} • SI {{ strokeIndexes[idx] }}</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-slate-500 block">Par</label>
                <input
                  v-model.number="pars[idx]"
                  type="number"
                  min="3"
                  max="6"
                  class="w-full py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-center font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[10px] font-bold text-slate-500 block">S.I.</label>
                <input
                  v-model.number="strokeIndexes[idx]"
                  type="number"
                  min="1"
                  :max="numHoles"
                  class="w-full py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-center font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <button @click="saveCourse" type="button" :disabled="loading" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50">
        {{ loading ? 'Saving Course...' : 'Save & Add Course' }}
      </button>
    </div>
  </div>
</template>