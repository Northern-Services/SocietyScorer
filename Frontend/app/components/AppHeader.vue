<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const route = useRoute()
const activeSection = ref<string>()

// 1. Live Member Search State
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const searchLoading = ref(false)
const showSearchDropdown = ref(false)
const searchContainerRef = ref<HTMLElement | null>(null)

// 2. Mobile Menu Drawer State
const showMobileMenu = ref(false)

// 3. Settings Modal State
const showSettingsModal = ref(false)
const editName = ref('')
const editHandicap = ref(18.0)
const settingsSaving = ref(false)
const settingsSuccessMessage = ref('')
const settingsErrorMessage = ref('')

// 4. Fetch current authentication status reactively
const { data: userRes, refresh: refreshUser } = await useFetch('/api/auth/me', {
  ignoreResponseError: true
})

watch(() => route.fullPath, () => {
  refreshUser()
  showSearchDropdown.value = false
  searchQuery.value = ''
  showMobileMenu.value = false
})

const isLoggedIn = computed(() => !!userRes.value?.success && !!userRes.value?.data)
const user = computed(() => userRes.value?.data)

// Sync settings form values when user data loads or modal opens
watch(user, (newUser) => {
  if (newUser) {
    editName.value = newUser.name || ''
    editHandicap.value = Number(newUser.handicapIndex || 18.0)
  }
}, { immediate: true })

// 5. Save User Settings (Handicap & Name)
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
      settingsSuccessMessage.value = 'Settings updated successfully!'
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

// 6. Logout handler
const handleLogout = async () => {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await refreshUser()
    await navigateTo('/')
  } catch (err) {
    console.error('Logout failed', err)
  }
}

// 7. Real-time Search Handler with Debounce
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
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    showSearchDropdown.value = false
    showSettingsModal.value = false
    showMobileMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})

// 8. Navigation Items
const items = computed(() => {
  const baseItems = [
    { label: 'Competitions', to: '/competitions' },
    { label: 'Members', to: '/members' },
    { label: 'Courses', to: '/courses' }
  ]

  if (isLoggedIn.value) {
    baseItems.unshift({ label: 'Dashboard', to: '/dashboard' })
    if (user.value?.role === 'ADMIN') {
      baseItems.push({ label: 'Admin Portal', to: '/admin' })
    }
  }

  return baseItems
})
</script>

<template>
  <!-- NON-STICKY FLOATING HEADER WRAPPER -->
  <header class="relative z-40 w-full pt-4 pb-2 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    
    <!-- GLASS CARD BAR -->
    <div class="relative bg-slate-900/90 border border-slate-800/90 rounded-3xl p-3 shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-3">
      
      <!-- Ambient Glow Behind Header -->
      <div class="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl"></div>

      <!-- LEFT: Logo & Mobile Toggle Button -->
      <div class="flex items-center gap-2">
        <!-- Mobile Menu Trigger -->
        <UButton
          icon="i-heroicons-bars-3"
          color="neutral"
          variant="ghost"
          size="sm"
          class="md:hidden text-slate-300 hover:text-white"
          @click="showMobileMenu = !showMobileMenu"
        />

        <NuxtLink to="/" class="focus-visible:outline-2 outline-emerald-500 rounded-2xl p-1.5 flex items-center gap-2 group hover:bg-slate-800/50 transition-all">
          <AppLogo />
        </NuxtLink>
      </div>

      <!-- CENTER: Navigation Menu (Desktop) -->
      <nav class="hidden md:flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
        <NuxtLink 
          v-for="item in items" 
          :key="item.to" 
          :to="item.to" 
          class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer"
          :class="route.path === item.to ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- RIGHT: Search & User Controls -->
      <div class="flex items-center gap-2.5">
        
        <!-- Search Input with Live Dropdown -->
        <div ref="searchContainerRef" class="relative hidden sm:block w-44 md:w-52">
          <div class="relative flex items-center">
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="Search society..."
              @focus="showSearchDropdown = searchQuery.trim().length >= 2"
              class="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800/90 focus:border-emerald-500/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
            <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
            
            <span v-if="searchLoading" class="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin absolute right-2.5"></span>
            <button v-else-if="searchQuery" @click="searchQuery = ''" class="absolute right-2.5 text-slate-500 hover:text-slate-300 text-xs font-bold">✕</button>
          </div>

          <!-- Search Results Dropdown -->
          <transition name="dropdown">
            <div v-if="showSearchDropdown" class="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 max-h-80 overflow-y-auto space-y-1 p-1.5">
              <div v-if="searchLoading" class="p-3 text-center text-xs text-slate-400">Searching members...</div>
              <div v-else-if="searchResults.length === 0" class="p-3 text-center text-xs text-slate-500">No members found</div>
              <template v-else>
                <NuxtLink 
                  v-for="resUser in searchResults" 
                  :key="resUser.id"
                  :to="`/player/${resUser.id}`"
                  @click="showSearchDropdown = false"
                  class="flex items-center justify-between p-2.5 hover:bg-slate-800/80 rounded-xl transition-colors group"
                >
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
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
          <UButton label="Sign In" color="neutral" variant="ghost" to="/login" size="sm" class="text-slate-400 hover:text-white hidden sm:inline-flex" />
          <UButton label="Register" color="success" variant="solid" to="/register" size="sm" class="font-semibold shadow-md shadow-emerald-500/20" />
        </template>

        <!-- LOGGED IN CONTROLS -->
        <template v-else>
          <!-- User Profile Trigger Button -->
          <button 
            @click="showSettingsModal = true"
            class="hidden lg:flex items-center gap-3 bg-slate-950/80 border border-slate-800/90 hover:border-emerald-500/50 px-3 py-1.5 rounded-xl transition-all group cursor-pointer text-left shadow-inner"
          >
            <div class="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
              {{ user?.name?.charAt(0) || 'U' }}
            </div>
            <div class="leading-tight min-w-[80px]">
              <span class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors block truncate max-w-[110px]">{{ user?.name }}</span>
              <span class="text-[10px] text-emerald-400 font-semibold block">HCP: {{ user?.handicapIndex }}</span>
            </div>
            <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
          </button>

          <!-- Settings Button (Mobile / Tablet) -->
          <UButton
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Settings"
            class="lg:hidden text-slate-400 hover:text-emerald-400"
            @click="showSettingsModal = true"
          />

          <!-- Logout Button -->
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

    <!-- MOBILE NAVIGATION DROPDOWN DRAWER -->
    <transition name="dropdown">
      <div v-if="showMobileMenu" class="md:hidden mt-2 bg-slate-900/95 border border-slate-800 rounded-3xl p-4 shadow-2xl backdrop-blur-xl space-y-3 z-50">
        
        <!-- Mobile Search Bar -->
        <div class="relative">
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search society members..."
            class="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <!-- Navigation Links Stack -->
        <div class="grid grid-cols-1 gap-1.5 pt-1">
          <NuxtLink 
            v-for="item in items" 
            :key="item.to" 
            :to="item.to"
            @click="showMobileMenu = false"
            class="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
            :class="route.path === item.to ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'"
          >
            <span>{{ item.label }}</span>
            <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 text-slate-500" />
          </NuxtLink>
        </div>

        <!-- Mobile Sign In / Register if logged out -->
        <div v-if="!isLoggedIn" class="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
          <UButton label="Sign In" color="neutral" variant="outline" to="/login" size="sm" block @click="showMobileMenu = false" />
          <UButton label="Register" color="success" variant="solid" to="/register" size="sm" block class="font-semibold" @click="showMobileMenu = false" />
        </div>

      </div>
    </transition>
  </header>

  <!-- SETTINGS MODAL -->
  <Transition name="modal">
    <div v-if="showSettingsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div class="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 relative">
        
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
            </div>
            <h2 class="text-base font-bold text-white">Player Settings</h2>
          </div>
          <button @click="showSettingsModal = false" class="text-slate-400 hover:text-white text-xs font-bold cursor-pointer">✕</button>
        </div>

        <div v-if="settingsSuccessMessage" class="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-medium">
          {{ settingsSuccessMessage }}
        </div>

        <div v-if="settingsErrorMessage" class="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl font-medium">
          {{ settingsErrorMessage }}
        </div>

        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Display Name</label>
            <input v-model="editName" type="text" class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="space-y-1.5">
            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">WHS Handicap Index</label>
            <input v-model.number="editHandicap" type="number" step="0.1" min="-5.0" max="54.0" class="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 font-bold" />
            <p class="text-[10px] text-slate-500">Note: .5 handicap values round up automatically in official playing calculations.</p>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <UButton @click="showSettingsModal = false" color="neutral" variant="ghost" block size="md" class="cursor-pointer">Cancel</UButton>
          <UButton @click="handleSaveSettings" :disabled="settingsSaving" color="success" block size="md" class="font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer">
            {{ settingsSaving ? 'Saving...' : 'Save Changes' }}
          </UButton>
        </div>

      </div>
    </div>
  </Transition>
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