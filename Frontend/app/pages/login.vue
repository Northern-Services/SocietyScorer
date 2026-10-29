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
  <div class="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="w-full max-w-md bg-slate-900/90 border border-slate-800/80 p-8 rounded-3xl shadow-2xl backdrop-blur-2xl space-y-8 relative overflow-hidden">
      
      <!-- Decorative Glow Accent -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header Section -->
      <div class="text-center space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
          ⛳
        </div>
        <div class="space-y-1">
          <h1 class="text-2xl font-extrabold text-white tracking-tight">Welcome Back</h1>
          <p class="text-xs text-slate-400">Sign in to your Earlybirds Society member account.</p>
        </div>
      </div>

      <!-- Error Alert Banner -->
      <transition name="fade">
        <div v-if="errorMessage" class="p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl font-medium flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0 text-red-400" />
          <span>{{ errorMessage }}</span>
        </div>
      </transition>

      <!-- Input Controls (Div wrapper to prevent any native browser form reloads) -->
      <div class="space-y-5">
        
        <div class="space-y-2">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Username</label>
          <input 
            v-model="username" 
            type="text"
            autocomplete="username"
            placeholder="Enter your username" 
            @keydown.enter="handleLogin"
            class="w-full px-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner" 
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
          </div>
          <input 
            v-model="password" 
            type="password"
            autocomplete="current-password"
            placeholder="••••••••" 
            @keydown.enter="handleLogin"
            class="w-full px-4 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner" 
          />
        </div>

        <button 
          type="button"
          @click="handleLogin"
          :disabled="loading"
          class="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
        </button>
      </div>

      <!-- Footer Navigation Link -->
      <div class="text-center pt-4 border-t border-slate-800/80">
        <span class="text-xs text-slate-400">Don't have an account? </span>
        <NuxtLink to="/register" class="text-xs text-emerald-400 font-bold hover:underline">Register Now</NuxtLink>
      </div>

    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>