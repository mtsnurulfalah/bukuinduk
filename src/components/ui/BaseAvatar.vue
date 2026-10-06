<template>
  <div
    :class="[
      'relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden',
      sizeClass,
      showImage ? 'bg-slate-200' : colorClass,
    ]"
  >
    <!-- BUG-14 FIX: Tampilkan gambar hanya jika src ada DAN belum error load.
         Saat gambar 404/gagal, imgError=true → fallback ke initials ditampilkan. -->
    <img
      v-if="showImage"
      :src="currentSrc"
      :alt="name ?? 'Avatar'"
      class="h-full w-full object-cover"
      referrerpolicy="no-referrer"
      decoding="async"
      @error="handleImageError"
    />
    <span
      v-else
      :class="['font-semibold text-white select-none', textSizeClass]"
    >
      {{ initials(name) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { initials, getPhotoUrlCandidates } from '@/utils'

interface Props {
  name?: string | null
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'green' | 'purple' | 'teal' | 'orange'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'blue',
})

const imgError = ref(false)
const candidateIndex = ref(0)

/**
 * Normalisasi URL foto siswa sebelum diberikan ke <img>.
 * Data lama dapat menyimpan URL Drive dalam beberapa bentuk; thumbnail
 * lebih konsisten untuk hotlink gambar dari Google Drive.
 */
function normalizeImageSrc(value: string | null | undefined): string {
  const src = String(value ?? '').trim()
  if (!src) return ''

  if (/^(data:image\/|blob:)/i.test(src)) return src

  if (/^https?:\/\/drive\.google\.com\//i.test(src)) {
    const fileId =
      src.match(/\/file\/d\/([A-Za-z0-9_-]+)/i)?.[1] ??
      src.match(/[?&]id=([A-Za-z0-9_-]+)/i)?.[1]

    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`
    }
  }

  return src
}

const resolvedSrc = computed(() => normalizeImageSrc(props.src))
const photoCandidates = computed(() => getPhotoUrlCandidates(props.src).length
  ? getPhotoUrlCandidates(props.src)
  : (resolvedSrc.value ? [resolvedSrc.value] : []))

const currentSrc = computed(() => photoCandidates.value[candidateIndex.value] ?? '')
const showImage = computed(() => Boolean(currentSrc.value) && !imgError.value)

function handleImageError() {
  if (candidateIndex.value < photoCandidates.value.length - 1) {
    candidateIndex.value += 1
    return
  }
  imgError.value = true
}

// Reset fallback chain saat sumber foto berubah.
watch(() => props.src, () => {
  candidateIndex.value = 0
  imgError.value = false
})

const sizeClass = computed(() => ({
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}[props.size]))

const textSizeClass = computed(() => ({
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
}[props.size]))

const colorClass = computed(() => ({
  blue:   'bg-primary-600',
  green:  'bg-green-600',
  purple: 'bg-purple-600',
  teal:   'bg-teal-600',
  orange: 'bg-orange-500',
}[props.color]))
</script>
