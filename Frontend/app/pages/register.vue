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
    const response: any = await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: name.value,
        username: username.value,
        password: password.value,
        handicapIndex: handicapIndex.value
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
  <div class="px-3 py-4 space-y-5 pb-[max(9rem,env(safe-area-inset-bottom)+4rem)]">

    <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-2xl backdrop-blur-xl space-y-4">

      <div class="text-center space-y-2">
        <div class="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-lg font-bold">
          ⛳
        </div>
        <h1 class="text-xl font-extrabold text-white">Join Earlybirds</h1>
        <p class="text-[11px] text-slate-400">Create your member profile to enter scorecards and track handicaps.</p>
      </div>

      <div v-if="errorMessage" class="p-2.5 bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] rounded-xl font-medium">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="handleRegister" class="space-y-3">
        <div class="space-y-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Full Name</label>
          <UInput v-model="name" placeholder="e.g. Dave O’Connor" size="sm" class="bg-slate-950/80 text-xs" />
        </div>

        <div class="space-y-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Username</label>
          <UInput v-model="username" placeholder="Choose a username" size="sm" class="bg-slate-950/80 text-xs" />
        </div>

        <div class="space-y-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Handicap Index</label>
          <UInput v-model.number="handicapIndex" type="number" step="0.1" min="-5.0" max="54.0" size="sm" class="bg-slate-950/80 text-xs" />
        </div>

        <div class="space-y-1.5">
          <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Password</label>
          <UInput v-model="password" type="password" placeholder="••••••••" size="sm" class="bg-slate-950/80 text-xs" />
        </div>

        <UButton
          type="submit"
          color="success"
          size="sm"
          block
          :loading="loading"
          class="font-bold shadow-lg shadow-emerald-500/20 cursor-pointer mt-1"
        >
          Create Member Account
        </UButton>
      </form>

      <div class="text-center pt-2 border-t border-slate-800/80">
        <span class="text-[11px] text-slate-400">Already registered? </span>
        <NuxtLink to="/login" class="text-[11px] text-emerald-400 font-semibold hover:underline">Sign In</NuxtLink>
      </div>

    </div>

  </div>
</template>