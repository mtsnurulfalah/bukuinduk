/**
 * Helpers untuk URL foto siswa yang disimpan di Google Drive.
 * Mendukung URL Drive lama maupun URL thumbnail yang digunakan aplikasi.
 */

export function extractGoogleDriveFileId(value: unknown): string {
  const src = String(value ?? '').trim()
  if (!src) return ''

  return (
    src.match(/\/file\/d\/([A-Za-z0-9_-]+)/i)?.[1] ??
    src.match(/[?&]id=([A-Za-z0-9_-]+)/i)?.[1] ??
    (/^[A-Za-z0-9_-]{20,}$/.test(src) ? src : '')
  )
}

export function normalizePhotoUrl(value: unknown): string {
  const src = String(value ?? '').trim()
  if (!src) return ''

  if (/^(data:image\/|blob:)/i.test(src)) return src

  const fileId = extractGoogleDriveFileId(src)
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`
  }

  return src
}

export function getPhotoUrlCandidates(value: unknown): string[] {
  const src = String(value ?? '').trim()
  if (!src) return []

  const fileId = extractGoogleDriveFileId(src)
  if (!fileId) return [src]

  const encodedId = encodeURIComponent(fileId)
  return [
    normalizePhotoUrl(src),
    `https://drive.google.com/uc?export=view&id=${encodedId}`,
    `https://drive.google.com/uc?export=download&id=${encodedId}`,
    `https://lh3.googleusercontent.com/d/${encodedId}=w1000`,
  ].filter((url, index, urls) => urls.indexOf(url) === index)
}
