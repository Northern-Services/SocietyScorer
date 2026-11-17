<script setup lang="ts">
import { computed } from 'vue'
import { isAdminRole } from '@/utils/roles'

const { data: userRes } = await useFetch('/api/auth/me', { ignoreResponseError: true })
const user = computed(() => userRes.value?.data)
const isLoggedIn = computed(() => !!user.value)
const isAdmin = computed(() => isAdminRole(user.value?.role))

const handleSignout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/')
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)] font-mono">

    <!-- Page Header Console -->
    <section class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl">
      <div class="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          <span class="text-zinc-200 font-bold uppercase tracking-wider">SYSTEM_CONFIG</span>
        </div>
        <span class="text-orange-400">PREFERENCES</span>
      </div>

      <div class="p-4 sm:p-5 space-y-1 font-sans">
        <div class="text-[10px] font-mono text-orange-400 uppercase tracking-widest">// DIRECTORY & UTILITIES</div>
        <h1 class="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">More & Settings</h1>
        <p class="text-xs text-zinc-400">Society infrastructure, course directories, membership rosters, and controls.</p>
      </div>
    </section>

    <!-- Navigation Options Matrix -->
    <section class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl divide-y divide-zinc-800">
      
      <!-- Society Section -->
      <div class="p-4 space-y-2">
        <div class="text-[10px] uppercase tracking-wider text-zinc-500">// SOCIETY DIRECTORY</div>
        <div class="space-y-1">
          <NuxtLink
            to="/courses"
            class="flex items-center justify-between p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-orange-500/50 rounded-sm transition-colors group"
          >
            <span class="flex items-center gap-2.5 text-xs font-bold text-zinc-200 group-hover:text-orange-400 transition-colors">
              <UIcon name="i-heroicons-flag" class="w-4 h-4 text-orange-400" />
              <span>Course Directory</span>
            </span>
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors" />
          </NuxtLink>

          <NuxtLink
            to="/members"
            class="flex items-center justify-between p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-orange-500/50 rounded-sm transition-colors group"
          >
            <span class="flex items-center gap-2.5 text-xs font-bold text-zinc-200 group-hover:text-orange-400 transition-colors">
              <UIcon name="i-heroicons-user-group" class="w-4 h-4 text-orange-400" />
              <span>Member Directory</span>
            </span>
            <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors" />
          </NuxtLink>
        </div>
      </div>

      <!-- Admin Section -->
      <div v-if="isAdmin" class="p-4 space-y-2">
        <div class="text-[10px] uppercase tracking-wider text-orange-400">// ROOT PRIVILEGES</div>
        <NuxtLink
          to="/admin"
          class="flex items-center justify-between p-3 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-orange-500/50 rounded-sm transition-colors group"
        >
          <span class="flex items-center gap-2.5 text-xs font-bold text-zinc-200 group-hover:text-orange-400 transition-colors">
            <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-orange-400" />
            <span>Admin Console</span>
          </span>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors" />
        </NuxtLink>
      </div>

    </section>

    <!-- Sign Out Section -->
    <section v-if="isLoggedIn">
      <button
        @click="handleSignout"
        class="w-full flex items-center justify-center gap-2 p-3 bg-zinc-950 border border-red-500/30 hover:bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider rounded-sm shadow-xl transition-colors cursor-pointer"
      >
        <UIcon name="i-heroicons-arrow-right-start-on-rectangle" class="w-4 h-4" />
        <span>Sign Out Session</span>
      </button>
    </section>

  </div>
</template>