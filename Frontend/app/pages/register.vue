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
  
  if (!name.value || !username.value || !password.value) {
    errorMessage.value = 'Please complete all required fields.'
    return
  }

  loading.value = true

  try {
    const endpoint = window.location.origin + '/api/auth/register';

    const response: any = await $fetch(endpoint, {
      method: 'POST',
      body: {
        name: name.value,
        username: username.value,
        password: password.value,
        handicapIndex: handicapIndex.value
      }
    })

    if (response?.success) {
      // Force navigation to dashboard
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
  <UContainer class="py-16 max-w-md mx-auto">
    <div class="bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-xl space-y-6">
      
      <!-- Header -->
      <div class="text-center space-y-2">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold">
          ⛳
        </div>
        <h1 class="text-2xl font-extrabold text-white">Join Earlybirds Society</h1>
        <p class="text-xs text-slate-400">Create your member profile to enter scorecards and track handicaps.</p>
      </div>

      <!-- Error Message Banner -->
      <div v-if="errorMessage" class="p-3 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl font-medium">
        {{ errorMessage }}
      </div>

      <!-- Registration Form -->
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
          <UInput v-model="name" placeholder="e.g. Dave O'Connor" size="lg" class="bg-slate-950/80" />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-wider text-slate-400">Username</label>
          <UInput v-model="username" placeholder="Choose a username" size="lg" class="bg-slate-950/80" />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Handicap Index</label>
          <UInput v-model.number="handicapIndex" type="number" step="0.1" min="-5.0" max="54.0" size="lg" class="bg-slate-950/80" />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-semibold uppercase tracking-wider text-slate-400">Password</label>
          <UInput v-model="password" type="password" placeholder="••••••••" size="lg" class="bg-slate-950/80" />
        </div>

        <UButton 
          type="submit" 
          color="success" 
          size="xl" 
          block 
          :loading="loading"
          class="font-semibold shadow-lg shadow-emerald-500/20 cursor-pointer mt-2"
        >
          Create Member Account
        </UButton>
      </form>

      <!-- Footer Link -->
      <div class="text-center pt-2 border-t border-slate-800/80">
        <span class="text-xs text-slate-400">Already registered? </span>
        <NuxtLink to="/login" class="text-xs text-emerald-400 font-semibold hover:underline">Sign In</NuxtLink>
      </div>

    </div>
  </UContainer>
</template>