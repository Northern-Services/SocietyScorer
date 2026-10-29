<script setup lang="ts">
import { computed } from 'vue'

const { data: userRes } = await useFetch('/api/auth/me', { ignoreResponseError: true })
const user = computed(() => userRes.value?.data)
const isLoggedIn = computed(() => !!user.value)
const isAdmin = computed(() => user.value?.role === 'ADMIN')

const handleSignout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/')
}
</script>

<template>
  <div class="px-3 py-4 space-y-5 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <div class="space-y-2">
      <h1 class="text-xl font-black text-white">More</h1>
      <p class="text-[11px] text-slate-400">Settings, courses, and society tools.</p>
    </div>

    <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-3 shadow-xl space-y-1">
      <div class="space-y-1">
        <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Society</label>
        <NuxtLink to="/courses" class="flex items-center justify-between p-3 text-white hover:bg-slate-800/50 rounded-2xl transition-colors">
          <span class="flex items-center gap-2">
            <UIcon name="i-heroicons-flag" class="w-4 h-4" />
            <span>Course Directory</span>
          </span>
          <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 text-slate-500" />
        </NuxtLink>
        <NuxtLink to="/members" class="flex items-center justify-between p-3 text-white hover:bg-slate-800/50 rounded-2xl transition-colors">
          <span class="flex items-center gap-2">
            <UIcon name="i-heroicons-user-group" class="w-4 h-4" />
            <span>Member Directory</span>
          </span>
          <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 text-slate-500" />
        </NuxtLink>
      </div>

      <div v-if="isAdmin" class="space-y-1">
        <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Admin</label>
        <NuxtLink to="/admin" class="flex items-center justify-between p-3 text-white hover:bg-slate-800/50 rounded-2xl transition-colors">
          <span class="flex items-center gap-2">
            <UIcon name="i-heroicons-shield-check" class="w-4 h-4" />
            <span>Admin Portal</span>
          </span>
          <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 text-slate-500" />
        </NuxtLink>
      </div>
    </div>

    <div v-if="isLoggedIn" class="bg-slate-900/90 border border-red-500/30 rounded-3xl p-3 shadow-xl">
      <button @click="handleSignout" class="w-full flex items-center justify-center p-3 text-red-400 font-bold hover:bg-red-500/10 rounded-2xl transition-colors">
        <UIcon name="i-heroicons-arrow-right-start-on-rectangle" class="w-4 h-4 mr-2" />
        <span>Sign Out</span>
      </button>
    </div>

  </div>
</template>