<template>
  <div class="w-full min-w-0 space-y-6 pb-6">
    <PageHeader title="Pengaturan" subtitle="Konfigurasi profil sekolah dan sistem" />

    <!-- Tab navigation -->
    <div class="flex max-w-full gap-0 overflow-x-auto border-b border-slate-200" role="group" aria-label="Bagian pengaturan">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :aria-pressed="activeTab === tab.key"
        :class="[
          'min-h-11 shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
          activeTab === tab.key
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-slate-500 hover:text-slate-700',
        ]"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" class="h-4 w-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab: Profil Sekolah -->
    <template v-if="activeTab === 'school'">
      <BaseAlert
        v-if="settingsLoadError"
        type="error"
        title="Pengaturan belum dapat dimuat"
      >
        {{ settingsLoadError }}
      </BaseAlert>
      <div v-if="settingsLoadError" class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <BaseButton
          type="button"
          variant="outline"
          size="sm"
          class="w-full sm:w-auto"
          :loading="isLoadingSettings"
          @click="loadSettingsData"
        >
          Coba Muat Ulang
        </BaseButton>
      </div>

      <BaseAlert
        v-if="isLoadingSettings"
        type="info"
        title="Memuat pengaturan"
        aria-live="polite"
      >
        Data profil sekolah sedang diambil dari server.
      </BaseAlert>
      <BaseAlert
        v-if="settingsStore.initialized && !schoolForm.schoolName.trim()"
        type="info"
        title="Profil sekolah belum lengkap"
      >
        Lengkapi nama sekolah/madrasah sebelum menyimpan profil.
      </BaseAlert>
      <BaseAlert
        v-if="!canManageSettings"
        type="warning"
        title="Akses lihat saja"
      >
        Anda dapat melihat profil sekolah, tetapi hanya pengguna dengan izin pengelolaan pengaturan yang dapat mengubahnya.
      </BaseAlert>
      <BaseAlert
        v-if="successMsg"
        type="success"
        title="Perubahan tersimpan"
        dismissible
        @dismiss="successMsg = ''"
      >
        {{ successMsg }}
      </BaseAlert>
      <BaseAlert
        v-if="errorMsg"
        type="error"
        title="Pengaturan belum tersimpan"
        dismissible
        @dismiss="errorMsg = ''"
      >
        {{ errorMsg }}
      </BaseAlert>

      <form
        novalidate
        class="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2"
        :aria-busy="isLoadingSettings || isSaving"
        @submit.prevent="saveSchoolSettings"
      >
        <BaseCard
          title="Identitas Sekolah/Madrasah"
          subtitle="Informasi resmi dan kontak sekolah"
          class="min-w-0"
        >
          <div class="mt-4 min-w-0 space-y-5">
            <BaseInput
              id="school-name"
              v-model="schoolForm.schoolName"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolName"
              label="Nama Sekolah/Madrasah"
              placeholder="Contoh: MTs Nurul Falah"
              autocomplete="organization"
              maxlength="255"
              required
            />
            <BaseInput
              id="school-npsn"
              v-model="schoolForm.schoolNpsn"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolNpsn"
              label="NPSN"
              placeholder="8 digit angka"
              hint="Masukkan 8 digit NPSN jika tersedia."
              inputmode="numeric"
              maxlength="8"
              autocomplete="off"
            />
            <BaseInput
              id="school-address"
              v-model="schoolForm.schoolAddress"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolAddress"
              label="Alamat"
              placeholder="Jalan, desa/kelurahan, kecamatan..."
              autocomplete="street-address"
            />
            <BaseInput
              id="school-phone"
              v-model="schoolForm.schoolPhone"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolPhone"
              label="Nomor Telepon"
              placeholder="Contoh: (0xx) xxxx-xxxx"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
            />
            <BaseInput
              id="school-email"
              v-model="schoolForm.schoolEmail"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolEmail"
              label="Email Sekolah"
              placeholder="info@sekolah.sch.id"
              type="email"
              inputmode="email"
              autocomplete="email"
            />
            <BaseInput
              id="school-website"
              v-model="schoolForm.schoolWebsite"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.schoolWebsite"
              label="Website"
              placeholder="https://sekolah.sch.id"
              inputmode="url"
              autocomplete="url"
            />
          </div>
        </BaseCard>

        <BaseCard
          title="Kepala Sekolah/Madrasah"
          subtitle="Informasi pimpinan sekolah"
          class="min-w-0"
        >
          <div class="mt-4 min-w-0 space-y-5">
            <BaseInput
              id="principal-name"
              v-model="schoolForm.principalName"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.principalName"
              label="Nama Kepala Sekolah"
              placeholder="Nama lengkap beserta gelar"
              autocomplete="name"
            />
            <BaseInput
              id="principal-nip"
              v-model="schoolForm.principalNip"
              :disabled="isSchoolFormDisabled"
              :error-message="schoolFormErrors.principalNip"
              label="NIP Kepala Sekolah"
              placeholder="NIP (opsional)"
              autocomplete="off"
            />
          </div>

          <!-- Tahun pelajaran aktif dikelola pada tab Tahun Pelajaran. -->
          <div class="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:p-4">
            <p class="mb-1 text-sm font-medium text-slate-700">Tahun Pelajaran Aktif</p>
            <p class="break-words text-sm text-slate-600">
              {{ schoolYearStore.activeSchoolYearName || 'Belum ada tahun pelajaran aktif' }}
            </p>
            <p class="mt-1 text-xs leading-relaxed text-slate-500">
              Untuk mengubah tahun pelajaran aktif, buka tab <strong>Tahun Pelajaran</strong>.
            </p>
          </div>
        </BaseCard>

        <div
          v-if="canManageSettings"
          class="flex min-w-0 flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-2"
        >
          <p
            v-if="isSchoolFormDirty"
            class="text-sm text-amber-700"
            role="status"
            aria-live="polite"
          >
            Perubahan belum disimpan.
          </p>
          <span v-else class="text-sm text-slate-500">
            Data tersimpan. Ubah isian untuk mengaktifkan tombol simpan.
          </span>
          <BaseButton
            type="submit"
            class="w-full sm:w-auto"
            :disabled="isSchoolFormDisabled || !isSchoolFormDirty"
            :loading="isSaving"
            loading-text="Menyimpan..."
          >
            <Save class="h-4 w-4" aria-hidden="true" />
            Simpan Pengaturan
          </BaseButton>
        </div>
      </form>
    </template>

    <!-- Tab: Tahun Pelajaran -->
    <template v-if="activeTab === 'schoolyear'">
      <BaseCard>
        <div class="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-slate-800">Daftar Tahun Pelajaran</h2>
            <p class="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              Kelola periode akademik dan tentukan satu tahun pelajaran yang sedang digunakan.
            </p>
          </div>
          <BaseButton
            v-if="canManageSettings"
            size="sm"
            class="w-full shrink-0 sm:w-auto"
            :disabled="isSchoolYearMutationBusy"
            @click="openAddSY"
          >
            <Plus class="h-4 w-4" aria-hidden="true" /> Tambah Tahun
          </BaseButton>
        </div>

        <BaseAlert v-if="!canManageSettings" class="mb-5" type="warning" title="Akses lihat saja">
          Anda dapat melihat daftar tahun pelajaran, tetapi hanya pengguna dengan izin pengelolaan pengaturan yang dapat menambah, mengaktifkan, atau menghapus periode.
        </BaseAlert>

        <div class="mb-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="flex min-w-0 items-start gap-3 rounded-xl border border-primary-100 bg-primary-50/60 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm">
              <Calendar class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tahun Pelajaran Aktif</p>
              <p class="mt-1 break-words text-sm font-semibold text-slate-800">
                {{ schoolYearStore.activeSchoolYearName || 'Belum ada tahun pelajaran aktif' }}
              </p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                Tahun ini digunakan sebagai periode akademik aktif aplikasi.
              </p>
            </div>
          </div>

          <div class="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
              <Database class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Tahun Pelajaran</p>
              <p class="mt-1 text-xl font-semibold tabular-nums text-slate-800">
                {{ schoolYearStore.schoolYears.length }}
              </p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">Periode yang tersimpan di daftar.</p>
            </div>
          </div>
        </div>

        <div v-if="schoolYearLoadError" class="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div class="min-w-0">
            <p class="break-words text-sm font-medium text-red-700">{{ schoolYearLoadError }}</p>
            <p v-if="schoolYearStore.schoolYears.length" class="mt-1 text-xs leading-relaxed text-red-600">
              Daftar yang tersedia masih ditampilkan; data terbaru dari server belum berhasil dipastikan.
            </p>
          </div>
          <BaseButton
            type="button"
            variant="outline"
            size="sm"
            class="w-full shrink-0 sm:w-auto"
            :loading="schoolYearStore.isLoading"
            :disabled="schoolYearStore.isLoading"
            @click="loadSchoolYears(true)"
          >
            Coba Lagi
          </BaseButton>
        </div>

        <div v-if="schoolYearStore.isLoading" class="space-y-2" role="status" aria-label="Memuat daftar tahun pelajaran" aria-busy="true" aria-live="polite">
          <BaseSkeleton v-for="i in 3" :key="i" height="h-14" />
        </div>
        <div v-else-if="!schoolYearStore.schoolYears.length && !schoolYearLoadError" class="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
          <Calendar class="mx-auto mb-3 h-9 w-9 text-slate-300" aria-hidden="true" />
          <p class="text-sm font-semibold text-slate-700">Belum ada tahun pelajaran</p>
          <p class="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
            Tambahkan periode akademik agar dapat menentukan tahun pelajaran aktif.
          </p>
          <BaseButton
            v-if="canManageSettings"
            size="sm"
            class="mt-4 w-full sm:w-auto"
            :disabled="isSchoolYearMutationBusy"
            @click="openAddSY"
          >
            <Plus class="mr-1 h-4 w-4" aria-hidden="true" /> Tambah Tahun Pelajaran
          </BaseButton>
        </div>
        <div v-else-if="schoolYearStore.schoolYears.length" class="min-w-0 divide-y divide-slate-100">
          <div
            v-for="sy in sortedSchoolYears"
            :key="sy.id || sy.name"
            class="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="break-words text-sm font-medium text-slate-800">{{ sy.name }}</p>
              <p class="mt-1 break-words text-xs text-slate-500">
                {{ formatDate(sy.startDate) }} – {{ formatDate(sy.endDate) }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              <BaseBadge v-if="sy.isActive" color="green" dot>Aktif</BaseBadge>
              <button
                v-if="canManageSettings && !sy.isActive"
                type="button"
                class="min-h-10 rounded-lg px-3 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isSchoolYearMutationBusy"
                :aria-label="`Jadikan tahun pelajaran ${sy.name} aktif`"
                @click="setActiveSY(sy.id)"
              >
                {{ isSettingActiveSY === sy.id ? 'Memproses...' : 'Jadikan Aktif' }}
              </button>
              <button
                v-if="canManageSettings && !sy.isActive"
                type="button"
                class="flex min-h-10 min-w-10 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="isSchoolYearMutationBusy"
                :aria-label="`Hapus tahun pelajaran ${sy.name}`"
                title="Hapus tahun pelajaran"
                @click="handleDeleteSY(sy.id, sy.name)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Modal tambah tahun pelajaran -->
      <BaseModal
        v-model="showAddSY"
        title="Tambah Tahun Pelajaran"
        subtitle="Lengkapi nama periode dan rentang tanggal akademik."
        size="sm"
        :show-close="!isSavingSY"
        :close-on-backdrop="!isSavingSY"
      >
        <form id="school-year-form" novalidate class="min-w-0 space-y-4" :aria-busy="isSavingSY" @submit.prevent="saveSY">
          <BaseAlert v-if="sySubmitError" type="error" title="Tahun pelajaran belum tersimpan">
            {{ sySubmitError }}
          </BaseAlert>
          <BaseInput id="school-year-name" v-model="syForm.name" label="Nama Tahun Pelajaran" placeholder="2026/2027" autocomplete="off" maxlength="9" required :disabled="isSavingSY" :error-message="syErrors.name" />
          <BaseInput id="school-year-start-date" v-model="syForm.startDate" label="Tanggal Mulai" type="date" required :disabled="isSavingSY" :error-message="syErrors.startDate" />
          <BaseInput id="school-year-end-date" v-model="syForm.endDate" label="Tanggal Selesai" type="date" :min="syForm.startDate || undefined" required :disabled="isSavingSY" :error-message="syErrors.endDate" />
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div class="flex items-start gap-3">
              <input id="syActive" v-model="syForm.isActive" type="checkbox" :disabled="isSavingSY" class="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              <div class="min-w-0">
                <label for="syActive" class="cursor-pointer text-sm font-medium text-slate-700">Jadikan tahun pelajaran aktif</label>
                <p class="mt-1 text-xs leading-relaxed text-slate-500">
                  Jika dipilih, tahun aktif sebelumnya akan dinonaktifkan setelah perubahan berhasil disimpan.
                </p>
              </div>
            </div>
          </div>
        </form>
        <template #footer>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <BaseButton type="button" variant="outline" size="sm" class="w-full sm:w-auto" :disabled="isSavingSY" @click="showAddSY = false">Batal</BaseButton>
            <BaseButton type="submit" form="school-year-form" size="sm" class="w-full sm:w-auto" :loading="isSavingSY" loading-text="Menyimpan...">Simpan</BaseButton>
          </div>
        </template>
      </BaseModal>

      <!-- BUG-57 FIX: Ganti window.confirm() dengan BaseConfirmDialog yang konsisten -->
      <BaseConfirmDialog
        v-model="confirmDeleteSY.isOpen.value"
        title="Hapus Tahun Pelajaran"
        :message="`Hapus tahun pelajaran '${confirmDeleteSY.options.value.message}'? Tindakan ini tidak dapat dibatalkan.`"
        type="danger"
        confirm-text="Ya, Hapus"
        :loading="confirmDeleteSY.isLoading.value"
        @confirm="confirmDoDeleteSY"
        @cancel="cancelDeleteSY"
      />
    </template>

    <!-- Tab: Backup -->
    <template v-if="activeTab === 'backup'">
      <BaseCard
        title="Backup Data"
        subtitle="Ekspor data Google Spreadsheet ke berkas JSON untuk arsip dan pemulihan."
        class="min-w-0"
      >
        <div class="mt-4 min-w-0 space-y-5" :aria-busy="isBackingUp">
          <div class="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Database class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <h2 class="text-sm font-semibold text-slate-800">Cadangan data aplikasi</h2>
              <p class="mt-1 break-words text-sm leading-relaxed text-slate-600">
                Backup memuat data dari sheet yang dikelola aplikasi dan manifest berisi versi,
                jumlah sheet, serta jumlah record. Unduhan hanya dibuat setelah backend menyatakan
                seluruh sheet berhasil dibaca.
              </p>
            </div>
          </div>

          <BaseAlert type="warning" title="Simpan berkas dengan aman">
            Berkas backup dapat memuat data pribadi siswa, orang tua, guru, dan catatan administrasi.
            Simpan di lokasi terbatas, jangan kirim melalui kanal publik, dan pastikan salinannya dapat diakses saat pemulihan diperlukan.
          </BaseAlert>

          <BaseAlert
            v-if="backupError"
            :key="backupError"
            type="error"
            title="Backup belum berhasil"
            dismissible
            @dismiss="backupError = ''"
          >
            <p class="break-words">{{ backupError }}</p>
          </BaseAlert>

          <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div v-if="canManageSettings" class="min-w-0">
              <BaseButton
                class="min-h-11 w-full sm:w-auto"
                :loading="isBackingUp"
                :disabled="isBackingUp"
                loading-text="Memvalidasi dan mengekspor..."
                @click="handleBackup"
              >
                <Download class="h-4 w-4" aria-hidden="true" />
                Download Backup JSON
              </BaseButton>
              <p class="mt-2 text-xs leading-relaxed text-slate-500">
                Proses dapat memerlukan waktu lebih lama jika data berukuran besar.
              </p>
            </div>
            <BaseAlert v-else type="warning" title="Akses lihat saja">
              Hanya administrator dengan izin pengelolaan pengaturan yang dapat membuat backup.
            </BaseAlert>
            <p
              v-if="isBackingUp"
              class="text-sm text-slate-500"
              role="status"
              aria-live="polite"
            >
              Memeriksa kelengkapan data sebelum menyiapkan unduhan…
            </p>
          </div>

          <div
            v-if="backupMeta"
            class="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
            aria-live="polite"
          >
            <div class="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-slate-800">Backup terakhir berhasil dibuat</p>
                <p class="mt-1 break-words text-xs text-slate-500">
                  {{ formatDateTime(backupMeta.generatedAt) }}
                </p>
                <p v-if="backupLastFileName" class="mt-1 break-all font-mono text-xs text-slate-500">
                  {{ backupLastFileName }}
                </p>
              </div>
              <BaseBadge color="green" dot>Lengkap</BaseBadge>
            </div>

            <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
              <div class="min-w-0 rounded-lg bg-slate-50 p-3">
                <p class="text-xs text-slate-500">Versi aplikasi</p>
                <p class="mt-1 break-words text-sm font-semibold text-slate-800">
                  {{ backupMeta.version }}
                </p>
              </div>
              <div class="min-w-0 rounded-lg bg-slate-50 p-3">
                <p class="text-xs text-slate-500">Sheet berhasil dicadangkan</p>
                <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                  {{ backupMeta.sheetCount }}
                </p>
              </div>
              <div class="min-w-0 rounded-lg bg-slate-50 p-3">
                <p class="text-xs text-slate-500">Total record</p>
                <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                  {{ backupTotalRecords.toLocaleString('id-ID') }}
                </p>
              </div>
            </div>
          </div>

          <div v-else class="flex min-w-0 items-start gap-3 rounded-xl border border-dashed border-slate-300 p-4">
            <Database class="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-700">Belum ada backup pada sesi ini</p>
              <p class="mt-1 break-words text-sm leading-relaxed text-slate-500">
                Jalankan backup untuk membuat berkas JSON dan melihat ringkasan jumlah sheet serta record yang berhasil dicadangkan.
              </p>
            </div>
          </div>
        </div>
      </BaseCard>

      <BaseCard
        v-if="canManageSettings"
        title="Riwayat dan Otomatisasi Backup"
        subtitle="Simpan snapshot privat, unduh cadangan sebelumnya, dan atur backup terjadwal."
        class="min-w-0"
      >
        <div class="min-w-0 space-y-5">
          <BaseAlert type="info" title="Penyimpanan aman">
            Snapshot disimpan di folder Google Drive privat milik akun yang menjalankan Apps Script.
            Backup otomatis berjalan sekitar pukul 02.00 sesuai zona waktu proyek GAS. Hash kata sandi
            pengguna tidak disertakan dalam file backup.
          </BaseAlert>
          <BaseAlert v-if="backupAutomationError" type="error" title="Pengaturan backup belum tersedia">
            <p class="break-words">{{ backupAutomationError }}</p>
            <p class="mt-1 text-xs">Fitur ini memerlukan gas-backend/ReportHandler.gs terbaru dan izin Google Drive/Apps Script yang sesuai.</p>
          </BaseAlert>
          <BaseAlert v-if="backupHistoryError" type="error" title="Riwayat backup gagal dimuat">
            {{ backupHistoryError }}
          </BaseAlert>

          <section class="min-w-0 space-y-3" aria-labelledby="backup-automation-heading">
            <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <h3 id="backup-automation-heading" class="text-sm font-semibold text-slate-800">Jadwal backup otomatis</h3>
                <p class="mt-1 text-sm leading-relaxed text-slate-500">
                  Jadwal baru aktif setelah disimpan. Backup otomatis tidak diaktifkan secara default.
                </p>
              </div>
              <BaseBadge v-if="backupAutomationState?.triggerInstalled && backupAutomation.enabled" color="green" dot>Terjadwal</BaseBadge>
              <BaseBadge v-else color="slate">Tidak aktif</BaseBadge>
            </div>
            <div class="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
              <label class="min-w-0">
                <span class="mb-1.5 block text-sm font-medium text-slate-700">Status</span>
                <select v-model="backupAutomation.enabled" :disabled="isLoadingBackupHistory || isSavingBackupAutomation || isCreatingBackupSnapshot" class="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option :value="false">Nonaktif</option>
                  <option :value="true">Aktif</option>
                </select>
              </label>
              <label class="min-w-0">
                <span class="mb-1.5 block text-sm font-medium text-slate-700">Frekuensi</span>
                <select v-model="backupAutomation.frequency" :disabled="isLoadingBackupHistory || isSavingBackupAutomation || isCreatingBackupSnapshot" class="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option value="daily">Setiap hari</option>
                  <option value="weekly">Setiap minggu</option>
                </select>
              </label>
              <label class="min-w-0">
                <span class="mb-1.5 block text-sm font-medium text-slate-700">Retensi snapshot</span>
                <select v-model.number="backupAutomation.retention" :disabled="isLoadingBackupHistory || isSavingBackupAutomation || isCreatingBackupSnapshot" class="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option :value="5">5 backup terakhir</option>
                  <option :value="10">10 backup terakhir</option>
                  <option :value="20">20 backup terakhir</option>
                </select>
              </label>
            </div>
            <p v-if="backupAutomationState" class="break-words text-xs leading-relaxed text-slate-500">
              Zona waktu GAS: {{ backupAutomationState.timezone || 'mengikuti konfigurasi proyek' }}.
              Retensi menghapus snapshot Drive yang lebih lama setelah backup baru berhasil dibuat.
            </p>
            <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
              <BaseButton type="button" class="w-full sm:w-auto" :disabled="isLoadingBackupHistory || isSavingBackupAutomation || isCreatingBackupSnapshot" :loading="isSavingBackupAutomation" loading-text="Menyimpan jadwal..." @click="saveBackupAutomation">
                <Save class="h-4 w-4" aria-hidden="true" /> Simpan Jadwal
              </BaseButton>
              <BaseButton type="button" variant="outline" class="w-full sm:w-auto" :disabled="isLoadingBackupHistory || isSavingBackupAutomation || isCreatingBackupSnapshot" :loading="isCreatingBackupSnapshot" loading-text="Membuat snapshot..." @click="createStoredBackup">
                <Database class="h-4 w-4" aria-hidden="true" /> Buat Snapshot Sekarang
              </BaseButton>
              <BaseButton type="button" variant="outline" class="w-full sm:w-auto" :disabled="isLoadingBackupHistory || isSavingBackupAutomation || isCreatingBackupSnapshot" @click="loadBackupAutomation">
                Muat Ulang Riwayat
              </BaseButton>
            </div>
          </section>

          <section class="min-w-0 border-t border-slate-200 pt-4" aria-labelledby="backup-history-heading">
            <div class="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <h3 id="backup-history-heading" class="text-sm font-semibold text-slate-800">Riwayat snapshot</h3>
                <p class="mt-1 text-sm text-slate-500">Daftar berisi snapshot manual dan otomatis; file yang gagal dibuat tetap dicatat untuk audit operasional.</p>
              </div>
              <span class="shrink-0 text-xs text-slate-500">{{ backupHistory.length }} entri</span>
            </div>
            <p v-if="isLoadingBackupHistory" class="py-5 text-sm text-slate-500" role="status" aria-live="polite">Memuat status dan riwayat backup...</p>
            <div v-else-if="!backupHistory.length" class="rounded-xl border border-dashed border-slate-300 p-5 text-center">
              <Database class="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
              <p class="mt-2 text-sm font-medium text-slate-700">Belum ada snapshot tersimpan</p>
              <p class="mt-1 text-sm text-slate-500">Gunakan “Buat Snapshot Sekarang” atau aktifkan jadwal otomatis.</p>
            </div>
            <div v-else class="min-w-0 space-y-3">
              <article v-for="item in backupHistory" :key="item.id" class="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0">
                  <div class="flex min-w-0 flex-wrap items-center gap-2">
                    <p class="break-all text-sm font-semibold text-slate-800">{{ item.fileName || (item.status === 'failed' ? 'Snapshot gagal dibuat' : 'Snapshot backup') }}</p>
                    <BaseBadge v-if="item.status === 'success'" color="green" dot>Berhasil</BaseBadge>
                    <BaseBadge v-else color="red" dot>Gagal</BaseBadge>
                    <BaseBadge v-if="item.source === 'scheduled'" color="blue">Otomatis</BaseBadge>
                    <BaseBadge v-else>Manual</BaseBadge>
                  </div>
                  <p class="mt-1 break-words text-xs text-slate-500">{{ formatDateTime(item.generatedAt) }}</p>
                  <p v-if="item.status === 'success'" class="mt-1 break-words text-xs text-slate-600">
                    {{ item.sheetCount }} sheet · {{ item.recordCount.toLocaleString('id-ID') }} record · {{ formatStoredBackupSize(item.sizeBytes) }}
                  </p>
                  <p v-else class="mt-1 break-words text-xs text-red-700">{{ item.error || 'Tidak ada detail error dari backend.' }}</p>
                </div>
                <BaseButton v-if="item.status === 'success'" type="button" variant="outline" class="w-full shrink-0 sm:w-auto lg:self-center" :disabled="isDownloadingBackupId !== null || isCreatingBackupSnapshot || isSavingBackupAutomation" :loading="isDownloadingBackupId === item.id" loading-text="Menyiapkan..." @click="downloadStoredBackup(item)">
                  <Download class="h-4 w-4" aria-hidden="true" /> Unduh JSON
                </BaseButton>
              </article>
            </div>
          </section>
        </div>
      </BaseCard>

      <BaseCard
        v-if="canManageSettings"
        title="Pemeriksa File Backup JSON"
        subtitle="Buka backup dari komputer untuk memeriksa kelengkapan dan melihat ringkasan data tanpa mengubah data aplikasi."
        class="min-w-0"
      >
        <div class="min-w-0 space-y-4">
          <div class="flex min-w-0 items-start gap-3 rounded-xl border border-primary-100 bg-primary-50/50 p-4">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-700 shadow-sm">
              <ShieldCheck class="h-5 w-5" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-800">Validasi lokal, tanpa restore</p>
              <p class="mt-1 break-words text-sm leading-relaxed text-slate-600">
                File diperiksa langsung di browser. Data tidak dikirim ke server, tidak disimpan sebagai riwayat, dan tidak ditulis ke Google Spreadsheet.
              </p>
            </div>
          </div>

          <input
            ref="backupFileInput"
            type="file"
            accept=".json,application/json"
            class="sr-only"
            aria-label="Pilih file backup JSON"
            :disabled="isReadingBackupFile"
            @change="handleBackupFileChange"
          />

          <div class="flex min-w-0 flex-col gap-3 rounded-xl border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 items-start gap-3">
              <FileJson class="mt-0.5 h-6 w-6 shrink-0 text-slate-400" aria-hidden="true" />
              <div class="min-w-0">
                <p class="break-words text-sm font-semibold text-slate-800">Pilih berkas backup</p>
                <p class="mt-1 text-xs leading-relaxed text-slate-500">
                  Gunakan berkas .json yang dihasilkan fitur Download Backup JSON. Ukuran maksimum 50 MB.
                </p>
                <p v-if="backupViewerResult" class="mt-2 break-all font-mono text-xs text-slate-600">
                  {{ backupViewerResult.fileName }} · {{ formatBackupFileSize(backupViewerResult.fileSize) }}
                </p>
              </div>
            </div>
            <BaseButton
              type="button"
              variant="outline"
              class="w-full shrink-0 sm:w-auto"
              :disabled="isReadingBackupFile"
              :loading="isReadingBackupFile"
              loading-text="Memeriksa file..."
              @click="openBackupFilePicker"
            >
              <Upload class="h-4 w-4" aria-hidden="true" />
              Pilih File JSON
            </BaseButton>
          </div>

          <p v-if="isReadingBackupFile" class="text-sm text-slate-500" role="status" aria-live="polite">
            Membaca dan memvalidasi file di browser...
          </p>

          <template v-if="backupViewerResult">
            <BaseAlert
              :type="backupViewerResult.valid ? 'success' : 'error'"
              :title="backupViewerResult.valid ? 'File backup valid dan lengkap' : 'File backup perlu diperiksa'"
              aria-live="polite"
            >
              <p v-if="backupViewerResult.valid">
                Struktur file, manifest, jumlah sheet, dan jumlah record cocok. File siap ditinjau, tetapi fitur ini belum melakukan pemulihan data.
              </p>
              <p v-else>
                File tidak dinyatakan valid untuk pemulihan. Periksa masalah di bawah ini. Pratinjau yang tersedia hanya untuk membantu pemeriksaan.
              </p>
              <ul v-if="backupViewerResult.errors.length" class="mt-2 list-disc space-y-1 pl-5">
                <li v-for="(message, index) in backupViewerResult.errors.slice(0, 8)" :key="index" class="break-words">
                  {{ message }}
                </li>
              </ul>
              <p v-if="backupViewerResult.errors.length > 8" class="mt-2 text-xs">
                Masih ada {{ backupViewerResult.errors.length - 8 }} masalah lainnya.
              </p>
            </BaseAlert>

            <BaseAlert
              v-if="backupViewerResult.warnings.length"
              type="warning"
              title="Catatan pemeriksaan"
            >
              <ul class="list-disc space-y-1 pl-5">
                <li v-for="(message, index) in backupViewerResult.warnings" :key="index" class="break-words">
                  {{ message }}
                </li>
              </ul>
            </BaseAlert>

            <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan file backup">
              <div class="min-w-0 rounded-lg border border-slate-200 p-3">
                <p class="text-xs text-slate-500">Status validasi</p>
                <p class="mt-1 flex items-center gap-2 text-sm font-semibold" :class="backupViewerResult.valid ? 'text-emerald-700' : 'text-red-700'">
                  <CheckCircle v-if="backupViewerResult.valid" class="h-4 w-4 shrink-0" aria-hidden="true" />
                  <AlertTriangle v-else class="h-4 w-4 shrink-0" aria-hidden="true" />
                  {{ backupViewerResult.valid ? 'Valid dan lengkap' : 'Tidak valid / perlu tinjauan' }}
                </p>
              </div>
              <div class="min-w-0 rounded-lg border border-slate-200 p-3">
                <p class="text-xs text-slate-500">Versi backup</p>
                <p class="mt-1 break-words text-sm font-semibold text-slate-800">
                  {{ backupViewerResult.meta?.version || 'Tidak tersedia' }}
                </p>
              </div>
              <div class="min-w-0 rounded-lg border border-slate-200 p-3">
                <p class="text-xs text-slate-500">Jumlah sheet</p>
                <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                  {{ backupViewerResult.sheetNames.length.toLocaleString('id-ID') }}
                </p>
              </div>
              <div class="min-w-0 rounded-lg border border-slate-200 p-3">
                <p class="text-xs text-slate-500">Total record terbaca</p>
                <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">
                  {{ backupViewerResult.totalRecords.toLocaleString('id-ID') }}
                </p>
              </div>
            </div>

            <div v-if="backupViewerResult.meta" class="rounded-lg bg-slate-50 p-3 text-sm">
              <dl class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="min-w-0">
                  <dt class="text-xs text-slate-500">Tanggal backup</dt>
                  <dd class="mt-1 break-words font-medium text-slate-700">
                    {{ formatDateTime(backupViewerResult.meta.generatedAt) }}
                  </dd>
                </div>
                <div class="min-w-0">
                  <dt class="text-xs text-slate-500">Status pada manifest</dt>
                  <dd class="mt-1 break-words font-medium" :class="backupViewerResult.meta.complete ? 'text-emerald-700' : 'text-red-700'">
                    {{ backupViewerResult.meta.complete ? 'Ditandai lengkap' : 'Ditandai tidak lengkap' }}
                  </dd>
                </div>
              </dl>
            </div>

            <div v-if="backupViewerResult.sheetNames.length" class="min-w-0 space-y-4 border-t border-slate-200 pt-4">
              <div class="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div class="min-w-0">
                  <label for="backup-viewer-sheet" class="mb-1.5 block text-sm font-medium text-slate-700">
                    Sheet yang ditinjau
                  </label>
                  <select
                    id="backup-viewer-sheet"
                    v-model="backupViewerSheet"
                    class="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    <option v-for="sheetName in backupViewerResult.sheetNames" :key="sheetName" :value="sheetName">
                      {{ sheetName }} ({{ backupViewerResult.counts[sheetName] ?? backupViewerResult.data[sheetName]?.length ?? 0 }})
                    </option>
                  </select>
                </div>
                <div class="min-w-0">
                  <label for="backup-viewer-search" class="mb-1.5 block text-sm font-medium text-slate-700">
                    Cari di sheet terpilih
                  </label>
                  <div class="relative">
                    <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="backup-viewer-search"
                      v-model="backupViewerSearch"
                      type="search"
                      autocomplete="off"
                      placeholder="Cari nilai atau nama kolom..."
                      class="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                  </div>
                </div>
              </div>

              <div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p class="break-words text-sm font-medium text-slate-700">
                  {{ backupViewerSheet || '—' }}
                </p>
                <p class="text-xs tabular-nums text-slate-500">
                  {{ filteredBackupRecords.length.toLocaleString('id-ID') }} record cocok
                </p>
              </div>

              <div v-if="!filteredBackupRecords.length" class="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
                <p class="text-sm font-medium text-slate-700">Tidak ada record yang cocok</p>
                <p class="mt-1 text-xs text-slate-500">Coba kata kunci lain atau pilih sheet yang berbeda.</p>
              </div>

              <div v-else class="min-w-0 space-y-3">
                <article
                  v-for="(record, recordIndex) in previewBackupRecords"
                  :key="backupViewerSheet + '-' + recordIndex"
                  class="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4"
                >
                  <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Record pratinjau {{ recordIndex + 1 }}
                  </p>
                  <dl class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div v-for="field in getBackupRecordFields(record)" :key="field" class="min-w-0">
                      <dt class="break-words text-xs font-medium text-slate-500">{{ field }}</dt>
                      <dd class="mt-1 break-words text-sm text-slate-800">{{ formatBackupValue(isRecord(record) ? record[field] : undefined) }}</dd>
                    </div>
                  </dl>
                  <p v-if="getBackupRecordFieldCount(record) > 12" class="mt-3 text-xs text-slate-500">
                    {{ getBackupRecordFieldCount(record) - 12 }} kolom lainnya tidak ditampilkan pada pratinjau ini.
                  </p>
                </article>
                <p class="text-xs leading-relaxed text-slate-500">
                  {{ filteredBackupRecords.length > 10 ? 'Hanya 10 record pertama yang ditampilkan.' : 'Seluruh hasil yang cocok ditampilkan.' }}
                  Nilai panjang dipersingkat demi keterbacaan.
                </p>
              </div>
            </div>
            <div v-else class="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
              <FileJson class="mx-auto mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />
              <p class="text-sm font-medium text-slate-700">Data sheet belum dapat ditampilkan</p>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">
                Pastikan file memuat array data sheet seperti pada format backup aplikasi.
              </p>
            </div>
          </template>
        </div>
      </BaseCard>

      <BaseAlert
        v-else
        type="warning"
        title="Akses pemeriksaan backup terbatas"
      >
        File backup dapat berisi informasi pribadi siswa, orang tua, dan guru. Hanya administrator dengan izin pengelolaan pengaturan yang dapat menggunakan viewer dan validator ini.
      </BaseAlert>
      <BaseCard
        v-if="canManageSettings"
        title="Restore Selektif dan Gabungkan Data"
        subtitle="Pilih sheet tertentu, tinjau dampaknya dari server, lalu gabungkan atau ganti data dengan konfirmasi eksplisit."
        class="min-w-0"
      >
        <div class="min-w-0 space-y-5">
          <BaseAlert type="warning" title="Periksa cakupan dan relasi data sebelum restore">
            Mode gabungkan menambahkan ID baru dan menangani ID yang sudah ada sesuai strategi konflik.
            Mode ganti menghapus record lama hanya pada sheet yang dipilih, lalu mengisinya dari backup.
            Sheet <strong>users</strong> dan <strong>audit_logs</strong> selalu dilindungi. Memulihkan hanya sebagian sheet yang saling berelasi dapat membuat relasi data tidak lengkap.
          </BaseAlert>

          <BaseAlert v-if="restoreError" type="error" title="Restore belum berhasil" dismissible @dismiss="restoreError = ''">
            <p class="break-words">{{ restoreError }}</p>
          </BaseAlert>

          <BaseAlert v-if="restoreResult" type="success" title="Restore berhasil" aria-live="polite">
            <p>
              {{ restoreResult.restoredSheets.length }} sheet berhasil diproses;
              {{ restoreResult.totalRecords.toLocaleString('id-ID') }}
              {{ restoreResult.mode === 'merge' ? 'record ditambahkan atau diperbarui' : 'record diterapkan dari backup' }}.
              Akun pengguna dan log audit lama tetap dipertahankan.
            </p>
            <p class="mt-1 text-xs text-emerald-800">Waktu selesai: {{ formatDateTime(restoreResult.restoredAt) }}</p>
            <BaseButton type="button" class="mt-3 w-full sm:w-auto" size="sm" @click="reloadAfterRestore">
              Muat Ulang Aplikasi
            </BaseButton>
          </BaseAlert>

          <BaseAlert v-if="!canPrepareRestore" type="info" title="Backup belum siap dipulihkan">
            Pilih file JSON yang valid dan lengkap pada bagian Pemeriksa File Backup JSON di atas.
            Ukuran file restore maksimum 10 MB. File besar tetap dapat diperiksa, tetapi tidak dapat dikirim melalui alur restore.
          </BaseAlert>

          <template v-if="canPrepareRestore">
            <section class="min-w-0 space-y-3" aria-labelledby="restore-sheets-heading">
              <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <h3 id="restore-sheets-heading" class="text-sm font-semibold text-slate-800">1. Pilih sheet</h3>
                  <p class="mt-1 text-xs leading-relaxed text-slate-500">
                    {{ selectedRestoreSheets.length }} dari {{ RESTORE_TARGET_SHEETS.length }} sheet dipilih.
                    Users dan audit logs tidak dapat dipilih untuk restore.
                  </p>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2">
                  <BaseButton type="button" variant="outline" size="sm" :disabled="isPreparingRestorePreview || isRestoringBackup" @click="selectAllRestoreSheets">
                    Pilih Semua
                  </BaseButton>
                  <BaseButton type="button" variant="outline" size="sm" :disabled="!selectedRestoreSheets.length || isPreparingRestorePreview || isRestoringBackup" @click="clearRestoreSheetSelection">
                    Hapus Pilihan
                  </BaseButton>
                </div>
              </div>

              <div class="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <label
                  v-for="sheetName in RESTORE_TARGET_SHEETS"
                  :key="sheetName"
                  class="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
                  :class="selectedRestoreSheets.includes(sheetName) ? 'border-primary-300 bg-primary-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'"
                >
                  <input
                    v-model="selectedRestoreSheets"
                    type="checkbox"
                    :value="sheetName"
                    :disabled="isPreparingRestorePreview || isRestoringBackup"
                    class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block break-words text-sm font-medium text-slate-800">{{ RESTORE_SHEET_LABELS[sheetName] || sheetName }}</span>
                    <span class="mt-1 block break-all text-xs text-slate-500">{{ sheetName }}</span>
                    <span class="mt-1 block text-xs tabular-nums text-slate-600">
                      {{ (backupViewerResult?.counts[sheetName] ?? 0).toLocaleString('id-ID') }} record di backup
                    </span>
                  </span>
                </label>
              </div>
              <p v-if="!selectedRestoreSheets.length" class="text-sm text-amber-700" role="status">
                Pilih minimal satu sheet sebelum menghitung pratinjau.
              </p>
            </section>

            <section class="min-w-0 space-y-3 border-t border-slate-200 pt-4" aria-labelledby="restore-mode-heading">
              <h3 id="restore-mode-heading" class="text-sm font-semibold text-slate-800">2. Tentukan cara pemulihan</h3>
              <div class="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                <label class="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-4" :class="restoreMode === 'merge' ? 'border-primary-300 bg-primary-50/60' : 'border-slate-200'">
                  <input v-model="restoreMode" type="radio" name="restore-mode" value="merge" :disabled="isPreparingRestorePreview || isRestoringBackup" class="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-primary-600 focus:ring-primary-500" />
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-slate-800">Gabungkan berdasarkan ID</span>
                    <span class="mt-1 block text-sm leading-relaxed text-slate-600">
                      Record baru ditambahkan. ID yang sudah ada dipertahankan atau diperbarui sesuai strategi konflik. Record lain tidak dihapus.
                    </span>
                  </span>
                </label>
                <label class="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-4" :class="restoreMode === 'replace' ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200'">
                  <input v-model="restoreMode" type="radio" name="restore-mode" value="replace" :disabled="isPreparingRestorePreview || isRestoringBackup" class="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-primary-600 focus:ring-primary-500" />
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-slate-800">Ganti isi sheet terpilih</span>
                    <span class="mt-1 block text-sm leading-relaxed text-slate-600">
                      Semua record saat ini pada sheet terpilih akan diganti dengan isi backup, termasuk record yang tidak ada dalam file.
                    </span>
                  </span>
                </label>
              </div>

              <div v-if="restoreMode === 'merge'" class="min-w-0">
                <label for="restore-conflict-strategy" class="mb-1.5 block text-sm font-medium text-slate-700">Jika ID sudah ada</label>
                <select
                  id="restore-conflict-strategy"
                  v-model="restoreConflictStrategy"
                  :disabled="isPreparingRestorePreview || isRestoringBackup"
                  class="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:max-w-xl"
                >
                  <option value="keepExisting">Pertahankan data saat ini (paling aman)</option>
                  <option value="overwriteExisting">Timpa record yang ID-nya sama dengan data backup</option>
                </select>
                <p class="mt-1 text-xs leading-relaxed text-slate-500">
                  Pilihan timpa akan mengganti semua kolom record bentrok yang dipilih, bukan menggabungkan tiap kolom satu per satu.
                </p>
              </div>
            </section>

            <section class="min-w-0 space-y-3 border-t border-slate-200 pt-4" aria-labelledby="restore-preview-heading">
              <h3 id="restore-preview-heading" class="text-sm font-semibold text-slate-800">3. Hitung dampak di server</h3>
              <p class="text-sm leading-relaxed text-slate-600">
                Backend membaca keadaan Spreadsheet saat ini dan menghitung record baru, konflik, record yang akan ditimpa, atau record lama yang akan dihapus.
                Perhitungan ini tidak menulis data.
              </p>
              <BaseButton
                type="button"
                class="w-full sm:w-auto"
                :disabled="!canPreviewRestore"
                :loading="isPreparingRestorePreview"
                loading-text="Menghitung pratinjau..."
                @click="handlePreviewRestore"
              >
                <ShieldCheck class="h-4 w-4" aria-hidden="true" />
                Hitung Pratinjau
              </BaseButton>

              <template v-if="restorePreview">
                <BaseAlert :type="restorePreview.mode === 'replace' ? 'warning' : 'info'" title="Pratinjau dihitung oleh backend">
                  <p v-if="restorePreview.mode === 'merge'">
                    {{ restorePreview.totals.added.toLocaleString('id-ID') }} record baru akan ditambahkan,
                    {{ restorePreview.totals.updated.toLocaleString('id-ID') }} diperbarui,
                    dan {{ restorePreview.totals.skipped.toLocaleString('id-ID') }} dilewati karena ID sudah ada.
                    Tidak ada record lama yang dihapus.
                  </p>
                  <p v-else>
                    {{ restorePreview.totals.currentRecords.toLocaleString('id-ID') }} record lama akan dihapus dari sheet terpilih lalu diganti dengan
                    {{ restorePreview.totals.backupRecords.toLocaleString('id-ID') }} record dari backup.
                  </p>
                  <p class="mt-1 text-xs">Pratinjau dibuat: {{ formatDateTime(restorePreview.generatedAt) }}. Backend akan memeriksa ulang perubahan data sebelum menulis.</p>
                </BaseAlert>

                <div class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Ringkasan pratinjau restore">
                  <div class="min-w-0 rounded-lg border border-slate-200 p-3">
                    <p class="text-xs text-slate-500">Sheet terpilih</p>
                    <p class="mt-1 text-lg font-semibold tabular-nums text-slate-800">{{ restorePreview.sheets.length }}</p>
                  </div>
                  <div class="min-w-0 rounded-lg border border-slate-200 p-3">
                    <p class="text-xs text-slate-500">{{ restorePreview.mode === 'merge' ? 'Record baru' : 'Record backup' }}</p>
                    <p class="mt-1 text-lg font-semibold tabular-nums text-slate-800">{{ (restorePreview.mode === 'merge' ? restorePreview.totals.added : restorePreview.totals.backupRecords).toLocaleString('id-ID') }}</p>
                  </div>
                  <div class="min-w-0 rounded-lg border border-slate-200 p-3">
                    <p class="text-xs text-slate-500">{{ restorePreview.mode === 'merge' ? 'Diperbarui' : 'Record lama dihapus' }}</p>
                    <p class="mt-1 text-lg font-semibold tabular-nums text-slate-800">{{ (restorePreview.mode === 'merge' ? restorePreview.totals.updated : restorePreview.totals.deleted).toLocaleString('id-ID') }}</p>
                  </div>
                  <div class="min-w-0 rounded-lg border border-slate-200 p-3">
                    <p class="text-xs text-slate-500">{{ restorePreview.mode === 'merge' ? 'Dilewati' : 'Record akhir' }}</p>
                    <p class="mt-1 text-lg font-semibold tabular-nums text-slate-800">{{ (restorePreview.mode === 'merge' ? restorePreview.totals.skipped : restorePreview.totals.finalRecords).toLocaleString('id-ID') }}</p>
                  </div>
                </div>

                <div class="min-w-0 space-y-3">
                  <h4 class="text-sm font-semibold text-slate-800">Rincian per sheet</h4>
                  <article v-for="sheet in restorePreview.sheets" :key="sheet.sheetName" class="min-w-0 rounded-lg border border-slate-200 p-3 sm:p-4">
                    <div class="mb-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <p class="break-words text-sm font-semibold text-slate-800">{{ RESTORE_SHEET_LABELS[sheet.sheetName] || sheet.sheetName }}</p>
                      <p class="break-all text-xs text-slate-500">{{ sheet.sheetName }}</p>
                    </div>
                    <div v-if="restorePreview.mode === 'merge'" class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
                      <div class="min-w-0">
                        <p class="text-xs text-slate-500">Baru</p>
                        <p class="mt-1 text-sm font-semibold tabular-nums text-emerald-700">{{ sheet.added.toLocaleString('id-ID') }}</p>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs text-slate-500">Ditimpa</p>
                        <p class="mt-1 text-sm font-semibold tabular-nums text-amber-700">{{ sheet.updated.toLocaleString('id-ID') }}</p>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs text-slate-500">Dilewati</p>
                        <p class="mt-1 text-sm font-semibold tabular-nums text-slate-700">{{ sheet.skipped.toLocaleString('id-ID') }}</p>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs text-slate-500">Total setelah proses</p>
                        <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">{{ sheet.finalRecords.toLocaleString('id-ID') }}</p>
                      </div>
                    </div>
                    <div v-else class="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
                      <div class="min-w-0">
                        <p class="text-xs text-slate-500">Record saat ini</p>
                        <p class="mt-1 text-sm font-semibold tabular-nums text-slate-700">{{ sheet.currentRecords.toLocaleString('id-ID') }}</p>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs text-slate-500">Record dari backup</p>
                        <p class="mt-1 text-sm font-semibold tabular-nums text-slate-700">{{ sheet.backupRecords.toLocaleString('id-ID') }}</p>
                      </div>
                      <div class="min-w-0">
                        <p class="text-xs text-slate-500">Record akhir</p>
                        <p class="mt-1 text-sm font-semibold tabular-nums text-slate-800">{{ sheet.finalRecords.toLocaleString('id-ID') }}</p>
                      </div>
                    </div>
                  </article>
                </div>
              </template>
            </section>

            <section class="min-w-0 space-y-3 border-t border-slate-200 pt-4" aria-labelledby="restore-confirm-heading">
              <h3 id="restore-confirm-heading" class="text-sm font-semibold text-slate-800">4. Konfirmasi perubahan</h3>
              <BaseAlert v-if="!restorePreview" type="info" title="Pratinjau wajib dilakukan">
                Hitung pratinjau setelah memilih sheet, mode, dan strategi konflik. Jika pilihan berubah, pratinjau sebelumnya akan dibatalkan.
              </BaseAlert>
              <div>
                <label for="backup-restore-confirmation" class="mb-1.5 block text-sm font-medium text-slate-700">
                  Ketik {{ restoreConfirmationPhrase }}
                </label>
                <p class="mb-2 text-sm leading-relaxed text-slate-600">
                  Ketik frasa yang ditampilkan untuk mengonfirmasi bahwa Anda memahami dampak mode
                  {{ restoreMode === 'merge' ? 'gabungkan data' : 'ganti isi sheet' }}.
                </p>
                <input
                  id="backup-restore-confirmation"
                  v-model="restoreConfirmation"
                  type="text"
                  autocomplete="off"
                  autocapitalize="characters"
                  spellcheck="false"
                  maxlength="20"
                  :disabled="isRestoringBackup || !restorePreview"
                  :placeholder="'Ketik ' + restoreConfirmationPhrase"
                  class="min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 sm:max-w-xl"
                />
              </div>
              <label class="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  v-model="restoreAcknowledged"
                  type="checkbox"
                  :disabled="isRestoringBackup || !restorePreview"
                  class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span class="min-w-0 text-sm leading-relaxed text-slate-700">
                  Saya sudah menyimpan backup terbaru, memeriksa seluruh ringkasan dampak, dan memahami pilihan konflik serta sheet yang akan berubah.
                </span>
              </label>
              <BaseButton
                type="button"
                class="w-full sm:w-auto"
                :disabled="!canExecuteRestore"
                :loading="isRestoringBackup"
                loading-text="Memvalidasi dan memulihkan..."
                @click="handleRestoreBackup"
              >
                <Database class="h-4 w-4" aria-hidden="true" />
                Jalankan Restore Selektif
              </BaseButton>
              <p class="text-xs leading-relaxed text-slate-500" role="note">
                Backend memeriksa ulang manifest, ID, skema, izin, dan fingerprint data setelah pratinjau.
                Jika data Spreadsheet berubah sesudah pratinjau, restore ditolak dan pratinjau harus dihitung ulang.
                Apabila penulisan gagal, backend mencoba rollback pada sheet yang sudah tersentuh.
              </p>
            </section>
          </template>
        </div>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ValidationError } from 'yup'
import { Save, Plus, Trash2, Download, Building2, Calendar, Database, FileJson, Upload, Search, ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-vue-next'
import { PageHeader } from '@/components/shared'
import {
  BaseCard, BaseInput, BaseButton, BaseAlert, BaseBadge,
  BaseSkeleton, BaseModal, BaseConfirmDialog,
} from '@/components/ui'
import { useSettingsStore } from '@/stores/settings'
import { useSchoolYearStore } from '@/stores/schoolYear'
import { useConfirm, usePermission } from '@/composables'
import { classroomsService, settingsService } from '@/services'
import type {
  BackupRestoreMode,
  BackupConflictStrategy,
  BackupRestorePreview,
  BackupRestoreResult,
  BackupAutomationState,
  BackupAutomationOptions,
  BackupHistoryItem,
} from '@/services'
import { PERMISSIONS } from '@/constants'
import { formatDate, formatDateTime, isValidEmail } from '@/utils'
import { schoolYearSchema } from '@/utils/validation'
import { toast } from 'vue-sonner'

interface BackupManifest {
  version: string
  generatedAt: string
  sheetCount: number
  counts: Record<string, number>
  complete: boolean
  failedSheets: string[]
}

interface BackupViewerReport {
  fileName: string
  fileSize: number
  valid: boolean
  errors: string[]
  warnings: string[]
  meta: BackupManifest | null
  counts: Record<string, number>
  sheetNames: string[]
  totalRecords: number
  data: Record<string, unknown[]>
}

type BackupAutomationFrequency = 'daily' | 'weekly'

const MAX_RESTORE_FILE_SIZE = 10 * 1024 * 1024
const REQUIRED_BACKUP_SHEETS = [
  'users', 'students', 'student_parents', 'student_health', 'student_education',
  'student_enrollments', 'teachers', 'classrooms', 'grades', 'school_years',
  'settings', 'audit_logs', 'student_verifications', 'student_documents',
  'subjects', 'student_scores',
] as const
const RESTORE_TARGET_SHEETS = REQUIRED_BACKUP_SHEETS.filter(
  (name) => name !== 'users' && name !== 'audit_logs',
)
const RESTORE_SHEET_LABELS: Record<string, string> = {
  students: 'Data Siswa',
  student_parents: 'Data Orang Tua/Wali',
  student_health: 'Data Kesehatan',
  student_education: 'Riwayat Pendidikan',
  student_enrollments: 'Riwayat Kelas',
  teachers: 'Data Guru',
  classrooms: 'Kelas dan Rombel',
  grades: 'Tingkat/Kelas',
  school_years: 'Tahun Pelajaran',
  settings: 'Pengaturan Aplikasi',
  student_verifications: 'Verifikasi Data',
  student_documents: 'Dokumen Siswa',
  subjects: 'Mata Pelajaran',
  student_scores: 'Nilai Siswa',
}

const settingsStore = useSettingsStore()
const schoolYearStore = useSchoolYearStore()
const { can } = usePermission()
const canManageSettings = computed(() => can(PERMISSIONS.SETTINGS_MANAGE))

const activeTab = ref('school')
const isSaving = ref(false)
const isLoadingSettings = ref(false)
const settingsLoadError = ref('')
const schoolYearLoadError = ref('')
const isSchoolFormDirty = ref(false)
let isHydratingSchoolForm = false
const successMsg = ref('')
const errorMsg = ref('')
const isBackingUp = ref(false)
const isSettingActiveSY = ref<string | null>(null)
const backupMeta = ref<BackupManifest | null>(null)
const backupError = ref('')
const backupLastFileName = ref('')
const backupAutomation = reactive<{ enabled: boolean; frequency: BackupAutomationFrequency; retention: 5 | 10 | 20 }>({
  enabled: false,
  frequency: 'daily',
  retention: 10,
})
const backupAutomationState = ref<BackupAutomationState | null>(null)
const backupHistory = ref<BackupHistoryItem[]>([])
const isLoadingBackupHistory = ref(false)
const isSavingBackupAutomation = ref(false)
const isCreatingBackupSnapshot = ref(false)
const isDownloadingBackupId = ref<string | null>(null)
const backupAutomationError = ref('')
const backupHistoryError = ref('')
const backupFileInput = ref<HTMLInputElement | null>(null)
const isReadingBackupFile = ref(false)
const backupViewerResult = ref<BackupViewerReport | null>(null)
const backupViewerSheet = ref('')
const backupViewerSearch = ref('')
const selectedRestoreSheets = ref<string[]>([...RESTORE_TARGET_SHEETS])
const restoreMode = ref<BackupRestoreMode>('merge')
const restoreConflictStrategy = ref<BackupConflictStrategy>('keepExisting')
const restorePreview = ref<BackupRestorePreview | null>(null)
const isPreparingRestorePreview = ref(false)
const restoreConfirmation = ref('')
const restoreAcknowledged = ref(false)
const isRestoringBackup = ref(false)
const restoreError = ref('')
const restoreResult = ref<BackupRestoreResult | null>(null)
const restoreConfirmationPhrase = computed(() => restoreMode.value === 'replace' ? 'GANTI' : 'GABUNGKAN')
const selectedBackupSheetRecords = computed<unknown[]>(() => {
  const result = backupViewerResult.value
  if (!result || !backupViewerSheet.value) return []
  return result.data[backupViewerSheet.value] ?? []
})
const filteredBackupRecords = computed<unknown[]>(() => {
  const query = backupViewerSearch.value.trim().toLocaleLowerCase('id-ID')
  if (!query) return selectedBackupSheetRecords.value

  return selectedBackupSheetRecords.value.filter((record) => {
    if (!isRecord(record)) return String(record ?? '').toLocaleLowerCase('id-ID').includes(query)
    return Object.entries(record).some(([field, value]) => {
      const text = field + ' ' + formatBackupValue(value)
      return text.toLocaleLowerCase('id-ID').includes(query)
    })
  })
})
const previewBackupRecords = computed<unknown[]>(() => filteredBackupRecords.value.slice(0, 10))
const canPrepareRestore = computed(() => {
  const result = backupViewerResult.value
  if (!result || !result.valid || result.fileSize > MAX_RESTORE_FILE_SIZE) return false
  if (result.sheetNames.length !== REQUIRED_BACKUP_SHEETS.length) return false
  return REQUIRED_BACKUP_SHEETS.every((name) => Array.isArray(result.data[name]))
})
const canPreviewRestore = computed(() =>
  canManageSettings.value &&
  canPrepareRestore.value &&
  selectedRestoreSheets.value.length > 0 &&
  !isPreparingRestorePreview.value &&
  !isRestoringBackup.value
)
const restorePreviewMatchesSelection = computed(() => {
  const preview = restorePreview.value
  if (!preview || preview.mode !== restoreMode.value) return false
  if (preview.mode === 'merge' && preview.conflictStrategy !== restoreConflictStrategy.value) return false
  const selected = [...selectedRestoreSheets.value].sort()
  const previewSelected = [...preview.selectedSheets].sort()
  return selected.length === previewSelected.length &&
    selected.every((name, index) => name === previewSelected[index])
})
const canExecuteRestore = computed(() =>
  canManageSettings.value &&
  canPrepareRestore.value &&
  restorePreviewMatchesSelection.value &&
  Boolean(restorePreview.value?.fingerprint) &&
  restoreConfirmation.value.trim().toLocaleUpperCase('id-ID') === restoreConfirmationPhrase.value &&
  restoreAcknowledged.value &&
  !isPreparingRestorePreview.value &&
  !isRestoringBackup.value
)
const backupTotalRecords = computed(() => {
  const counts = backupMeta.value?.counts
  if (!counts) return 0

  return Object.values(counts).reduce(
    (total, count) => total + (Number.isSafeInteger(count) && count >= 0 ? count : 0),
    0,
  )
})

const tabs = [
  { key: 'school', label: 'Profil Sekolah', icon: Building2 },
  { key: 'schoolyear', label: 'Tahun Pelajaran', icon: Calendar },
  { key: 'backup', label: 'Backup Data', icon: Database },
]

// ── Backup history and automatic schedule ────────────────────
function formatStoredBackupSize(value: number): string {
  const bytes = Number.isFinite(value) && value > 0 ? value : 0
  if (bytes < 1024) return String(bytes) + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' KB'
  return (bytes / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' MB'
}

async function loadBackupAutomation() {
  if (!canManageSettings.value || isLoadingBackupHistory.value) return
  isLoadingBackupHistory.value = true
  backupAutomationError.value = ''
  backupHistoryError.value = ''
  try {
    const [statusValue, historyValue] = await Promise.all([
      settingsService.getBackupAutomation(),
      settingsService.listBackupHistory(),
    ])
    if (!isRecord(statusValue) || typeof statusValue.enabled !== 'boolean' ||
        (statusValue.frequency !== 'daily' && statusValue.frequency !== 'weekly') ||
        ![5, 10, 20].includes(Number(statusValue.retention)) ||
        !Array.isArray(historyValue)) {
      throw new Error('Backend mengembalikan status atau riwayat backup dengan format yang tidak dikenali.')
    }
    const status = statusValue as unknown as BackupAutomationState
    backupAutomationState.value = status
    Object.assign(backupAutomation, {
      enabled: status.enabled,
      frequency: status.frequency,
      retention: status.retention,
    })
    backupHistory.value = historyValue
      .filter((item): item is BackupHistoryItem => isRecord(item) &&
        typeof item.id === 'string' &&
        typeof item.generatedAt === 'string' &&
        (item.status === 'success' || item.status === 'failed'))
      .slice(0, 25)
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : 'Tidak dapat memuat riwayat dan jadwal backup.'
    backupAutomationError.value = message
    backupHistoryError.value = message
  } finally {
    isLoadingBackupHistory.value = false
  }
}

async function saveBackupAutomation() {
  if (!canManageSettings.value || isSavingBackupAutomation.value ||
      isCreatingBackupSnapshot.value || isLoadingBackupHistory.value) return
  isSavingBackupAutomation.value = true
  backupAutomationError.value = ''
  try {
    const options: BackupAutomationOptions = {
      enabled: backupAutomation.enabled,
      frequency: backupAutomation.frequency,
      retention: backupAutomation.retention,
    }
    const result = await settingsService.configureBackupAutomation(options)
    if (!isRecord(result) || typeof result.enabled !== 'boolean' ||
        typeof result.triggerInstalled !== 'boolean') {
      throw new Error('Backend tidak mengonfirmasi jadwal backup yang tersimpan.')
    }
    backupAutomationState.value = result as unknown as BackupAutomationState
    toast.success(backupAutomation.enabled
      ? 'Backup otomatis ' + (backupAutomation.frequency === 'daily' ? 'harian' : 'mingguan') + ' berhasil diaktifkan.'
      : 'Backup otomatis dinonaktifkan.')
    await loadBackupAutomation()
  } catch (error: unknown) {
    backupAutomationError.value = error instanceof Error
      ? error.message
      : 'Gagal menyimpan jadwal backup otomatis.'
    toast.error(backupAutomationError.value)
  } finally {
    isSavingBackupAutomation.value = false
  }
}

async function createStoredBackup() {
  if (!canManageSettings.value || isCreatingBackupSnapshot.value ||
      isSavingBackupAutomation.value || isLoadingBackupHistory.value) return
  isCreatingBackupSnapshot.value = true
  backupAutomationError.value = ''
  backupHistoryError.value = ''
  try {
    const result = await settingsService.createBackupSnapshot()
    if (!isRecord(result) || typeof result.id !== 'string' ||
        result.status !== 'success' || typeof result.generatedAt !== 'string') {
      throw new Error('Backend belum mengonfirmasi bahwa snapshot tersimpan dengan lengkap.')
    }
    toast.success('Snapshot backup berhasil disimpan ke Google Drive privat.')
    await loadBackupAutomation()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat snapshot backup.'
    await loadBackupAutomation()
    backupHistoryError.value = message
    toast.error(message)
  } finally {
    isCreatingBackupSnapshot.value = false
  }
}

async function downloadStoredBackup(item: BackupHistoryItem) {
  if (!canManageSettings.value || item.status !== 'success' ||
      isDownloadingBackupId.value !== null) return
  isDownloadingBackupId.value = item.id
  backupHistoryError.value = ''
  try {
    const response = await settingsService.readBackupSnapshot(item.id)
    const validated = validateBackupResponse(response)
    const json = JSON.stringify(validated.data, null, 2)
    if (!json) throw new Error('Isi snapshot tidak dapat dikonversi menjadi JSON.')
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = item.fileName || ('backup-buku-induk-' + item.generatedAt.replace(/[:.]/g, '-') + '.json')
    anchor.style.display = 'none'
    try {
      document.body.appendChild(anchor)
      anchor.click()
    } finally {
      window.setTimeout(() => {
        anchor.remove()
        URL.revokeObjectURL(objectUrl)
      }, 1000)
    }
    toast.success('Snapshot berhasil divalidasi dan unduhan dimulai.')
  } catch (error: unknown) {
    backupHistoryError.value = error instanceof Error
      ? error.message
      : 'Gagal mengunduh snapshot backup.'
    toast.error(backupHistoryError.value)
  } finally {
    isDownloadingBackupId.value = null
  }
}

watch(activeTab, (tab) => {
  if (tab === 'backup' && canManageSettings.value) void loadBackupAutomation()
})

// ── School settings form ─────────────────────────────────────
// BUG-58 FIX: Hilangkan field academicYear dari form settings.
// Tahun pelajaran aktif dikelola via setActiveSY() di tab Tahun Pelajaran,
// bukan disimpan sebagai key-value di sheet settings.
const schoolForm = reactive({
  schoolName: '', schoolNpsn: '', schoolAddress: '',
  schoolPhone: '', schoolEmail: '', schoolWebsite: '',
  principalName: '', principalNip: '',
})

type SchoolFormField = keyof typeof schoolForm

const schoolFormErrors = reactive<Record<SchoolFormField, string>>({
  schoolName: '',
  schoolNpsn: '',
  schoolAddress: '',
  schoolPhone: '',
  schoolEmail: '',
  schoolWebsite: '',
  principalName: '',
  principalNip: '',
})

const schoolFormFieldIds: Record<SchoolFormField, string> = {
  schoolName: 'school-name',
  schoolNpsn: 'school-npsn',
  schoolAddress: 'school-address',
  schoolPhone: 'school-phone',
  schoolEmail: 'school-email',
  schoolWebsite: 'school-website',
  principalName: 'principal-name',
  principalNip: 'principal-nip',
}

const isSchoolFormDisabled = computed(() =>
  !canManageSettings.value ||
  !settingsStore.initialized ||
  isLoadingSettings.value ||
  isSaving.value
)

watch(
  () => ({ ...schoolForm }),
  (current, previous) => {
    if (isHydratingSchoolForm) return

    isSchoolFormDirty.value = true
    successMsg.value = ''
    errorMsg.value = ''

    ;(Object.keys(current) as SchoolFormField[]).forEach(field => {
      if (current[field] !== previous[field]) {
        schoolFormErrors[field] = ''
      }
    })
  },
  { flush: 'sync' },
)

function clearSchoolFormErrors() {
  ;(Object.keys(schoolFormErrors) as SchoolFormField[]).forEach(field => {
    schoolFormErrors[field] = ''
  })
}

function isValidSchoolWebsite(value: string): boolean {
  if (!value) return true
  if (/\s/.test(value)) return false

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(candidate)
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      Boolean(url.hostname) &&
      (url.hostname.includes('.') || url.hostname === 'localhost')
    )
  } catch {
    return false
  }
}

function validateSchoolForm(): boolean {
  clearSchoolFormErrors()

  if (!schoolForm.schoolName.trim()) {
    schoolFormErrors.schoolName = 'Nama sekolah/madrasah wajib diisi.'
  }

  const npsn = schoolForm.schoolNpsn.trim()
  if (npsn && !/^\d{8}$/.test(npsn)) {
    schoolFormErrors.schoolNpsn = 'NPSN harus terdiri dari 8 digit angka.'
  }

  const email = schoolForm.schoolEmail.trim()
  if (email && !isValidEmail(email)) {
    schoolFormErrors.schoolEmail = 'Format email sekolah tidak valid.'
  }

  const website = schoolForm.schoolWebsite.trim()
  if (website && !isValidSchoolWebsite(website)) {
    schoolFormErrors.schoolWebsite = 'Masukkan alamat website yang valid, misalnya sekolah.sch.id atau https://sekolah.sch.id.'
  }

  return !(Object.values(schoolFormErrors) as string[]).some(Boolean)
}

function hydrateSchoolForm() {
  if (isSchoolFormDirty.value || !settingsStore.data) return

  isHydratingSchoolForm = true
  try {
    const {
      schoolName, schoolNpsn, schoolAddress, schoolPhone, schoolEmail,
      schoolWebsite, principalName, principalNip,
    } = settingsStore.data
    Object.assign(schoolForm, {
      schoolName: schoolName ?? '',
      schoolNpsn: schoolNpsn ?? '',
      schoolAddress: schoolAddress ?? '',
      schoolPhone: schoolPhone ?? '',
      schoolEmail: schoolEmail ?? '',
      schoolWebsite: schoolWebsite ?? '',
      principalName: principalName ?? '',
      principalNip: principalNip ?? '',
    })
    clearSchoolFormErrors()
  } finally {
    isHydratingSchoolForm = false
  }
}

async function loadSettingsData() {
  if (isLoadingSettings.value) return
  isLoadingSettings.value = true
  settingsLoadError.value = ''
  try {
    await settingsStore.fetch()
    if (!settingsStore.initialized) {
      settingsLoadError.value = 'Pengaturan sekolah belum berhasil dimuat. Periksa koneksi lalu coba lagi.'
      return
    }
    hydrateSchoolForm()
  } catch (e: unknown) {
    settingsLoadError.value = e instanceof Error ? e.message : 'Gagal memuat pengaturan sekolah.'
  } finally {
    isLoadingSettings.value = false
  }
}

async function saveSchoolSettings() {
  if (
    !canManageSettings.value ||
    !settingsStore.initialized ||
    isSaving.value ||
    isLoadingSettings.value ||
    !isSchoolFormDirty.value
  ) return

  successMsg.value = ''
  errorMsg.value = ''

  if (!validateSchoolForm()) {
    errorMsg.value = 'Periksa kembali isian yang ditandai sebelum menyimpan.'
    const firstInvalid = (Object.keys(schoolFormErrors) as SchoolFormField[])
      .find(field => Boolean(schoolFormErrors[field]))
    if (firstInvalid) {
      await nextTick()
      document.getElementById(schoolFormFieldIds[firstInvalid])?.focus()
    }
    return
  }

  // Snapshot yang sudah dinormalisasi; field terkunci sampai request selesai.
  const payload = Object.fromEntries(
    (Object.keys(schoolForm) as SchoolFormField[]).map(field => [
      field,
      schoolForm[field].trim(),
    ]),
  ) as typeof schoolForm

  isSaving.value = true
  try {
    await settingsStore.update(payload)
    isSchoolFormDirty.value = false
    hydrateSchoolForm()
    clearSchoolFormErrors()
    settingsLoadError.value = ''
    successMsg.value = 'Pengaturan profil sekolah berhasil disimpan.'
    toast.success('Pengaturan berhasil disimpan.')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error
      ? e.message
      : 'Gagal menyimpan pengaturan profil sekolah. Silakan coba lagi.'
    toast.error(errorMsg.value)
  } finally {
    isSaving.value = false
  }
}

// ── School year ───────────────────────────────────────────────
const showAddSY = ref(false)
const isSavingSY = ref(false)
const syForm = reactive({ name: '', startDate: '', endDate: '', isActive: false })
type SchoolYearFormField = keyof typeof syForm
const schoolYearFieldIds: Record<Exclude<SchoolYearFormField, 'isActive'>, string> = {
  name: 'school-year-name',
  startDate: 'school-year-start-date',
  endDate: 'school-year-end-date',
}
const syErrors = reactive<Record<Exclude<SchoolYearFormField, 'isActive'>, string>>({
  name: '',
  startDate: '',
  endDate: '',
})
const sySubmitError = ref('')

// BUG-57 FIX: Gunakan useConfirm() + BaseConfirmDialog alih-alih window.confirm()
const confirmDeleteSY = useConfirm()
let _deleteSYId = ''

const sortedSchoolYears = computed(() =>
  [...schoolYearStore.schoolYears].sort((a, b) => (b.name ?? '').localeCompare(a.name ?? '')),
)
const isSchoolYearMutationBusy = computed(() =>
  isSavingSY.value ||
  isSettingActiveSY.value !== null ||
  confirmDeleteSY.isLoading.value,
)

watch(
  () => syForm.name,
  () => {
    syErrors.name = ''
    sySubmitError.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => syForm.startDate,
  () => {
    syErrors.startDate = ''
    // Tanggal mulai mengubah validitas rentang tanggal selesai.
    syErrors.endDate = ''
    sySubmitError.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => syForm.endDate,
  () => {
    syErrors.endDate = ''
    sySubmitError.value = ''
  },
  { flush: 'sync' },
)

watch(
  () => syForm.isActive,
  () => {
    sySubmitError.value = ''
  },
  { flush: 'sync' },
)

function clearSchoolYearErrors() {
  syErrors.name = ''
  syErrors.startDate = ''
  syErrors.endDate = ''
  sySubmitError.value = ''
}

async function focusFirstSchoolYearError() {
  const firstInvalid = (Object.keys(syErrors) as Array<keyof typeof syErrors>)
    .find(field => Boolean(syErrors[field]))
  if (!firstInvalid) return

  await nextTick()
  document.getElementById(schoolYearFieldIds[firstInvalid])?.focus()
}

async function loadSchoolYears(force = false) {
  schoolYearLoadError.value = ''
  try {
    if (force) await schoolYearStore.refresh()
    else await schoolYearStore.fetch()

    if (!schoolYearStore.initialized) {
      schoolYearLoadError.value = 'Daftar tahun pelajaran gagal dimuat. Silakan coba lagi.'
    }
  } catch (e: unknown) {
    schoolYearLoadError.value = e instanceof Error ? e.message : 'Gagal memuat tahun pelajaran.'
  }
}

function openAddSY() {
  if (!canManageSettings.value || isSchoolYearMutationBusy.value) return
  Object.assign(syForm, { name: '', startDate: '', endDate: '', isActive: false })
  clearSchoolYearErrors()
  showAddSY.value = true
}

async function saveSY() {
  if (!canManageSettings.value || isSchoolYearMutationBusy.value) return
  isSavingSY.value = true
  clearSchoolYearErrors()

  try {
    const payload = {
      name: syForm.name.trim(),
      startDate: syForm.startDate,
      endDate: syForm.endDate,
      isActive: syForm.isActive,
    }

    try {
      await schoolYearSchema.validate(payload, { abortEarly: false })
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        const issues = err.inner.length ? err.inner : [err]
        issues.forEach(issue => {
          if (
            issue.path &&
            ['name', 'startDate', 'endDate'].includes(issue.path) &&
            !syErrors[issue.path as keyof typeof syErrors]
          ) {
            syErrors[issue.path as keyof typeof syErrors] = issue.message
          }
        })
        if (Object.values(syErrors).some(Boolean)) {
          await focusFirstSchoolYearError()
        } else {
          toast.error('Data tahun pelajaran tidak dapat divalidasi.')
        }
      } else {
        toast.error('Data tahun pelajaran tidak dapat divalidasi.')
      }
      return
    }

    const normalizedName = payload.name.toLocaleLowerCase()
    const duplicate = schoolYearStore.schoolYears.some(
      sy => (sy.name ?? '').trim().toLocaleLowerCase() === normalizedName,
    )
    if (duplicate) {
      syErrors.name = 'Tahun pelajaran dengan nama tersebut sudah ada.'
      await focusFirstSchoolYearError()
      return
    }

    const created = await classroomsService.createSchoolYear(payload)
    if (!created || !created.id) {
      throw new Error('Server tidak mengembalikan data tahun pelajaran yang valid. Muat ulang daftar sebelum mencoba lagi.')
    }

    // Sinkronkan status aktif antar-tahun; updateSchoolYear juga dapat menambahkan
    // item baru dan menonaktifkan tahun lama secara reaktif.
    schoolYearStore.updateSchoolYear(created)
    schoolYearStore.schoolYears.sort((a, b) => b.name.localeCompare(a.name))
    schoolYearLoadError.value = ''
    toast.success('Tahun pelajaran berhasil ditambahkan.')
    showAddSY.value = false
  } catch (e: unknown) {
    sySubmitError.value = e instanceof Error ? e.message : 'Gagal menyimpan tahun pelajaran.'
    toast.error(sySubmitError.value)
  } finally {
    isSavingSY.value = false
  }
}

async function setActiveSY(id: string) {
  if (!canManageSettings.value || !id || isSchoolYearMutationBusy.value) return
  const target = schoolYearStore.schoolYears.find(sy => sy.id === id)
  if (!target || target.isActive) return

  isSettingActiveSY.value = id
  try {
    const updated = await classroomsService.setActiveSchoolYear(id)
    if (!updated || updated.id !== id || !updated.isActive) {
      throw new Error('Status tahun aktif dari server tidak valid. Muat ulang daftar tahun pelajaran.')
    }
    schoolYearStore.updateSchoolYear(updated)
    schoolYearStore.schoolYears.sort((a, b) => b.name.localeCompare(a.name))
    schoolYearLoadError.value = ''
    toast.success('Tahun pelajaran aktif diperbarui.')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal mengubah tahun aktif.')
  } finally {
    isSettingActiveSY.value = null
  }
}

function cancelDeleteSY() {
  // Jangan pertahankan ID target yang batal dihapus; dialog bisa dibuka ulang
  // untuk item lain dan harus selalu menggunakan target terbaru.
  if (confirmDeleteSY.isLoading.value) return
  _deleteSYId = ''
}

function handleDeleteSY(id: string, name: string) {
  if (!canManageSettings.value || !id || isSchoolYearMutationBusy.value || confirmDeleteSY.isOpen.value) return
  const target = schoolYearStore.schoolYears.find(sy => sy.id === id)
  if (!target) {
    toast.error('Tahun pelajaran tidak ditemukan. Muat ulang daftar lalu coba lagi.')
    return
  }
  if (target.isActive) {
    toast.error('Tahun pelajaran aktif tidak dapat dihapus.')
    return
  }

  // BUG-57 FIX: Gunakan dialog konfirmasi custom, bukan window.confirm()
  _deleteSYId = id
  confirmDeleteSY.options.value = { message: name, type: 'danger' }
  confirmDeleteSY.isOpen.value = true
}

async function confirmDoDeleteSY() {
  if (confirmDeleteSY.isLoading.value) return

  if (!canManageSettings.value) {
    confirmDeleteSY.isOpen.value = false
    _deleteSYId = ''
    toast.error('Akun Anda tidak memiliki izin untuk menghapus tahun pelajaran.')
    return
  }
  if (!_deleteSYId || isSavingSY.value || isSettingActiveSY.value !== null) return

  const target = schoolYearStore.schoolYears.find(sy => sy.id === _deleteSYId)
  if (!target) {
    confirmDeleteSY.isOpen.value = false
    _deleteSYId = ''
    toast.error('Tahun pelajaran tidak lagi tersedia. Daftar akan dimuat ulang.')
    void loadSchoolYears(true)
    return
  }
  if (target.isActive) {
    confirmDeleteSY.isOpen.value = false
    _deleteSYId = ''
    toast.error('Tahun pelajaran aktif tidak dapat dihapus.')
    return
  }

  confirmDeleteSY.isLoading.value = true
  try {
    const deletedId = _deleteSYId
    await classroomsService.deleteSchoolYear(deletedId)
    schoolYearStore.removeSchoolYear(deletedId)
    schoolYearLoadError.value = ''
    toast.success('Tahun pelajaran dihapus.')
    confirmDeleteSY.isOpen.value = false
    _deleteSYId = ''
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Gagal menghapus tahun pelajaran.')
  } finally {
    confirmDeleteSY.isLoading.value = false
  }
}

// ── Backup ────────────────────────────────────────────────────
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}


function formatBackupFileSize(size: number): string {
  if (!Number.isFinite(size) || size < 0) return 'Ukuran tidak diketahui'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' KB'
  return (size / (1024 * 1024)).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' MB'
}

function formatBackupValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  let formatted: string
  if (typeof value === 'string') formatted = value
  else if (typeof value === 'number' || typeof value === 'boolean') formatted = String(value)
  else {
    try {
      formatted = JSON.stringify(value) ?? String(value)
    } catch {
      formatted = String(value)
    }
  }
  return formatted.length > 180 ? formatted.slice(0, 177) + '…' : formatted
}

function getBackupRecordFields(record: unknown): string[] {
  return isRecord(record) ? Object.keys(record).slice(0, 12) : []
}

function getBackupRecordFieldCount(record: unknown): number {
  return isRecord(record) ? Object.keys(record).length : 0
}

function openBackupFilePicker() {
  if (isReadingBackupFile.value) return
  backupFileInput.value?.click()
}

function createBackupViewerError(file: File, message: string): BackupViewerReport {
  return {
    fileName: file.name,
    fileSize: file.size,
    valid: false,
    errors: [message],
    warnings: [],
    meta: null,
    counts: Object.create(null) as Record<string, number>,
    sheetNames: [],
    totalRecords: 0,
    data: Object.create(null) as Record<string, unknown[]>,
  }
}

function inspectBackupFile(value: unknown, file: File): BackupViewerReport {
  const errors: string[] = []
  const warnings: string[] = []
  const counts: Record<string, number> = Object.create(null) as Record<string, number>
  const data: Record<string, unknown[]> = Object.create(null) as Record<string, unknown[]>
  let meta: BackupManifest | null = null

  if (!isRecord(value)) {
    return createBackupViewerError(file, 'Struktur JSON utama harus berupa objek yang berisi data sheet dan _meta.')
  }

  for (const [sheetName, sheetValue] of Object.entries(value)) {
    if (sheetName === '_meta') continue
    if (!Array.isArray(sheetValue)) {
      errors.push('Bagian "' + sheetName + '" bukan array data sheet.')
      continue
    }
    data[sheetName] = sheetValue
    if (sheetValue.some((record) => !isRecord(record))) {
      errors.push('Sheet "' + sheetName + '" memiliki record yang bukan objek data.')
    }
  }

  const rawMeta = value._meta
  if (!isRecord(rawMeta)) {
    errors.push('Manifest _meta tidak ditemukan atau bukan objek. File ini tidak dikenali sebagai backup lengkap aplikasi.')
  } else {
    const versionIsValid = typeof rawMeta.version === 'string' && Boolean(rawMeta.version.trim())
    const generatedAtIsValid = typeof rawMeta.generatedAt === 'string' &&
      Number.isFinite(Date.parse(rawMeta.generatedAt))
    const sheetCountIsValid = Number.isSafeInteger(rawMeta.sheetCount) &&
      (rawMeta.sheetCount as number) >= 0
    // Simpan hasil type guard pada variabel lokal agar TypeScript tetap
    // mempertahankan narrowing untuk nilai bertipe unknown.
    const rawCounts = isRecord(rawMeta.counts) ? rawMeta.counts : null
    const rawFailedSheets: unknown[] | null = Array.isArray(rawMeta.failedSheets)
      ? rawMeta.failedSheets as unknown[]
      : null
    const rawCountsAreValid = rawCounts !== null
    const completeIsValid = rawMeta.complete === true
    const failedSheetsIsValid = rawFailedSheets !== null

    if (!versionIsValid) errors.push('Versi pada manifest tidak ada atau tidak valid.')
    if (!generatedAtIsValid) errors.push('Tanggal pembuatan backup pada manifest tidak valid.')
    if (!sheetCountIsValid) errors.push('Jumlah sheet pada manifest tidak valid.')
    if (!rawCountsAreValid) errors.push('Daftar jumlah record (counts) tidak tersedia atau formatnya tidak valid.')
    if (!completeIsValid) errors.push('Manifest tidak menyatakan backup lengkap (complete harus bernilai true).')
    if (!failedSheetsIsValid) errors.push('Daftar failedSheets pada manifest tidak tersedia atau formatnya tidak valid.')

    let normalizedFailedSheets: string[] = []
    if (failedSheetsIsValid) {
      normalizedFailedSheets = rawFailedSheets!
        .map((item) => {
          if (typeof item === 'string') return item
          return isRecord(item) && typeof item.name === 'string' ? item.name : ''
        })
        .filter(Boolean)
      if (rawFailedSheets!.some((item) =>
        typeof item !== 'string' && !(isRecord(item) && typeof item.name === 'string')
      )) {
        errors.push('Daftar failedSheets berisi item dengan format yang tidak dikenali.')
      }
      if (normalizedFailedSheets.length) {
        errors.push('Backup melaporkan sheet yang gagal dicadangkan: ' + normalizedFailedSheets.join(', ') + '.')
      }
    }

    if (rawCountsAreValid) {
      for (const [sheetName, count] of Object.entries(rawCounts!)) {
        if (
          sheetName === '__proto__' ||
          sheetName === 'prototype' ||
          sheetName === 'constructor'
        ) {
          errors.push('Nama sheet pada manifest tidak diperbolehkan: ' + sheetName + '.')
          continue
        }
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
          errors.push('Jumlah record pada sheet "' + sheetName + '" bukan bilangan bulat nonnegatif.')
          continue
        }
        counts[sheetName] = count
        const sheetValue = value[sheetName]
        if (!Array.isArray(sheetValue)) {
          errors.push('Data untuk sheet "' + sheetName + '" tidak ditemukan atau bukan array.')
        } else if (sheetValue.length !== count) {
          errors.push(
            'Jumlah record sheet "' + sheetName + '" tidak cocok: manifest ' +
            count.toLocaleString('id-ID') + ', file ' + sheetValue.length.toLocaleString('id-ID') + '.'
          )
        }
      }

      if (sheetCountIsValid && Object.keys(rawCounts!).length !== rawMeta.sheetCount) {
        errors.push('Jumlah nama sheet pada counts tidak cocok dengan sheetCount di manifest.')
      }
      const exportedSheetNames = Object.keys(value).filter((key) => key !== '_meta')
      if (exportedSheetNames.length !== Object.keys(rawCounts!).length) {
        errors.push('Jumlah bagian data sheet pada file tidak cocok dengan manifest.')
      }
      for (const sheetName of exportedSheetNames) {
        if (!Object.prototype.hasOwnProperty.call(rawCounts!, sheetName)) {
          errors.push('Sheet "' + sheetName + '" tidak tercantum pada manifest.')
        }
      }
    }

    if (
      versionIsValid &&
      generatedAtIsValid &&
      sheetCountIsValid &&
      rawCountsAreValid &&
      typeof rawMeta.complete === 'boolean' &&
      failedSheetsIsValid
    ) {
      meta = {
        version: rawMeta.version as string,
        generatedAt: rawMeta.generatedAt as string,
        sheetCount: rawMeta.sheetCount as number,
        counts,
        complete: rawMeta.complete,
        failedSheets: normalizedFailedSheets,
      }
    }

    if (generatedAtIsValid && Date.parse(rawMeta.generatedAt as string) > Date.now() + 5 * 60 * 1000) {
      warnings.push('Tanggal backup berada di masa depan. Periksa tanggal atau jam pada perangkat pembuat backup.')
    }
  }

  const sheetNames = Object.keys(data).sort((a, b) => a.localeCompare(b, 'id'))
  const totalRecords = sheetNames.reduce((total, sheetName) => total + data[sheetName].length, 0)
  if (!sheetNames.length) warnings.push('Tidak ada array data sheet yang dapat ditampilkan pada file ini.')

  const uniqueErrors = Array.from(new Set(errors))
  const valid = uniqueErrors.length === 0 && meta !== null &&
    meta.complete === true && meta.failedSheets.length === 0

  return {
    fileName: file.name,
    fileSize: file.size,
    valid,
    errors: uniqueErrors,
    warnings,
    meta,
    counts,
    sheetNames,
    totalRecords,
    data,
  }
}

async function handleBackupFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Kosongkan input agar berkas yang sama dapat dipilih ulang setelah dikoreksi.
  input.value = ''
  if (!file || isReadingBackupFile.value) return

  backupViewerResult.value = null
  backupViewerSheet.value = ''
  backupViewerSearch.value = ''
  restorePreview.value = null
  restoreConfirmation.value = ''
  restoreAcknowledged.value = false
  restoreError.value = ''
  restoreResult.value = null

  if (!file.name.toLowerCase().endsWith('.json')) {
    backupViewerResult.value = createBackupViewerError(file, 'Pilih file dengan ekstensi .json.')
    return
  }
  if (file.size === 0) {
    backupViewerResult.value = createBackupViewerError(file, 'File kosong dan tidak dapat divalidasi.')
    return
  }
  if (file.size > 50 * 1024 * 1024) {
    backupViewerResult.value = createBackupViewerError(file, 'Ukuran file melebihi batas 50 MB. Pilih file yang lebih kecil.')
    return
  }

  isReadingBackupFile.value = true
  try {
    const text = await file.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      backupViewerResult.value = createBackupViewerError(file, 'Isi file bukan JSON yang valid. Pastikan file tidak terpotong atau rusak.')
      return
    }

    const result = inspectBackupFile(parsed, file)
    backupViewerResult.value = result
    backupViewerSheet.value = result.sheetNames[0] ?? ''
    if (result.valid) {
      toast.success('File backup berhasil divalidasi.')
    } else {
      toast.error('Pemeriksaan selesai. Periksa rincian validasi pada halaman ini.')
    }
  } catch (error: unknown) {
    backupViewerResult.value = createBackupViewerError(
      file,
      error instanceof Error ? 'File tidak dapat dibaca: ' + error.message : 'File tidak dapat dibaca pada perangkat ini.'
    )
  } finally {
    isReadingBackupFile.value = false
  }
}

function buildRestoreBackupPayload(): Record<string, unknown> | null {
  const result = backupViewerResult.value
  if (!result || !result.valid || !result.meta) return null
  return { ...result.data, _meta: result.meta }
}

function selectAllRestoreSheets() {
  if (isPreparingRestorePreview.value || isRestoringBackup.value) return
  selectedRestoreSheets.value = [...RESTORE_TARGET_SHEETS]
}

function clearRestoreSheetSelection() {
  if (isPreparingRestorePreview.value || isRestoringBackup.value) return
  selectedRestoreSheets.value = []
}

watch(
  () => ({
    selectedSheets: [...selectedRestoreSheets.value].sort().join('|'),
    mode: restoreMode.value,
    conflictStrategy: restoreConflictStrategy.value,
  }),
  () => {
    restorePreview.value = null
    restoreConfirmation.value = ''
    restoreAcknowledged.value = false
    restoreError.value = ''
  },
)

async function handlePreviewRestore() {
  if (!canManageSettings.value || !canPreviewRestore.value) return
  const backupPayload = buildRestoreBackupPayload()
  if (!backupPayload) {
    restoreError.value = 'Pilih file backup yang valid dan lengkap sebelum menghitung pratinjau.'
    return
  }

  isPreparingRestorePreview.value = true
  restorePreview.value = null
  restoreConfirmation.value = ''
  restoreAcknowledged.value = false
  restoreError.value = ''
  try {
    const preview = await settingsService.previewRestore(backupPayload, {
      selectedSheets: [...selectedRestoreSheets.value],
      mode: restoreMode.value,
      conflictStrategy: restoreConflictStrategy.value,
    })
    if (
      !isRecord(preview) ||
      typeof preview.fingerprint !== 'string' ||
      !preview.fingerprint ||
      !Array.isArray(preview.selectedSheets) ||
      !Array.isArray(preview.sheets) ||
      !isRecord(preview.totals)
    ) {
      throw new Error('Backend mengembalikan pratinjau restore yang tidak dikenali.')
    }

    restorePreview.value = preview as unknown as BackupRestorePreview
    toast.success('Pratinjau restore berhasil dihitung di backend.')
  } catch (error: unknown) {
    restoreError.value = error instanceof Error
      ? error.message
      : 'Gagal menghitung pratinjau restore. Tidak ada data yang diubah.'
    toast.error(restoreError.value)
  } finally {
    isPreparingRestorePreview.value = false
  }
}

async function handleRestoreBackup() {
  if (!canManageSettings.value || !canExecuteRestore.value || !restorePreview.value) return
  const backupPayload = buildRestoreBackupPayload()
  if (!backupPayload) {
    restoreError.value = 'File backup tidak lagi valid. Pilih dan validasi ulang file sebelum restore.'
    restorePreview.value = null
    return
  }

  isRestoringBackup.value = true
  restoreError.value = ''
  restoreResult.value = null
  try {
    const response: unknown = await settingsService.restoreBackup(backupPayload, {
      selectedSheets: [...selectedRestoreSheets.value],
      mode: restoreMode.value,
      conflictStrategy: restoreConflictStrategy.value,
      expectedFingerprint: restorePreview.value.fingerprint,
      confirmation: restoreConfirmationPhrase.value as 'GABUNGKAN' | 'GANTI',
    })

    if (
      !isRecord(response) ||
      !Array.isArray(response.restoredSheets) ||
      !Array.isArray(response.preservedSheets) ||
      !Array.isArray(response.unselectedSheets) ||
      !isRecord(response.counts) ||
      typeof response.restoredAt !== 'string' ||
      typeof response.totalRecords !== 'number' ||
      !Number.isFinite(response.totalRecords)
    ) {
      throw new Error('Backend mengembalikan ringkasan restore yang tidak dikenali. Periksa log GAS sebelum mencoba ulang.')
    }

    restoreResult.value = response as unknown as BackupRestoreResult
    restorePreview.value = null
    restoreConfirmation.value = ''
    restoreAcknowledged.value = false
    toast.success('Restore selektif berhasil. Muat ulang aplikasi untuk menggunakan data terbaru.')
  } catch (error: unknown) {
    restoreError.value = error instanceof Error
      ? error.message
      : 'Restore gagal. Tidak ada konfirmasi keberhasilan dari server.'
    // Data mungkin sudah berubah sejak preview; pengguna harus menghitung ulang.
    if (/berubah setelah pratinjau|fingerprint/i.test(restoreError.value)) {
      restorePreview.value = null
      restoreConfirmation.value = ''
      restoreAcknowledged.value = false
    }
    toast.error(restoreError.value)
  } finally {
    isRestoringBackup.value = false
  }
}

function reloadAfterRestore() {
  window.location.reload()
}

function validateBackupResponse(value: unknown): {
  data: Record<string, unknown>
  meta: BackupManifest
} {
  if (!isRecord(value)) {
    throw new Error('Respons backup tidak valid. Muat ulang halaman lalu coba kembali.')
  }

  const rawMeta = value._meta
  if (!isRecord(rawMeta)) {
    throw new Error('Manifest backup tidak ditemukan. Backend GAS perlu diperiksa.')
  }

  if (rawMeta.complete !== true) {
    const failedSheets = Array.isArray(rawMeta.failedSheets)
      ? rawMeta.failedSheets
          .map((item) => {
            if (typeof item === 'string') return item
            return isRecord(item) && typeof item.name === 'string' ? item.name : ''
          })
          .filter(Boolean)
      : []

    if (rawMeta.complete === false || failedSheets.length > 0) {
      const detail = failedSheets.length
        ? ` Sheet bermasalah: ${failedSheets.join(', ')}.`
        : ''
      throw new Error(`Backup dibatalkan karena backend tidak dapat memastikan semua sheet berhasil dibaca.${detail} Periksa sheet di Google Spreadsheet, lalu coba lagi.`)
    }

    throw new Error(
      'Backend GAS yang aktif belum melaporkan status kelengkapan backup. ' +
      'Sinkronkan gas-backend/ReportHandler.gs ke Google Apps Script lalu deploy versi baru sebelum mencoba lagi.',
    )
  }

  if (
    typeof rawMeta.version !== 'string' ||
    !rawMeta.version.trim() ||
    typeof rawMeta.generatedAt !== 'string' ||
    !Number.isFinite(Date.parse(rawMeta.generatedAt)) ||
    !Number.isSafeInteger(rawMeta.sheetCount) ||
    (rawMeta.sheetCount as number) < 0 ||
    !isRecord(rawMeta.counts)
  ) {
    throw new Error('Manifest backup tidak lengkap atau memiliki format yang tidak valid.')
  }

  const counts: Record<string, number> = {}
  const expectedSheets = Object.keys(rawMeta.counts)
  for (const [sheetName, count] of Object.entries(rawMeta.counts)) {
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
      throw new Error(`Jumlah record pada sheet "${sheetName}" tidak valid. Backup dibatalkan.`)
    }

    const sheetData = value[sheetName]
    if (!Array.isArray(sheetData) || sheetData.length !== count) {
      throw new Error(`Data sheet "${sheetName}" tidak sesuai dengan manifest. Backup dibatalkan agar berkas yang tidak konsisten tidak diunduh.`)
    }
    counts[sheetName] = count
  }

  const exportedSheets = Object.keys(value).filter((key) => key !== '_meta')
  if (
    expectedSheets.length !== rawMeta.sheetCount ||
    exportedSheets.length !== expectedSheets.length ||
    exportedSheets.some((name) => !Object.prototype.hasOwnProperty.call(counts, name))
  ) {
    throw new Error('Jumlah sheet pada data dan manifest tidak cocok. Backup dibatalkan.')
  }

  const failedSheets = Array.isArray(rawMeta.failedSheets)
    ? rawMeta.failedSheets
        .map((item) => {
          if (typeof item === 'string') return item
          return isRecord(item) && typeof item.name === 'string' ? item.name : ''
        })
        .filter(Boolean)
    : []

  if (failedSheets.length > 0) {
    throw new Error(`Backup tidak lengkap. Sheet bermasalah: ${failedSheets.join(', ')}.`)
  }

  return {
    data: value,
    meta: {
      version: rawMeta.version,
      generatedAt: rawMeta.generatedAt,
      sheetCount: rawMeta.sheetCount as number,
      counts,
      complete: true,
      failedSheets: [],
    },
  }
}

async function handleBackup() {
  if (!canManageSettings.value || isBackingUp.value) return

  isBackingUp.value = true
  backupError.value = ''

  try {
    const response: unknown = await settingsService.exportBackup()
    const validated = validateBackupResponse(response)
    const json = JSON.stringify(validated.data, null, 2)
    if (!json) throw new Error('Data backup tidak dapat dikonversi menjadi JSON.')

    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, '0')
    const localTimestamp = [
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`,
    ].join('-')
    const fileName = `backup-buku-induk-${localTimestamp}.json`

    anchor.href = objectUrl
    anchor.download = fileName
    anchor.style.display = 'none'

    try {
      document.body.appendChild(anchor)
      anchor.click()
    } finally {
      // Beri browser waktu memulai unduhan sebelum URL blob dilepas.
      window.setTimeout(() => {
        anchor.remove()
        URL.revokeObjectURL(objectUrl)
      }, 1000)
    }

    backupMeta.value = validated.meta
    backupLastFileName.value = fileName
    toast.success('Backup berhasil divalidasi dan unduhan telah dimulai.')
  } catch (e: unknown) {
    backupError.value = e instanceof Error
      ? e.message
      : 'Gagal membuat backup. Silakan coba lagi.'
    toast.error(backupError.value)
  } finally {
    isBackingUp.value = false
  }
}

onMounted(() => {
  // Setiap area menangani status/error-nya sendiri agar kegagalan satu request
  // tidak menyembunyikan data atau kontrol pada area lainnya.
  void Promise.all([loadSettingsData(), loadSchoolYears()])
})
</script>
