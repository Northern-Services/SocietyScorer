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
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Header Console -->
    <section class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl font-mono">
      <div class="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
        <div class="flex items-center gap-2">
        </div>
        <NuxtLink to="/courses" class="text-orange-400 hover:text-orange-300 transition-colors">
          ← CANCEL
        </NuxtLink>
      </div>

      <div class="p-4 sm:p-5 font-sans space-y-1">
        <h1 class="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">Add New Course</h1>
        <p class="text-xs text-zinc-400">Configure parameters, pars, and stroke indexes for the society directory.</p>
      </div>
    </section>

    <!-- Error Banner -->
    <div v-if="errorMessage" class="border border-red-500/30 bg-red-500/10 p-3 rounded-sm text-red-400 text-xs font-mono">
      ! {{ errorMessage }}
    </div>

    <!-- Course Configuration Form -->
    <section class="border border-zinc-800 bg-zinc-950 rounded-sm p-4 sm:p-6 shadow-2xl font-mono space-y-6">
      
      <!-- General Details -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-zinc-400 block">Course Name</label>
          <input
            v-model="name"
            type="text"
            placeholder="e.g. Royal Portrush (Dunluce)"
            class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors font-sans"
          />
        </div>
        <div class="space-y-1.5">
          <label class="text-[10px] uppercase tracking-wider text-zinc-400 block">Location / Town</label>
          <input
            v-model="location"
            type="text"
            placeholder="e.g. Portrush, Antrim"
            class="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-sm text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors font-sans"
          />
        </div>
      </div>

      <!-- Hole Count Selector -->
      <div class="space-y-1.5">
        <label class="text-[10px] uppercase tracking-wider text-zinc-400 block">Course Layout</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            @click="handleHoleCountChange(18)"
            type="button"
            :class="numHoles === 18 ? 'bg-[#F6821F] text-zinc-950 font-bold border-[#F6821F]' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-100'"
            class="py-2 rounded-sm text-xs border transition-colors cursor-pointer uppercase tracking-wider"
          >
            18 Holes
          </button>
          <button
            @click="handleHoleCountChange(9)"
            type="button"
            :class="numHoles === 9 ? 'bg-[#F6821F] text-zinc-950 font-bold border-[#F6821F]' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-100'"
            class="py-2 rounded-sm text-xs border transition-colors cursor-pointer uppercase tracking-wider"
          >
            9 Holes
          </button>
        </div>
      </div>

      <!-- Hole Breakdown Matrix -->
      <div class="space-y-3 pt-2 border-t border-zinc-800">
        <div class="flex items-center justify-between">
          <span class="text-[10px] uppercase tracking-wider text-orange-400">// HOLE BREAKDOWN (PAR & S.I.)</span>
          <span class="text-[10px] text-zinc-500">Configure parameters per hole</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
          <div
            v-for="(_, idx) in numHoles"
            :key="idx"
            class="border border-zinc-800 bg-zinc-900/50 rounded-sm p-3 space-y-2"
          >
            <div class="flex items-center justify-between text-xs font-bold text-zinc-300">
              <span>HOLE {{ String(idx + 1).padStart(2, '0') }}</span>
              <span class="text-[10px] font-mono text-orange-400">Par {{ pars[idx] }} • SI {{ strokeIndexes[idx] }}</span>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <label class="text-[9px] uppercase tracking-wider text-zinc-500 block">Par</label>
                <input
                  v-model.number="pars[idx]"
                  type="number"
                  min="3"
                  max="6"
                  class="w-full py-1.5 bg-zinc-950 border border-zinc-800 rounded-sm text-zinc-100 text-center font-bold text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
              <div class="space-y-1">
                <label class="text-[9px] uppercase tracking-wider text-zinc-500 block">Stroke Index</label>
                <input
                  v-model.number="strokeIndexes[idx]"
                  type="number"
                  min="1"
                  :max="numHoles"
                  class="w-full py-1.5 bg-zinc-950 border border-zinc-800 rounded-sm text-zinc-100 text-center font-bold text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="pt-2 border-t border-zinc-800">
        <button
          @click="saveCourse"
          type="button"
          :disabled="loading"
          class="w-full py-3 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-sm shadow-md transition-colors cursor-pointer disabled:opacity-50"
        >
          {{ loading ? 'SAVING COURSE...' : 'SAVE & PROVISION COURSE' }}
        </button>
      </div>

    </section>
  </div>
</template>