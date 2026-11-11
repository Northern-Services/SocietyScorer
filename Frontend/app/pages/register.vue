<script setup lang="ts">
import { ref } from 'vue'

const name = ref('')
const username = ref('')
const password = ref('')
const handicapIndex = ref<number>(18.0)

const loading = ref(false)
const errorMessage = ref('')

const handleRegister = async () => {
  errorMessage.value = ''

  if (!name.value.trim() || !username.value.trim() || !password.value) {
    errorMessage.value = 'Please complete all required fields.'
    return
  }

  loading.value = true

  try {
    const response: any = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        username: username.value.trim(),
        password: password.value,
        handicapIndex: Number(handicapIndex.value)
      }
    })

    if (response?.success) {
      await navigateTo('/dashboard', { replace: true })
    }
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || err?.statusMessage || 'Registration failed. Please check your details.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 py-8 pb-[max(8rem,env(safe-area-inset-bottom)+4rem)]">
    
    <!-- Cloudflare Console Registration Card -->
    <div class="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl relative overflow-hidden font-mono">

      <div class="p-6 space-y-6">
        
        <!-- Header Info -->
        <div class="space-y-1.5">
          <h1 class="text-xl font-bold tracking-tight text-zinc-100 font-sans">Join Earlybirds</h1>
          <p class="text-xs text-zinc-400 font-sans leading-relaxed">
            Initialize your player profile to log scorecards and sync WHS handicaps.
          </p>
        </div>

        <!-- Error Alert -->
        <transition name="fade">
          <div v-if="errorMessage" class="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-sm flex items-start gap-2.5">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span class="font-sans leading-relaxed">{{ errorMessage }}</span>
          </div>
        </transition>

        <!-- Registration Form -->
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
              Full Name
            </label>
            <input
              v-model="name"
              type="text"
              autocomplete="name"
              placeholder="e.g. Dave O’Connor"
              class="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-sm text-zinc-100 text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Username
              </label>
              <input
                v-model="username"
                type="text"
                autocomplete="username"
                placeholder="dave_oconnor"
                class="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-sm text-zinc-100 text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                WHS Handicap
              </label>
              <input
                v-model.number="handicapIndex"
                type="number"
                step="0.1"
                min="-5.0"
                max="54.0"
                class="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-sm text-orange-400 font-bold text-xs font-mono focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
              Password
            </label>
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••••••"
              class="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-sm text-zinc-100 text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 mt-1 bg-[#F6821F] hover:bg-[#e57312] active:bg-[#d46710] text-zinc-950 font-bold text-xs font-mono uppercase tracking-wider rounded-sm transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(246,130,31,0.2)]"
          >
            <span v-if="loading" class="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
            <span>{{ loading ? 'PROVISIONING...' : 'CREATE MEMBER ACCOUNT' }}</span>
          </button>
        </form>

        <!-- Footer Link -->
        <div class="text-center pt-4 border-t border-zinc-800/80 text-xs">
          <span class="text-zinc-500 font-sans">Already registered? </span><br/>
          <NuxtLink to="/login" class="text-orange-400 font-semibold hover:underline font-mono">Sign In</NuxtLink>
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