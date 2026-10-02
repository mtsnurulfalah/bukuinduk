import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { formatDate } from '@/utils'

/**
 * Composable untuk export data ke Excel dan PDF.
 * Menggunakan library xlsx dan jspdf yang diload secara dynamic
 * untuk mengurangi bundle size awal.
 */
export function useExport() {
  const isExporting = ref(false)

  /**
   * Export data ke file Excel (.xlsx)
   * @param data      Array of objects
   * @param headers   Map dari key ke label kolom: { fullName: 'Nama Lengkap', ... }
   * @param filename  Nama file tanpa ekstensi
   */
  async function exportToExcel(
    data: Record<string, unknown>[],
    headers: Record<string, string>,
    filename = 'export'
  ) {
    if (!data.length) {
      toast.warning('Tidak ada data untuk diekspor.')
      return
    }

    isExporting.value = true
    try {
      const XLSX = await import('xlsx')

      // Susun baris header + data
      const headerKeys = Object.keys(headers)
      const headerRow = headerKeys.map(k => headers[k])

      const rows = data.map(row =>
        headerKeys.map(k => {
          const val = row[k]
          if (val == null) return ''
          if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak'
          return String(val)
        })
      )

      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...rows])

      // Lebar kolom otomatis berdasarkan konten
      ws['!cols'] = headerKeys.map((k, i) => {
        const maxLen = Math.max(
          headers[k].length,
          ...rows.map(r => String(r[i] ?? '').length)
        )
        return { wch: Math.min(maxLen + 2, 50) }
      })

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data')

      const dateStr = formatDate(new Date().toISOString(), 'yyyyMMdd')
      XLSX.writeFile(wb, `${filename}_${dateStr}.xlsx`)

      toast.success('Export Excel berhasil.')
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengekspor data.')
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Export tabel HTML ke PDF menggunakan jsPDF + autotable
   */
  async function exportToPDF(
    data: Record<string, unknown>[],
    headers: Record<string, string>,
    filename = 'export',
    title = 'Laporan'
  ) {
    if (!data.length) {
      toast.warning('Tidak ada data untuk diekspor.')
      return
    }

    isExporting.value = true
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(title, 14, 18)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Dicetak: ${formatDate(new Date().toISOString(), 'dd MMMM yyyy')}`, 14, 25)

      const headerKeys = Object.keys(headers)
      const columns = headerKeys.map(k => ({ header: headers[k], dataKey: k }))
      const rows = data.map(row => {
        const r: Record<string, string> = {}
        headerKeys.forEach(k => {
          const val = row[k]
          r[k] = val == null ? '' : String(val)
        })
        return r
      })

      autoTable(doc, {
        startY: 30,
        columns,
        body: rows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
      })

      const dateStr = formatDate(new Date().toISOString(), 'yyyyMMdd')
      doc.save(`${filename}_${dateStr}.pdf`)

      toast.success('Export PDF berhasil.')
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengekspor PDF.')
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Print konten halaman (print CSS akan menyembunyikan sidebar dll)
   */
  function printPage() {
    window.print()
  }

  return { isExporting, exportToExcel, exportToPDF, printPage }
}
