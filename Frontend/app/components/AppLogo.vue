<template>
  <div class="flex items-center gap-2.5 group select-none">
    <!-- Cloudflare-Style Geometric Brand Mark -->
    <div class="relative w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-700 group-hover:border-orange-500/80 flex items-center justify-center transition-colors duration-200 overflow-hidden">
      <!-- Subtle top orange accent bar -->
      <span class="absolute top-0 inset-x-0 h-[2px] bg-[#F6821F]"></span>
      
      <!-- Crisp Architectural Flag / Horizon Mark -->
      <svg
        viewBox="0 0 24 24"
        fill="none"
        class="w-4 h-4 text-[#F6821F] group-hover:scale-105 transition-transform duration-200"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="square"
        stroke-linejoin="miter"
      >
        <path d="M6 20V4" />
        <path d="M6 4l11 4.5L6 13" fill="currentColor" fill-opacity="0.2" />
        <path d="M3 20h18" />
      </svg>
    </div>

    <!-- Brand Wordmark & Telemetry Tag -->
    <div class="flex flex-col">
      <div class="flex items-center gap-1.5">
        <span class="font-bold tracking-tight text-zinc-100 group-hover:text-white text-sm sm:text-base leading-none transition-colors">
          Earlybirds
        </span>
      </div>
      <span class="text-[9px] font-mono text-orange-400 font-semibold tracking-widest uppercase leading-tight mt-0.5">
        SOCIETY SCORER
      </span>
    </div>
  </div>
</template>