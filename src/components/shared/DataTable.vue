<template>
  <div class="w-full">

    <!-- ── Loading skeleton ─────────────────────────────────── -->
    <div v-if="loading" class="space-y-2 p-4">
      <BaseSkeleton v-for="i in skeletonRows" :key="i" height="h-12" />
    </div>

    <template v-else>
      <!-- ── Empty state ──────────────────────────────────────── -->
      <BaseEmpty
        v-if="!rows.length"
        :title="emptyTitle"
        :description="emptyDescription"
        :type="emptyType"
      >
        <template v-if="$slots.empty" #action>
          <slot name="empty" />
        </template>
      </BaseEmpty>

      <!-- ── Table ────────────────────────────────────────────── -->
      <!--
        FIX-OVERFLOW: Wrapper relatif dengan overflow-x-auto menampung tabel
        yang bisa lebih lebar dari layar. Shadow kanan/kiri memberi petunjuk
        visual bahwa ada konten yang bisa di-scroll.
        -mx-px + border-x mencegah border card terpotong saat scroll.
      -->
      <div
        v-else
        ref="tableWrapper"
        class="overflow-x-auto scrollbar-thin"
        @scroll.passive="onTableScroll"
      >
        <table class="min-w-full divide-y divide-slate-100">

          <!-- Header -->
          <thead>
            <tr class="bg-slate-50/80">
              <th
                v-for="col in columns"
                :key="col.key"
                scope="col"
                :class="[
                  'px-4 py-3 text-left text-xs font-semibold text-slate-500',
                  'uppercase tracking-wide whitespace-nowrap select-none',
                  col.align === 'right'  ? 'text-right'  : '',
                  col.align === 'center' ? 'text-center' : '',
                  getStickyClass(col, 'head'),
                  col.width ?? '',
                  col.class ?? '',
                ]"
              >
                <!--
                  Sortable header — BUG-4 FIX: indikator sync dengan parent controlled state.
                  BUG-10 FIX: reset ke 'asc' saat kolom BARU dipilih.
                -->
                <button
                  v-if="col.sortable"
                  type="button"
                  class="inline-flex items-center gap-1.5 hover:text-slate-700 transition-colors group"
                  @click="onSort(col.key)"
                >
                  {{ col.label }}
                  <span class="flex flex-col shrink-0 text-slate-300 group-hover:text-slate-400 transition-colors">
                    <!-- Asc arrow -->
                    <svg
                      class="h-2 w-2 -mb-0.5 transition-colors"
                      :class="activeSortKey() === col.key && activeSortDir() === 'asc' ? 'text-primary-500' : ''"
                      fill="currentColor" viewBox="0 0 16 16"
                    >
                      <path d="M8 5l4 6H4z"/>
                    </svg>
                    <!-- Desc arrow -->
                    <svg
                      class="h-2 w-2 transition-colors"
                      :class="activeSortKey() === col.key && activeSortDir() === 'desc' ? 'text-primary-500' : ''"
                      fill="currentColor" viewBox="0 0 16 16"
                    >
                      <path d="M8 11l-4-6h8z"/>
                    </svg>
                  </span>
                </button>
                <span v-else>{{ col.label }}</span>
              </th>
            </tr>
          </thead>

          <!-- Body -->
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr
              v-for="(row, idx) in rows"
              :key="rowKey ? String(row[rowKey]) : idx"
              :class="[
                'transition-colors duration-100',
                clickable ? 'cursor-pointer hover:bg-primary-50/40 active:bg-primary-50/60' : '',
                striped && idx % 2 === 1 ? 'bg-slate-50/40' : '',
              ]"
              @click="clickable && $emit('rowClick', row)"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                :class="[
                  'px-4 py-3 text-sm text-slate-700',
                  col.align === 'right'  ? 'text-right'  : '',
                  col.align === 'center' ? 'text-center' : '',
                  getStickyClass(col, 'body'),
                  col.cellClass ?? '',
                ]"
              >
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="idx">
                  {{ row[col.key] ?? '–' }}
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import BaseEmpty from '@/components/ui/BaseEmpty.vue'

export interface TableColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  /**
   * Sticky column. 'left' atau 'right'.
   * Pada sticky right, shadow kiri ditambahkan secara reaktif via JS scroll handler
   * agar tidak muncul saat konten tidak perlu di-scroll.
   */
  sticky?: 'left' | 'right'
  width?: string       // Tailwind width class, e.g. 'w-32'
  class?: string       // Tambahan class untuk header cell
  cellClass?: string   // Tambahan class untuk body cell
}

interface Props {
  columns: TableColumn[]
  rows: Record<string, unknown>[]
  loading?: boolean
  skeletonRows?: number
  rowKey?: string
  clickable?: boolean
  striped?: boolean
  /** Controlled sort key dari parent — jika diberikan, override state internal */
  sortKey?: string
  /** Controlled sort direction dari parent */
  sortDir?: 'asc' | 'desc'
  emptyTitle?: string
  emptyDescription?: string
  emptyType?: 'search' | 'data' | 'students' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  loading:      false,
  skeletonRows: 5,
  clickable:    false,
  striped:      false,
  emptyTitle:   'Tidak ada data',
  emptyType:    'default',
})

const emit = defineEmits<{
  rowClick: [row: Record<string, unknown>]
  sort:     [key: string, dir: 'asc' | 'desc']
}>()

// ── Sort state ────────────────────────────────────────────────
// Internal state digunakan saat parent tidak meneruskan sortKey/sortDir (uncontrolled).
const internalSortKey = ref<string>('')
const internalSortDir = ref<'asc' | 'desc'>('asc')

function onSort(key: string) {
  // Reset ke 'asc' saat kolom BARU dipilih; toggle saat kolom SAMA
  const currentKey = activeSortKey()
  const currentDir = activeSortDir()
  const newDir: 'asc' | 'desc' = (currentKey === key && currentDir === 'asc') ? 'desc' : 'asc'
  internalSortKey.value = key
  internalSortDir.value = newDir
  emit('sort', key, newDir)
}

function activeSortKey(): string {
  return props.sortKey !== undefined ? props.sortKey : internalSortKey.value
}
function activeSortDir(): 'asc' | 'desc' {
  return props.sortDir !== undefined ? props.sortDir : internalSortDir.value
}

// ── Sticky column shadow ──────────────────────────────────────
// Sticky 'right' kolom (kolom aksi) diberi shadow-kiri ketika tabel
// bisa di-scroll (scrollWidth > clientWidth) dan belum di-scroll penuh ke kanan.
// Shadow diaplikasikan via class di getStickyClass() yang reaktif terhadap
// canScrollRight / canScrollLeft state.
const tableWrapper = ref<HTMLElement | null>(null)
const canScrollRight = ref(false)
const canScrollLeft  = ref(false)

function checkScroll() {
  const el = tableWrapper.value
  if (!el) return
  canScrollLeft.value  = el.scrollLeft > 0
  canScrollRight.value = el.scrollLeft < (el.scrollWidth - el.clientWidth - 1)
}

function onTableScroll() {
  checkScroll()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  checkScroll()
  if (tableWrapper.value) {
    resizeObserver = new ResizeObserver(() => checkScroll())
    resizeObserver.observe(tableWrapper.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

function getStickyClass(col: TableColumn, zone: 'head' | 'body'): string {
  if (!col.sticky) return ''

  const base = 'z-10'
  // bg sesuai zona agar tidak transparan saat scroll
  const bg = zone === 'head' ? 'bg-slate-50' : 'bg-white'
  // Perlu tambah bg saat striped row agar tidak transparan; di sini cukup bg-white
  // karena sticky right adalah kolom aksi yang selalu putih.

  if (col.sticky === 'left') {
    const shadow = canScrollLeft.value ? 'shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]' : ''
    return `sticky left-0 ${base} ${bg} ${shadow}`
  }
  if (col.sticky === 'right') {
    const shadow = canScrollRight.value ? 'shadow-[-2px_0_6px_-2px_rgba(0,0,0,0.12)]' : ''
    return `sticky right-0 ${base} ${bg} ${shadow}`
  }
  return ''
}
</script>
