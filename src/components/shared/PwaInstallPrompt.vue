<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <section
      v-if="isInstallable"
      class="fixed bottom-[4.5rem] sm:bottom-4 right-3 sm:right-4 z-[60] w-[min(360px,calc(100vw-1.5rem))]"
      role="dialog"
      aria-label="Pasang aplikasi Buku Induk Digital"
    >
      <div class="rounded-2xl border border-primary-100 bg-white p-4 shadow-xl ring-1 ring-black/5">
        <div class="flex items-start gap-3">
          <img src="/favicon.svg" alt="" class="h-10 w-10 rounded-xl shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-800">Pasang Buku Induk Digital</p>
            <p class="mt-1 text-xs leading-relaxed text-slate-500">
              Akses aplikasi lebih cepat dari layar utama perangkat Anda.
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup"
            @click="dismiss"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mt-3 flex justify-end gap-2">
          <BaseButton variant="outline" size="sm" @click="dismiss">Nanti</BaseButton>
          <BaseButton size="sm" @click="handleInstall">
            <Download class="h-4 w-4" />
            Pasang
          </BaseButton>
        </div>
      </div>
    </section>
  </Transition>
</template>

<script setup lang="ts">
import { Download, X } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'
import { usePwaInstall } from '@/composables/usePwa'

const { isInstallable, install, dismiss } = usePwaInstall()

async function handleInstall() {
  const accepted = await install()
  if (!accepted) dismiss()
}
</script>
