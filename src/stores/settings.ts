import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppSettings } from '@/types'
import { settingsService } from '@/services'

export const useSettingsStore = defineStore('settings', () => {
  const data = ref<AppSettings | null>(null)
  const isLoading = ref(false)
  const initialized = ref(false)

  const schoolName = computed(() => data.value?.schoolName ?? 'Madrasah/Sekolah')
  const principalName = computed(() => data.value?.principalName ?? '')
  const logoUrl = computed(() => data.value?.logoUrl ?? '')

  async function fetch(): Promise<void> {
    if (initialized.value) return
    isLoading.value = true
    try {
      data.value = await settingsService.get()
      initialized.value = true
    } catch {
      // Tidak fatal — pakai default
    } finally {
      isLoading.value = false
    }
  }

  async function update(payload: Partial<AppSettings>): Promise<void> {
    const updated = await settingsService.update(payload)
    data.value = updated
  }

  return { data, isLoading, initialized, schoolName, principalName, logoUrl, fetch, update }
})
