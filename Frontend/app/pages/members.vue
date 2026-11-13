<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const searchQuery = ref('')
const users = ref<any[]>([])
const loading = ref(true)

const fetchAllUsers = async () => {
  loading.value = true
  try {
    const res: any = await $fetch('/api/players')
    if (res?.success) {
      users.value = res.data || []
    }
  } catch (err) {
    console.error('Failed to fetch members directory', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAllUsers()
})

const filteredUsers = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return users.value
  return users.value.filter((user: any) =>
    user.name?.toLowerCase().includes(query) ||
    user.username?.toLowerCase().includes(query)
  )
})

const handleFriendAction = async (targetUserId: string, action: string) => {
  try {
    await $fetch('/api/friends/action', {
      method: 'POST',
      body: { targetUserId, action }
    })
    await fetchAllUsers()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Action failed')
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)]">

    <!-- Page Header Console -->
    <section class="border border-zinc-800 bg-zinc-950 rounded-sm overflow-hidden shadow-2xl font-mono">
      <div class="px-4 py-2 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
          <span class="text-zinc-200 font-bold uppercase tracking-wider">MEMBER_DIRECTORY</span>
        </div>
        <span class="text-orange-400">{{ users.value?.length || filteredUsers.length }} REGISTERED</span>
      </div>

      <div class="p-4 sm:p-5 space-y-4 font-sans">
        <div class="space-y-1">
          <h1 class="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">Society Members</h1>
          <p class="text-xs text-zinc-400 leading-relaxed">
            Browse all registered society golfers, inspect WHS handicap indexes, and manage connections.
          </p>
        </div>

        <!-- Search Input -->
        <div class="relative font-mono">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Query members by name or username..."
            class="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 focus:border-orange-500 rounded-sm text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
          <span v-if="loading" class="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin absolute right-3 top-2.5"></span>
        </div>
      </div>
    </section>

    <!-- Users List Grid -->
    <section class="space-y-3">
      <div v-if="filteredUsers.length === 0 && !loading" class="border border-zinc-800 bg-zinc-950 p-8 rounded-sm text-center font-mono space-y-2">
        <div class="text-xs font-bold text-zinc-300 uppercase">NO_MEMBERS_MATCHING_CRITERIA</div>
        <p class="text-[11px] text-zinc-500">Try adjusting your search query.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="user in filteredUsers"
          :key="user.id"
          class="group relative border border-zinc-800 bg-zinc-950 hover:border-zinc-700 p-4 rounded-sm transition-colors flex items-center justify-between gap-3 overflow-hidden font-mono"
        >
          <!-- Hover Accent Bar -->
          <div class="absolute top-0 left-0 w-full h-[2px] bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
              {{ user.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 font-sans">
              <h2 class="text-xs font-bold text-zinc-100 group-hover:text-orange-400 transition-colors truncate">
                {{ user.name }}
              </h2>
              <p class="text-[10px] font-mono text-zinc-500 truncate mt-0.5">
                @{{ user.username }} • HCP: <strong class="text-zinc-300">{{ user.handicapIndex }}</strong>
              </p>
            </div>
          </div>

          <div class="shrink-0 font-mono">
            <button
              v-if="user.friendStatus === 'NONE' || !user.friendStatus"
              @click="handleFriendAction(user.id, 'ADD')"
              class="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-orange-500 text-orange-400 text-[10px] font-bold uppercase rounded-sm transition-colors cursor-pointer"
            >
              + ADD
            </button>
            <span v-else-if="user.friendStatus === 'PENDING_SENT'" class="text-[9px] text-zinc-500 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-sm uppercase">
              PENDING
            </span>
            <button
              v-else-if="user.friendStatus === 'PENDING_RECEIVED'"
              @click="handleFriendAction(user.id, 'ACCEPT')"
              class="px-2.5 py-1.5 bg-orange-500 text-zinc-950 text-[10px] font-bold uppercase rounded-sm cursor-pointer"
            >
              ACCEPT
            </button>
            <span v-else-if="user.friendStatus === 'FRIENDS'" class="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-sm uppercase font-bold">
              ✓ CONNECTED
            </span>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>