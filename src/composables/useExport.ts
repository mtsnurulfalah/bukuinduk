import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { formatDate, formatGender } from '@/utils'
import type { AppSettings, Student, StudentEnrollment } from '@/types'

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
   * Export Buku Induk individual siswa ke PDF A4 portrait.
   * Data sensitif hanya dicetak ketika includeSensitive=true.
   */
  async function exportStudentBook(
    student: Student,
    school: AppSettings | null = null,
    includeSensitive = true,
    enrollmentHistory: StudentEnrollment[] = [],
  ) {
    if (!student?.id || !student.fullName) {
      toast.warning('Data siswa belum siap untuk dicetak.')
      return
    }

    isExporting.value = true
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const margin = 14
      const pageWidth = doc.internal.pageSize.getWidth()
      const schoolName = school?.schoolName || 'Madrasah/Sekolah'
      const subtitle = school?.schoolAddress || school?.schoolPhone || ''

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.text(schoolName, pageWidth / 2, 16, { align: 'center' })
      doc.setFontSize(11)
      doc.text('BUKU INDUK PESERTA DIDIK', pageWidth / 2, 23, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      if (subtitle) doc.text(subtitle, pageWidth / 2, 29, { align: 'center', maxWidth: pageWidth - margin * 2 })

      let y = subtitle ? 34 : 31

      const textValue = (value: unknown) => {
        if (value == null || value === '') return '—'
        return String(value)
      }
      const fmtDate = (value?: string) => {
        if (!value) return '—'
        try { return formatDate(value, 'dd MMMM yyyy') } catch { return value }
      }
      const section = (title: string) => {
        doc.setFillColor(241, 245, 249)
        doc.rect(margin, y, pageWidth - margin * 2, 7, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(title, margin + 2, y + 4.7)
        y += 9
      }
      const rowsFor = (items: Array<[string, string]>) =>
        items.map(([label, value]) => [label, value])

      async function imageUrlToDataUrl(url?: string): Promise<string | null> {
        if (!url) return null
        try {
          const response = await fetch(url)
          if (!response.ok) return null
          const blob = await response.blob()
          if (!blob.type.startsWith('image/')) return null
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result || ''))
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch {
          return null
        }
      }

      section('Identitas Siswa')
      let photoDataUrl: string | null = null
      if (student.photoUrl) {
        photoDataUrl = await imageUrlToDataUrl(student.photoUrl)
        if (photoDataUrl) {
          const photoW = 34
          const photoH = 43
          const photoX = pageWidth - margin - photoW
          doc.setDrawColor(203, 213, 225)
          doc.rect(photoX, y, photoW, photoH)
          doc.addImage(photoDataUrl, 'JPEG', photoX + 1, y + 1, photoW - 2, photoH - 2)
        }
      }
      autoTable(doc, {
        startY: y,
        theme: 'plain',
        margin: { left: margin, right: photoDataUrl ? margin + 40 : margin },
        styles: { fontSize: 8.5, cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold', textColor: [71, 85, 105] } },
        body: rowsFor([
          ['Nama Lengkap', textValue(student.fullName)],
          ['NIS', textValue(student.nis)],
          ['NISN', textValue(student.nisn)],
          ...(includeSensitive ? [['NIK', textValue(student.nik)] as [string,string]] : []),
          ['Jenis Kelamin', formatGender(student.gender)],
          ['Tempat / Tanggal Lahir', `${textValue(student.birthPlace)} / ${fmtDate(student.birthDate)}`],
          ['Agama', textValue(student.religion)],
          ['Kewarganegaraan', textValue(student.nationality)],
          ['Status Keluarga', textValue(student.familyStatus)],
        ]),
      })
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 5

      section('Alamat & Kontak')
      autoTable(doc, {
        startY: y,
        theme: 'plain',
        margin: { left: margin, right: margin },
        styles: { fontSize: 8.5, cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold', textColor: [71, 85, 105] } },
        body: rowsFor([
          ['Alamat', textValue(student.address)],
          ['RT/RW', textValue(student.rtRw)],
          ['Desa/Kelurahan', textValue(student.village)],
          ['Kecamatan', textValue(student.district)],
          ['Kabupaten/Kota', textValue(student.city)],
          ['Provinsi', textValue(student.province)],
          ['Kode Pos', textValue(student.postalCode)],
          ['No. HP', textValue(student.phone)],
          ['Email', textValue(student.email)],
        ]),
      })
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 5

      const addPageIfNeeded = (minSpace = 45) => {
        const pageHeight = doc.internal.pageSize.getHeight()
        if (y > pageHeight - minSpace) {
          doc.addPage()
          y = margin
        }
      }

      if (includeSensitive) {
        section('Orang Tua / Wali')
        const parentRows = (student.parents ?? []).map(parent => [
          parent.relationship === 'father' ? 'Ayah' : parent.relationship === 'mother' ? 'Ibu' : 'Wali',
          textValue(parent.fullName),
          textValue(parent.nik),
          textValue(parent.education),
          textValue(parent.occupation),
          textValue(parent.phone),
        ])
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          styles: { fontSize: 7.5, cellPadding: 2 },
          headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
          head: [['Hubungan', 'Nama', 'NIK', 'Pendidikan', 'Pekerjaan', 'No. HP']],
          body: parentRows.length ? parentRows : [['—', 'Data tidak tersedia', '—', '—', '—', '—']],
        })
        y = ((doc as any).lastAutoTable?.finalY ?? y) + 5
      }

      addPageIfNeeded()
      if (includeSensitive) {
        section('Kesehatan')
        const h = student.health
        autoTable(doc, {
          startY: y,
          theme: 'plain',
          margin: { left: margin, right: margin },
          styles: { fontSize: 8.5, cellPadding: 2.2, lineColor: [226, 232, 240], lineWidth: 0.1 },
          columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold', textColor: [71, 85, 105] } },
          body: rowsFor([
            ['Golongan Darah', textValue(h?.bloodType)],
            ['Tinggi Badan', h?.heightCm != null ? `${h.heightCm} cm` : '—'],
            ['Berat Badan', h?.weightKg != null ? `${h.weightKg} kg` : '—'],
            ['Kebutuhan Khusus', textValue(h?.specialNeeds)],
            ['Alergi', textValue(h?.allergies)],
            ['Catatan Kesehatan', textValue(h?.healthNotes)],
          ]),
        })
        y = ((doc as any).lastAutoTable?.finalY ?? y) + 5
      }

      addPageIfNeeded()
      section('Riwayat Pendidikan')
      const educationRows = (student.educationHistory ?? []).map(ed => [
        textValue(ed.level),
        textValue(ed.schoolName),
        ed.graduationYear != null ? String(ed.graduationYear) : '—',
        textValue(ed.certificateNumber),
      ])
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        head: [['Jenjang', 'Sekolah', 'Tahun Lulus', 'No. Ijazah']],
        body: educationRows.length ? educationRows : [['—', 'Belum ada data', '—', '—']],
      })
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 5

      addPageIfNeeded()
      section('Riwayat Kelas')
      const history = enrollmentHistory.length
        ? enrollmentHistory
        : (student.currentEnrollment ? [student.currentEnrollment] : [])
      const enrollmentRows = history.map(enr => [
        textValue(enr.classroomName),
        textValue(enr.schoolYearName),
        fmtDate(enr.entryDate),
        textValue(enr.status),
      ])
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        head: [['Kelas', 'Tahun Pelajaran', 'Tanggal Masuk', 'Status']],
        body: enrollmentRows.length ? enrollmentRows : [['—', '—', '—', '—']],
      })
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 5

      if (student.notes) {
        addPageIfNeeded(35)
        section('Catatan')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        const noteLines = doc.splitTextToSize(String(student.notes), pageWidth - margin * 2)
        doc.text(noteLines, margin, y + 1)
      }

      const totalPages = doc.getNumberOfPages()
      for (let page = 1; page <= totalPages; page++) {
        doc.setPage(page)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(100, 116, 139)
        doc.text(`Dicetak ${formatDate(new Date().toISOString(), 'dd MMMM yyyy')} • Halaman ${page}/${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
      }

      const safeName = student.fullName.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'siswa'
      doc.save(`buku-induk-${safeName}.pdf`)
      toast.success('Buku Induk PDF berhasil dibuat.')
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat Buku Induk PDF.')
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

  return { isExporting, exportToExcel, exportToPDF, exportStudentBook, printPage }
}
