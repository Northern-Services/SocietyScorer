<script setup lang="ts">
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      <div class="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/15 blur-[160px] rounded-full pointer-events-none z-0"></div>
      <div class="fixed top-[40%] right-[-10%] w-[600px] h-[600px] bg-teal-500/10 blur-[180px] rounded-full pointer-events-none z-0"></div>
      <div class="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 blur-[180px] rounded-full pointer-events-none z-0"></div>

      <AppHeader class="relative z-50" />

      <main class="flex-grow relative z-10">
        <NuxtPage />
      </main>

      <AppFooter class="relative z-50" />
    </div>
  </UApp>
</template>

<style>
.bg-grid-pattern {
  background-size: 32px 32px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}
</style>