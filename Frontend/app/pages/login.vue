<script setup lang="ts">
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  errorMessage.value = ''

  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Please enter both your username and password.'
    return
  }

  loading.value = true

  try {
    const response: any = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        username: username.value.trim(),
        password: password.value
      }
    })

    if (response?.success) {
      await navigateTo('/dashboard', { replace: true })
    }
  } catch (err: any) {
    errorMessage.value =
      err?.data?.statusMessage ||
      err?.statusMessage ||
      'Sign in failed. Please check your credentials.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 py-8 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)]">
    
    <!-- Cloudflare Console Authentication Card -->
    <div class="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl relative overflow-hidden font-mono">

      <div class="p-6 space-y-6">
        
        <!-- Header Info -->
        <div class="space-y-1.5">
          <h1 class="text-xl font-bold tracking-tight text-zinc-100 font-sans">Welcome Back</h1>
          <p class="text-xs text-zinc-400 font-sans">Authenticate to access Earlybirds Golf Society.</p>
        </div>

        <!-- Error Alert -->
        <transition name="fade">
          <div v-if="errorMessage" class="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-sm flex items-start gap-2.5">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span class="font-sans leading-relaxed">{{ errorMessage }}</span>
          </div>
        </transition>

        <!-- Form Fields -->
        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
              Username
            </label>
            <input
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="e.g. fairway_master"
              @keydown.enter="handleLogin"
              class="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-sm text-zinc-100 text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Password
              </label>
            </div>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••••••"
              @keydown.enter="handleLogin"
              class="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-sm text-zinc-100 text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <button
            type="button"
            @click="handleLogin"
            :disabled="loading"
            class="w-full py-2.5 bg-[#F6821F] hover:bg-[#e57312] active:bg-[#d46710] text-zinc-950 font-bold text-xs font-mono uppercase tracking-wider rounded-sm transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(246,130,31,0.2)]"
          >
            <span v-if="loading" class="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
            <span>{{ loading ? 'AUTHENTICATING...' : 'SIGN IN' }}</span>
          </button>
        </div>

        <!-- Footer Link -->
        <div class="text-center pt-4 border-t border-zinc-800/80 text-xs">
          <span class="text-zinc-500 font-sans">New society member? </span><br/>
          <NuxtLink to="/register" class="text-orange-400 font-semibold hover:underline font-mono">Register Account</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>