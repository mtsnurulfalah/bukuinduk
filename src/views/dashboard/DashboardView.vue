<template>
  <div>
    <AdminDashboard     v-if="isAdmin" />
    <PrincipalDashboard v-else-if="isPrincipal" />
    <TeacherDashboard   v-else-if="isTeacher" />

    <!-- BUG-18 FIX: Fallback jika role tidak dikenali -->
    <div
      v-else
      class="flex flex-col items-center justify-center py-24 text-center px-4"
    >
      <div class="p-4 bg-amber-50 rounded-full mb-4">
        <ShieldAlert class="h-10 w-10 text-amber-500" />
      </div>
      <h2 class="text-lg font-semibold text-slate-700 mb-1">Role tidak dikenali</h2>
      <p class="text-sm text-slate-400 max-w-xs">
        Akun Anda tidak memiliki role yang valid. Hubungi administrator.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next'
import { usePermission } from '@/composables'
import AdminDashboard     from './AdminDashboard.vue'
import PrincipalDashboard from './PrincipalDashboard.vue'
import TeacherDashboard   from './TeacherDashboard.vue'

const { isAdmin, isPrincipal, isTeacher } = usePermission()
</script>
