<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const playerId = route.params.id

const profileData = ref<any>(null)
const loading = ref(true)
const errorMessage = ref('')

const formatUKDate = (isoString: string) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return isoString
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

const fetchProfile = async () => {
  loading.value = true
  try {
    const res: any = await $fetch(`/api/users/${playerId}`)
    if (res?.success) {
      profileData.value = res.data
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || 'Failed to load player profile.'
  } finally {
    loading.value = false
  }
}

const handleFriendAction = async (action: string) => {
  try {
    await $fetch('/api/friends/action', {
      method: 'POST',
      body: { targetUserId: playerId, action }
    })
    await fetchProfile()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Action failed')
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8 space-y-6">
    
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-16 space-y-3">
      <div class="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-400">Loading profile...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-2xl text-center">
      {{ errorMessage }}
    </div>

    <!-- Profile Content -->
    <template v-else-if="profileData">
      
      <!-- Back Navigation -->
      <div>
        <NuxtLink to="/members" class="text-xs font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors">
          ← Back to Members Directory
        </NuxtLink>
      </div>

      <!-- Player Header Card -->
      <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-xl relative overflow-hidden space-y-6">
        <div class="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-black shadow-inner shrink-0">
              {{ profileData.player.name.charAt(0).toUpperCase() }}
            </div>
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <h1 class="text-xl font-extrabold text-white">{{ profileData.player.name }}</h1>
                <span v-if="profileData.player.role === 'ADMIN'" class="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-md">
                  Admin
                </span>
              </div>
              <p class="text-xs text-slate-400">@{{ profileData.player.username }}</p>
            </div>
          </div>

          <!-- Friendship Action Button -->
          <div v-if="profileData.friendshipStatus !== 'SELF'">
            <button 
              v-if="profileData.friendshipStatus === 'NONE'"
              @click="handleFriendAction('ADD')"
              class="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              + Add Friend
            </button>
            <span v-else-if="profileData.friendshipStatus === 'PENDING_SENT'" class="inline-block text-xs text-slate-400 font-medium px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700">
              Request Sent
            </span>
            <button 
              v-else-if="profileData.friendshipStatus === 'PENDING_RECEIVED'"
              @click="handleFriendAction('ACCEPT')"
              class="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Accept Request
            </button>
            <span v-else-if="profileData.friendshipStatus === 'FRIENDS'" class="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              ✓ Friends
            </span>
          </div>
        </div>

        <!-- Stat Highlights -->
        <div class="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80 relative z-10">
          <div class="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">WHS Handicap Index</span>
            <div class="text-2xl font-black text-emerald-400">{{ profileData.player.handicapIndex }}</div>
          </div>
          <div class="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60 space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rounds Completed</span>
            <div class="text-2xl font-black text-white">{{ profileData.scorecards.length }}</div>
          </div>
        </div>
      </div>

      <!-- Scorecard History Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400">Scorecard History</h2>
          <span class="text-xs text-slate-500">{{ profileData.scorecards.length }} Rounds</span>
        </div>

        <div v-if="profileData.scorecards.length === 0" class="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl text-center text-xs text-slate-500">
          No completed competition or course rounds recorded yet.
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="sc in profileData.scorecards" 
            :key="sc.id"
            class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-lg hover:border-slate-700 transition-colors"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-bold text-white">{{ sc.courseName }}</h3>
                  
                  <!-- Round Badge -->
                  <span 
                    v-if="sc.isCompetition" 
                    class="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9px] font-bold rounded-md flex items-center gap-1"
                  >
                    🏆 Competition
                  </span>
                  <span 
                    v-else 
                    class="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold rounded-md flex items-center gap-1"
                  >
                    ⛳ Practice / Normal
                  </span>
                </div>

                <p v-if="sc.isCompetition && sc.competitionTitle" class="text-xs font-semibold text-amber-400">
                  Fixture: {{ sc.competitionTitle }}
                </p>

                <div class="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                  <span>📍 {{ sc.courseLocation }}</span>
                  <span>•</span>
                  <span>{{ formatUKDate(sc.playedAt) }}</span>
                </div>
              </div>

              <div class="text-right shrink-0 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <div class="text-lg font-black text-emerald-400">{{ sc.stablefordPoints }} pts</div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Stableford</div>
              </div>
            </div>

            <!-- Handicap Movement Bar -->
            <div v-if="sc.handicapBeforeRound !== undefined" class="flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-slate-400">
              <span>HCP Before: <strong class="text-white">{{ sc.handicapBeforeRound }}</strong></span>
              <span class="text-slate-600">→</span>
              <span>HCP After: <strong class="text-emerald-400 font-bold">{{ sc.handicapAfterRound }}</strong></span>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>