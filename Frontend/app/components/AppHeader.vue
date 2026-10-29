<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const route = useRoute()

// Live Member Search State
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
const showSearchDropdown = ref(false)
const searchContainerRef = ref<HTMLElement | null>(null)

// Notification State (Friend Requests)
const notificationsContainerRef = ref<HTMLElement | null>(null)
const showNotifications = ref(false)
const pendingRequests = ref<any[]>([])
const notificationsLoading = ref(false)

// Mobile Menu Drawer State
const showMobileMenu = ref(false)

// Settings Modal State
const showSettingsModal = ref(false)
const editName = ref('')
const editHandicap = ref(18.0)
const settingsSaving = ref(false)
const settingsSuccessMessage = ref('')
const settingsErrorMessage = ''

// Fetch current authentication status
const { data: userRes, refresh: refreshUser } = await useFetch('/api/auth/me', {
  ignoreResponseError: true
})

watch(() => route.fullPath, () => {
  refreshUser()
  showSearchDropdown.value = false
  searchQuery.value = ''
  showMobileMenu.value = false
  showNotifications.value = false
  fetchNotifications()
})

const isLoggedIn = computed(() => !!userRes.value?.success && !!userRes.value?.data)
const user = computed(() => userRes.value?.data)

watch(user, (newUser) => {
  if (newUser) {
    editName.value = newUser.name || ''
    editHandicap.value = Number(newUser.handicapIndex || 18.0)
  }
}, { immediate: true })

const handleSaveSettings = async () => {
  settingsErrorMessage.value = ''
  settingsSuccessMessage.value = ''
  settingsSaving.value = true
  try {
    const res: any = await $fetch(`/api/players/${user.value.id}`, {
      method: 'PUT',
      body: {
        handicapIndex: Number(editHandicap.value),
        name: editName.value.trim()
      }
    })
    if (res?.success) {
      settingsSuccessMessage.value = 'Settings updated!'
      await refreshUser()
      setTimeout(() => {
        showSettingsModal.value = false
        settingsSuccessMessage.value = ''
      }, 1200)
    }
  } catch (err: any) {
    settingsErrorMessage.value = err?.data?.statusMessage || 'Failed to update settings.'
  } finally {
    settingsSaving.value = false
  }
}

const handleLogout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await refreshUser()
    await navigateTo('/')
  } catch (err) {
    console.error('Logout failed', err)
  }
}

// Real-time Search Handler with Debounce
let searchTimeout: any = null
watch(searchQuery, (newVal) => {
  clearTimeout(searchTimeout)
  if (!newVal.trim() || newVal.trim().length < 2) {
    searchResults.value = []
    showSearchDropdown.value = false
    return
  }
  searchLoading.value = true
  showSearchDropdown.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const res: any = await $fetch(`/api/users/search?q=${encodeURIComponent(newVal.trim())}`)
      if (res?.success) {
        searchResults.value = res.users || []
      }
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      searchLoading.value = false
    }
  }, 250)
})

const handleClickOutside = (event: MouseEvent) => {
  if (searchContainerRef.value && !searchContainerRef.value.contains(event.target as Node)) {
    showSearchDropdown.value = false
  }
  if (notificationsContainerRef.value && !notificationsContainerRef.value.contains(event.target as Node)) {
    showNotifications.value = false
  }
}

// Fetch Pending Friend Requests (Notifications)
const fetchNotifications = async () => {
  if (!user.value?.id) return
  notificationsLoading.value = true
  try {
    const res: any = await $fetch('/api/friends/list')
    if (res?.success) {
      pendingRequests.value = res.pendingRequests || []
    }
  } catch (err) {
    console.error('Failed to fetch notifications', err)
  } finally {
    notificationsLoading.value = false
  }
}

// Accept a friend request
const handleAcceptRequest = async (friendshipId: string, requesterId: string) => {
  try {
    await $fetch('/api/friends/action', {
      method: 'POST',
      body: { targetUserId: requesterId, action: 'ACCEPT' }
    })
    await fetchNotifications()
    await refreshUser()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Failed to accept request.')
  }
}

// Refuse (remove) a friend request
const handleRefuseRequest = async (friendshipId: string, requesterId: string) => {
  try {
    await $fetch('/api/friends/action', {
      method: 'POST',
      body: { targetUserId: requesterId, action: 'REMOVE' }
    })
    await fetchNotifications()
  } catch (err: any) {
    alert(err?.data?.statusMessage || 'Failed to refuse request.')
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    showSearchDropdown.value = false
    showSettingsModal.value = false
    showMobileMenu.value = false
    showNotifications.value = false
  }
}

onMounted(() => {
  fetchNotifications()
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})

const items = computed(() => {
  const baseItems = [
    { label: 'Competitions', to: '/competitions' },
    { label: 'Members', to: '/members' },
    { label: 'Courses', to: '/courses' }
  ]
  if (isLoggedIn.value) {
    baseItems.unshift({ label: 'Dashboard', to: '/' })
    if (user.value?.role === 'ADMIN') {
      baseItems.push({ label: 'Admin Portal', to: '/admin' })
    }
  }
  return baseItems
})
</script>

<template>
  <header class="relative z-30 w-full px-3 pt-3 pb-1.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
    
    <div class="flex items-center justify-between gap-2.5">
      <!-- LEFT: Logo -->
      <NuxtLink to="/" class="focus-visible:outline-2 outline-emerald-500 rounded-2xl p-1 flex items-center gap-2 group hover:bg-slate-800/50 transition-colors">
        <AppLogo />
      </NuxtLink>

      <!-- RIGHT: Search + User Controls -->
      <div class="flex items-center gap-2">
        
        <!-- Search (always visible on mobile) -->
        <div ref="searchContainerRef" class="relative hidden sm:block w-48">
          <div class="relative flex items-center">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search members..."
              @focus="showSearchDropdown = searchQuery.trim().length >= 2"
              class="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800/90 focus:border-emerald-500/80 rounded-xl text-[12px] text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
            <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
            <span v-if="searchLoading" class="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin absolute right-2.5"></span>
            <button v-else-if="searchQuery" @click="searchQuery = ''" class="absolute right-2.5 text-slate-500 hover:text-slate-300 text-xs font-bold">✕</button>
          </div>
          <transition name="dropdown">
            <div v-if="showSearchDropdown" class="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 max-h-[200px] overflow-y-auto space-y-1 p-1">
              <div v-if="searchLoading" class="p-2 text-center text-[11px] text-slate-400">Searching members...</div>
              <div v-else-if="searchResults.length === 0" class="p-2 text-center text-[11px] text-slate-500">No members found</div>
              <template v-else>
                <NuxtLink
                  v-for="resUser in searchResults"
                  :key="resUser.id"
                  :to="`/player/${resUser.id}`"
                  @click="showSearchDropdown = false"
                  class="flex items-center justify-between p-2 hover:bg-slate-800/80 rounded-xl transition-colors group"
                >
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {{ resUser.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="text-left leading-tight truncate">
                      <span class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors block truncate">{{ resUser.name }}</span>
                      <span class="text-[10px] text-slate-400">@{{ resUser.username }}</span>
                    </div>
                  </div>
                  <span class="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    HCP {{ resUser.handicapIndex }}
                  </span>
                </NuxtLink>
              </template>
            </div>
          </transition>
        </div>

        <!-- LOGGED OUT -->
        <template v-if="!isLoggedIn">
          <UButton label="Sign In" color="neutral" variant="ghost" to="/login" size="sm" class="text-slate-400 hover:text-white" />
          <UButton label="Register" color="success" variant="solid" to="/register" size="sm" class="font-semibold shadow-md shadow-emerald-500/20" />
        </template>

        <!-- LOGGED IN CONTROLS -->
        <template v-else>
          <!-- Notification Bell -->
          <div ref="notificationsContainerRef" class="relative">
            <button
              @click="showNotifications = !showNotifications"
              class="w-8 h-8 shrink-0 rounded-xl border border-slate-800/90 hover:border-emerald-500/50 flex items-center justify-center transition-all group cursor-pointer text-left shadow-inner relative"
            >
              <UIcon name="i-heroicons-bell" class="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              <span v-if="pendingRequests.length > 0" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
            </button>

            <!-- Notification Dropdown -->
            <transition name="dropdown">
              <div v-if="showNotifications" class="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 p-2 space-y-1">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-1">
                  <h3 class="text-xs font-bold text-white uppercase tracking-wider">Friend Requests</h3>
                  <span class="text-[10px] text-slate-500 font-bold">{{ pendingRequests.length }}</span>
                </div>

                <div v-if="notificationsLoading" class="p-2 text-center text-[11px] text-slate-400">Loading...</div>

                <div v-else-if="pendingRequests.length === 0" class="p-3 text-center text-[11px] text-slate-500">
                  No new friend requests.
                </div>

                <div v-else class="space-y-1">
                  <div
                    v-for="req in pendingRequests"
                    :key="req.friendshipId"
                    class="p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-1"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {{ req.name.charAt(0).toUpperCase() }}
                        </div>
                        <div class="leading-tight min-w-0">
                          <span class="text-xs font-bold text-white truncate block">{{ req.name }}</span>
                          <span class="text-[9px] text-slate-400 truncate block">@{{ req.username }}</span>
                        </div>
                      </div>
                    </div>
                    <p class="text-[10px] text-slate-400 leading-relaxed">has requested to be your friend!</p>
                    <div class="flex gap-1 pt-1">
                      <button
                        @click="handleAcceptRequest(req.friendshipId, req.friendId)"
                        class="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-sm shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                      >
                        Accept
                      </button>
                      <button
                        @click="handleRefuseRequest(req.friendshipId, req.friendId)"
                        class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        Refuse
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <button
            @click="showSettingsModal = true"
            class="w-8 h-8 shrink-0 rounded-xl border border-slate-800/90 hover:border-emerald-500/50 flex items-center justify-center transition-all group cursor-pointer text-left shadow-inner"
          >
            <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </button>
          <UButton
            icon="i-heroicons-arrow-right-start-on-rectangle"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Sign out"
            class="text-slate-400 hover:text-red-400"
            @click="handleLogout"
          />
        </template>
      </div>
    </div>

    <!-- MOBILE MENU DRAWER (full width overlay) -->
    <transition name="dropdown">
      <div v-if="showMobileMenu" class="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-xl space-y-2 z-50">
        <div class="relative mb-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search society members..."
            class="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>
        <div class="grid grid-cols-1 gap-1">
          <NuxtLink
            v-for="item in items"
            :key="item.to"
            :to="item.to"
            @click="showMobileMenu = false"
            class="px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
            :class="route.path === item.to ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'"
          >
            <span>{{ item.label }}</span>
            <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 text-slate-500" />
          </NuxtLink>
        </div>
        <div v-if="!isLoggedIn" class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <UButton label="Sign In" color="neutral" variant="outline" to="/login" size="sm" block @click="showMobileMenu = false" />
          <UButton label="Register" color="success" variant="solid" to="/register" size="sm" block class="font-semibold" @click="showMobileMenu = false" />
        </div>
      </div>
    </transition>

    <!-- SETTINGS MODAL (bottom sheet on mobile) -->
    <Transition name="modal">
      <div
        v-if="showSettingsModal"
        class="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md"
        @click.self="showSettingsModal = false"
      >
        <!-- Bottom sheet content anchored to bottom of viewport -->
        <div class="flex bottom-0 left-0 right-0 z-[71]">
          <div class="bg-slate-900 border border-slate-800 w-full rounded-t-3xl p-5 shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
                </div>
                <h2 class="text-base font-bold text-white">Player Settings</h2>
              </div>
              <button
                @click="showSettingsModal = false"
                class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/60 text-white text-lg font-bold hover:bg-emerald-500/60 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div v-if="settingsSuccessMessage" class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] rounded-xl font-medium">
              {{ settingsSuccessMessage }}
            </div>
            <div v-if="settingsErrorMessage" class="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] rounded-xl font-medium">
              {{ settingsErrorMessage }}
            </div>

            <div class="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
              <div class="space-y-1.5">
                <label class="text-sm font-bold uppercase tracking-wider text-slate-400 block">Display Name</label>
                <input v-model="editName" type="text" class="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-base focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-bold uppercase tracking-wider text-slate-400 block">WHS Handicap Index</label>
                <input v-model.number="editHandicap" type="number" step="0.1" min="-5.0" max="54.0" class="w-full px-3.5 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-base font-bold focus:outline-none focus:border-emerald-500" />
                <p class="text-xs text-slate-500">Note: .5 handicap values round up automatically.</p>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <UButton @click="showSettingsModal = false" color="neutral" variant="ghost" block size="md" class="cursor-pointer">Cancel</UButton>
              <UButton @click="handleSaveSettings" :disabled="settingsSaving" color="success" block size="md" class="font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer">
                {{ settingsSaving ? 'Saving...' : 'Save Changes' }}
              </UButton>
            </div>

            <!-- Mobile drag indicator -->
            <div class="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-2"></div>
          </div>
        </div>
        <!-- Bottom padding so content isn't hidden by home indicator -->
        <div class="h-[max(1rem,env(safe-area-inset-bottom))]"></div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>