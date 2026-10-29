<script setup lang="ts">
import { ref, watch } from 'vue'

const searchQuery = ref('')
const searchResults = ref<any[]>([])
const loading = ref(false)

const performSearch = async () => {
  if (searchQuery.value.trim().length < 2) {
    searchResults.value = []
    return
  }

  loading.value = true
  try {
    const res: any = await $fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.value)}`)
    if (res?.success) {
      searchResults.value = res.users
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// Simple debounce for real-time search typing
let searchTimeout: any = null
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => performSearch(), 300)
})

const handleFriendAction = async (targetUserId: string, action: string) => {
  try {
    await $fetch('/api/friends/action', {
      method: 'POST',
      body: { targetUserId, action }
    })
    await performSearch() // Refresh list status
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Action failed')
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-black text-white">Society Members</h1>
      <p class="text-xs text-slate-400">Search for fellow golfers and see their competition history.</p>
    </div>

    <!-- Search Input -->
    <div class="relative">
      <input 
        v-model="searchQuery"
        type="text"
        placeholder="Search members by name or username..."
        class="w-full px-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 shadow-inner"
      />
      <span v-if="loading" class="absolute right-4 top-4 w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
    </div>

    <!-- Search Results List -->
    <div v-if="searchResults.length > 0" class="space-y-3">
      <div 
        v-for="user in searchResults" 
        :key="user.id"
        class="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
            {{ user.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h2 class="text-sm font-bold text-white">{{ user.name }}</h2>
            <p class="text-xs text-slate-400">@{{ user.username }} • WHS Index: <span class="text-emerald-400 font-bold">{{ user.handicapIndex }}</span></p>
          </div>
        </div>

        <!-- Friend Action Buttons -->
        <div>
          <button 
            v-if="user.friendStatus === 'NONE'"
            @click="handleFriendAction(user.id, 'ADD')"
            class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Add Friend
          </button>

          <span v-else-if="user.friendStatus === 'PENDING_SENT'" class="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-800 rounded-lg">
            Request Sent
          </span>

          <button 
            v-else-if="user.friendStatus === 'PENDING_RECEIVED'"
            @click="handleFriendAction(user.id, 'ACCEPT')"
            class="px-3.5 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
          >
            Accept Request
          </button>

          <span v-else-if="user.friendStatus === 'FRIENDS'" class="text-xs text-emerald-400 font-semibold px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1">
            ✓ Friends
          </span>
        </div>
      </div>
    </div>

    <div v-else-if="searchQuery.length >= 2 && !loading" class="text-center py-8 text-xs text-slate-500">
      No society members found matching "{{ searchQuery }}".
    </div>
  </div>
</template>