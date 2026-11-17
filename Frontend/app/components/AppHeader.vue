<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { isAdminRole } from '@/utils/roles'

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
const settingsErrorMessage = ref('')

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
    if (isAdminRole(user.value?.role)) {
      baseItems.push({ label: 'Admin Portal', to: '/admin' })
    }
  }
  return baseItems
})
</script>

<template>
  <header class="sticky top-0 z-30 w-full bg-[#0B0D10]/95 backdrop-blur-md border-b border-zinc-800">
    <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
      
      <!-- LEFT: Logo + Desktop Nav -->
      <div class="flex items-center gap-6">
        <NuxtLink
          to="/"
          class="focus-visible:outline-2 outline-orange-500 rounded-sm p-1 flex items-center gap-2 group hover:bg-zinc-900 transition-colors"
        >
          <AppLogo />
        </NuxtLink>

        <!-- Desktop Navigation Links -->
        <nav class="hidden md:flex items-center gap-1 border-l border-zinc-800 pl-5">
          <NuxtLink
            v-for="item in items"
            :key="item.to"
            :to="item.to"
            class="px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors"
            :class="route.path === item.to
              ? 'bg-zinc-900 text-orange-400 border border-zinc-800'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>

      <!-- RIGHT: Search + User Controls -->
      <div class="flex items-center gap-2">
        
        <!-- Search (Desktop / Tablet) -->
        <div ref="searchContainerRef" class="relative hidden sm:block w-52">
          <div class="relative flex items-center">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search members..."
              @focus="showSearchDropdown = searchQuery.trim().length >= 2"
              class="w-full pl-8 pr-7 py-1.5 bg-zinc-950 border border-zinc-800 focus:border-orange-500/80 rounded-sm text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors"
            />
            <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
            <span v-if="searchLoading" class="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin absolute right-2.5"></span>
            <button
              v-else-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute right-2 text-zinc-500 hover:text-zinc-200 font-mono text-[11px] cursor-pointer"
            >
              ✕
            </button>
          </div>

          <!-- Search Results Dropdown -->
          <transition name="dropdown">
            <div
              v-if="showSearchDropdown"
              class="absolute top-full left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl overflow-hidden z-50 max-h-[240px] overflow-y-auto divide-y divide-zinc-800/80"
            >
              <div v-if="searchLoading" class="p-3 text-center font-mono text-[11px] text-zinc-400">
                QUERYING_MEMBERS...
              </div>
              <div v-else-if="searchResults.length === 0" class="p-3 text-center font-mono text-[11px] text-zinc-500">
                NO_MATCHES_FOUND
              </div>
              <template v-else>
                <NuxtLink
                  v-for="resUser in searchResults"
                  :key="resUser.id"
                  :to="`/player/${resUser.id}`"
                  @click="showSearchDropdown = false"
                  class="flex items-center justify-between p-2.5 hover:bg-zinc-900 transition-colors group"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-6 h-6 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                      {{ resUser.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="text-left leading-tight truncate">
                      <span class="text-xs font-semibold text-zinc-100 group-hover:text-orange-400 transition-colors block truncate">
                        {{ resUser.name }}
                      </span>
                      <span class="text-[10px] font-mono text-zinc-500 block truncate">
                        @{{ resUser.username }}
                      </span>
                    </div>
                  </div>
                  <span class="text-[10px] font-mono font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-1.5 py-0.5 rounded-sm shrink-0">
                    HCP {{ resUser.handicapIndex }}
                  </span>
                </NuxtLink>
              </template>
            </div>
          </transition>
        </div>

        <!-- LOGGED OUT -->
        <template v-if="!isLoggedIn">
          <UButton
            label="Sign In"
            variant="ghost"
            to="/login"
            size="xs"
            class="rounded-sm text-zinc-400 hover:text-white hover:bg-zinc-900 font-medium px-3 py-1.5"
          />
          <UButton
            label="Register"
            to="/register"
            size="xs"
            class="rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold tracking-tight px-3 py-1.5 transition-colors"
          />
        </template>

        <!-- LOGGED IN CONTROLS -->
        <template v-else>
          <!-- Notification Bell -->
          <div ref="notificationsContainerRef" class="relative">
            <button
              @click="showNotifications = !showNotifications"
              aria-label="Notifications"
              class="w-8 h-8 shrink-0 rounded-sm bg-zinc-950 border border-zinc-800 hover:border-orange-500/60 flex items-center justify-center transition-colors group cursor-pointer relative"
            >
              <UIcon name="i-heroicons-bell" class="w-4 h-4 text-zinc-400 group-hover:text-orange-400 transition-colors" />
              <span
                v-if="pendingRequests.length > 0"
                class="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-[#0B0D10]"
              ></span>
            </button>

            <!-- Notification Dropdown -->
            <transition name="dropdown">
              <div
                v-if="showNotifications"
                class="absolute top-full right-0 mt-1.5 w-80 bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl overflow-hidden z-50"
              >
                <div class="flex items-center justify-between px-3 py-2 bg-zinc-900/70 border-b border-zinc-800">
                  <h3 class="text-[11px] font-mono font-bold text-zinc-200 uppercase tracking-wider">
                    Friend Requests
                  </h3>
                  <span class="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/30 px-1.5 py-0.5 rounded-sm">
                    {{ pendingRequests.length }}
                  </span>
                </div>

                <div v-if="notificationsLoading" class="p-4 text-center font-mono text-[11px] text-zinc-400">
                  SYNCING_REQUESTS...
                </div>

                <div v-else-if="pendingRequests.length === 0" class="p-4 text-center font-mono text-[11px] text-zinc-500">
                  NO_PENDING_REQUESTS
                </div>

                <div v-else class="divide-y divide-zinc-800/80 max-h-72 overflow-y-auto">
                  <div
                    v-for="req in pendingRequests"
                    :key="req.friendshipId"
                    class="p-3 hover:bg-zinc-900/40 transition-colors space-y-2"
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-6 h-6 rounded-sm bg-zinc-900 border border-zinc-700 text-orange-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {{ req.name.charAt(0).toUpperCase() }}
                      </div>
                      <div class="leading-tight min-w-0">
                        <span class="text-xs font-semibold text-zinc-100 truncate block">{{ req.name }}</span>
                        <span class="text-[10px] font-mono text-zinc-500 truncate block">@{{ req.username }}</span>
                      </div>
                    </div>
                    <p class="text-[11px] text-zinc-400">Sent a society friend request.</p>
                    <div class="flex gap-1.5 pt-0.5">
                      <button
                        @click="handleAcceptRequest(req.friendshipId, req.friendId)"
                        class="flex-1 py-1 bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 text-[11px] font-bold rounded-sm transition-colors cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        @click="handleRefuseRequest(req.friendshipId, req.friendId)"
                        class="flex-1 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-medium rounded-sm transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- Settings Trigger -->
          <button
            @click="showSettingsModal = true"
            aria-label="Player Settings"
            class="w-8 h-8 shrink-0 rounded-sm bg-zinc-950 border border-zinc-800 hover:border-orange-500/60 flex items-center justify-center transition-colors group cursor-pointer"
          >
            <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 text-zinc-400 group-hover:text-orange-400 transition-colors" />
          </button>

          <!-- Sign Out Trigger -->
          <button
            @click="handleLogout"
            aria-label="Sign out"
            class="w-8 h-8 shrink-0 rounded-sm bg-zinc-950 border border-zinc-800 hover:border-red-500/50 flex items-center justify-center transition-colors group cursor-pointer"
          >
            <UIcon name="i-heroicons-arrow-right-start-on-rectangle" class="w-4 h-4 text-zinc-400 group-hover:text-red-400 transition-colors" />
          </button>
        </template>

        <!-- Mobile Menu Toggle -->
        <button
          @click="showMobileMenu = !showMobileMenu"
          aria-label="Toggle Menu"
          class="md:hidden w-8 h-8 shrink-0 rounded-sm bg-zinc-950 border border-zinc-800 hover:border-zinc-600 flex items-center justify-center text-zinc-300 cursor-pointer"
        >
          <UIcon :name="showMobileMenu ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- MOBILE MENU DRAWER -->
    <transition name="dropdown">
      <div
        v-if="showMobileMenu"
        class="md:hidden border-t border-zinc-800 bg-[#0B0D10] px-4 py-3 space-y-3 shadow-2xl"
      >
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search society members..."
            class="w-full pl-8 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-sm text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
        </div>

        <div class="border border-zinc-800 divide-y divide-zinc-800 bg-zinc-950/60">
          <NuxtLink
            v-for="item in items"
            :key="item.to"
            :to="item.to"
            @click="showMobileMenu = false"
            class="px-3 py-2.5 text-xs font-medium transition-colors flex items-center justify-between"
            :class="route.path === item.to ? 'bg-zinc-900 text-orange-400 font-semibold' : 'text-zinc-300 hover:bg-zinc-900/50 hover:text-white'"
          >
            <span>{{ item.label }}</span>
            <span class="font-mono text-[10px] text-zinc-600">→</span>
          </NuxtLink>
        </div>

        <div v-if="!isLoggedIn" class="grid grid-cols-2 gap-2 pt-1">
          <UButton
            label="Sign In"
            variant="outline"
            to="/login"
            size="sm"
            block
            class="rounded-sm border-zinc-700 text-zinc-200 hover:bg-zinc-900"
            @click="showMobileMenu = false"
          />
          <UButton
            label="Register"
            to="/register"
            size="sm"
            block
            class="rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold"
            @click="showMobileMenu = false"
          />
        </div>
      </div>
    </transition>

    <!-- SETTINGS MODAL -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showSettingsModal"
          class="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          @click.self="showSettingsModal = false"
        >
          <div class="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-sm shadow-2xl overflow-hidden my-auto font-mono">
            
            <!-- Modal Header -->
            <div class="flex items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 text-orange-400" />
                <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-100">
                  Player Configuration
                </h2>
              </div>
              <button
                @click="showSettingsModal = false"
                class="w-6 h-6 flex items-center justify-center rounded-sm border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600 text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <!-- Modal Body -->
            <div class="p-4 space-y-4 font-sans">
              <div v-if="settingsSuccessMessage" class="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs rounded-sm">
                ✓ {{ settingsSuccessMessage }}
              </div>
              <div v-if="settingsErrorMessage" class="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs rounded-sm">
                ! {{ settingsErrorMessage }}
              </div>

              <div class="space-y-3">
                <div class="space-y-1.5">
                  <label class="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Display Name
                  </label>
                  <input
                    v-model="editName"
                    type="text"
                    class="w-full px-3 py-2 bg-[#0B0D10] border border-zinc-800 rounded-sm text-zinc-100 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div class="space-y-1.5">
                  <label class="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    WHS Handicap Index
                  </label>
                  <input
                    v-model.number="editHandicap"
                    type="number"
                    step="0.1"
                    min="-5.0"
                    max="54.0"
                    class="w-full px-3 py-2 bg-[#0B0D10] border border-zinc-800 rounded-sm text-zinc-100 font-mono text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <p class="text-[11px] font-mono text-zinc-500">
                    // .5 index values round up automatically
                  </p>
                </div>
              </div>

              <div class="flex gap-2 pt-2 border-t border-zinc-800/80">
                <UButton
                  @click="showSettingsModal = false"
                  variant="outline"
                  block
                  size="sm"
                  class="rounded-sm border-zinc-700 text-zinc-300 hover:bg-zinc-900 cursor-pointer font-mono text-xs uppercase"
                >
                  Cancel
                </UButton>
                <UButton
                  @click="handleSaveSettings"
                  :disabled="settingsSaving"
                  block
                  size="sm"
                  class="rounded-sm bg-[#F6821F] hover:bg-[#e57312] text-zinc-950 font-bold cursor-pointer font-mono text-xs uppercase"
                >
                  {{ settingsSaving ? 'Saving...' : 'Save Changes' }}
                </UButton>
              </div>
            </div>

            <!-- Safe area spacer for mobile -->
            <div class="h-[env(safe-area-inset-bottom)] sm:hidden"></div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </header>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>