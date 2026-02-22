import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    critical: 'text-red-600 bg-red-50',
    urgent: 'text-orange-600 bg-orange-50',
    stable: 'text-green-600 bg-green-50',
    active: 'text-blue-600 bg-blue-50',
    admitted: 'text-purple-600 bg-purple-50',
    discharged: 'text-gray-600 bg-gray-50',
    pending_triage: 'text-yellow-600 bg-yellow-50',
    available: 'text-blue-600 bg-blue-50',
    occupied: 'text-gray-600 bg-gray-50',
  }
  return statusColors[status.toLowerCase()] || 'text-gray-600 bg-gray-50'
}

export function getPriorityLabel(priority: number): string {
  const labels: Record<number, string> = {
    1: 'L1 - Critical',
    2: 'L2 - Emergent',
    3: 'L3 - Urgent',
    4: 'L4 - Non-Urgent',
  }
  return labels[priority] || 'Pending Triage'
}

export function getPriorityColor(priority: number): string {
  const colors: Record<number, string> = {
    1: 'text-red-600 bg-red-50',
    2: 'text-orange-600 bg-orange-50',
    3: 'text-yellow-600 bg-yellow-50',
    4: 'text-green-600 bg-green-50',
  }
  return colors[priority] || 'text-gray-600 bg-gray-50'
}

/**
 * Generate a default healthcare avatar SVG based on role and name.
 * Returns a data URI for use as an img src.
 * Uses realistic illustrations: doctors in lab coats with stethoscopes,
 * nurses in scrubs with nurse caps, admins in formal attire.
 */
export function getDefaultAvatar(name: string, role?: string): string {
  // Simple hash from name to pick a variant (0 or 1)
  const hash = name.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
  const variant = hash % 2

  // Skin tone variation based on name hash
  const skinTones = ['#f5d0a9', '#d4a87c']
  const skin = skinTones[variant]
  const skinShadow = variant === 0 ? '#e8b896' : '#b8896e'

  // Hair styles based on hash
  const hairColors = ['#3b2314', '#5c3a1e', '#1a1a2e', '#8b4513']
  const hair = hairColors[hash % hairColors.length]

  let svg: string

  if (role === 'doctor') {
    // Doctor with lab coat & stethoscope
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">` +
      `<rect width="120" height="120" rx="60" fill="#e8f4fc"/>` +
      `<ellipse cx="60" cy="45" rx="22" ry="24" fill="${skin}"/>` +
      `<path d="M38 ${variant === 0 ? '42' : '38'}c0-${variant === 0 ? '14' : '12'} 10-${variant === 0 ? '26' : '22'} 22-${variant === 0 ? '26' : '22'}s22 ${variant === 0 ? '12' : '10'} 22 ${variant === 0 ? '26' : '22'}" fill="${hair}"/>` +
      (variant === 1 ? '' : `<path d="M38 42c0-10 8-20 18-20s18 10 18 20" fill="${hair}"/>`) +
      `<ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#2c1810"/>` +
      `<ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#2c1810"/>` +
      `<path d="M56 54c2 2.5 6 2.5 8 0" stroke="${skinShadow}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="60" cy="50" rx="3" ry="2" fill="${skinShadow}"/>` +
      `<path d="M32 75v35h56v-35c0-14-12.5-24-28-24s-28 10-28 24z" fill="#fff"/>` +
      `<path d="M60 51l-12 24h24z" fill="#fff"/>` +
      `<path d="M48 75l12-24 12 24" fill="none" stroke="#d1d5db" stroke-width="0.8"/>` +
      `<line x1="60" y1="75" x2="60" y2="110" stroke="#d1d5db" stroke-width="0.8"/>` +
      `<path d="M32 75c0-14 12.5-24 28-24s28 10 28 24" fill="none" stroke="#d1d5db" stroke-width="1"/>` +
      `<path d="M42 85c-4 0-7 3-7 6s3 6 7 6" stroke="#4a90d9" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<circle cx="42" cy="97" r="3" fill="#4a90d9"/>` +
      `<path d="M42 91h18" stroke="#4a90d9" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="46" cy="80" r="1.5" fill="#4a90d9"/>` +
      `<circle cx="46" cy="85" r="1.5" fill="#4a90d9"/>` +
      `</svg>`
  } else if (role === 'nurse') {
    // Nurse with scrubs and nurse cap with cross
    const scrubColor = variant === 0 ? '#86efac' : '#6ee7b7'
    const crossColor = variant === 0 ? '#16a34a' : '#059669'
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">` +
      `<rect width="120" height="120" rx="60" fill="#ecfdf5"/>` +
      `<ellipse cx="60" cy="46" rx="21" ry="23" fill="${skin}"/>` +
      `<path d="M39 44c0-14 9-26 21-26s21 12 21 26" fill="${hair}"/>` +
      `<path d="M39 44c-1 8 1 16 4 20" stroke="${hair}" stroke-width="3" fill="none"/>` +
      `<path d="M81 44c1 8-1 16-4 20" stroke="${hair}" stroke-width="3" fill="none"/>` +
      `<rect x="44" y="18" width="32" height="10" rx="3" fill="#fff" stroke="${crossColor}" stroke-width="1.5"/>` +
      `<line x1="60" y1="19" x2="60" y2="27" stroke="${crossColor}" stroke-width="2"/>` +
      `<line x1="56" y1="23" x2="64" y2="23" stroke="${crossColor}" stroke-width="2"/>` +
      `<ellipse cx="52" cy="45" rx="2.5" ry="3" fill="#2c1810"/>` +
      `<ellipse cx="68" cy="45" rx="2.5" ry="3" fill="#2c1810"/>` +
      `<path d="M55 55c2.5 3 7.5 3 10 0" stroke="${skinShadow}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<path d="M32 80v30h56v-30c0-14-12.5-24-28-24s-28 10-28 24z" fill="${scrubColor}"/>` +
      `<path d="M60 56l-8 18h16z" fill="${scrubColor}"/>` +
      `<path d="M50 80v-4l10-20 10 20v4" fill="none" stroke="${crossColor}" stroke-width="0.8"/>` +
      `<rect x="54" y="82" width="12" height="16" rx="2" fill="#fff" stroke="${crossColor}" stroke-width="0.8"/>` +
      `<text x="60" y="93" text-anchor="middle" font-size="8" font-family="Arial" fill="${crossColor}" font-weight="bold">RN</text>` +
      `</svg>`
  } else if (role === 'admin') {
    // Admin with formal attire
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">` +
      `<rect width="120" height="120" rx="60" fill="#f3f0ff"/>` +
      `<ellipse cx="60" cy="45" rx="22" ry="24" fill="${skin}"/>` +
      `<path d="M38 40c0-13 10-24 22-24s22 11 22 24" fill="${hair}"/>` +
      (variant === 1 ? `<path d="M38 40c-2 10 0 20 5 24" stroke="${hair}" stroke-width="3" fill="none"/><path d="M82 40c2 10 0 20-5 24" stroke="${hair}" stroke-width="3" fill="none"/>` : '') +
      `<ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#2c1810"/>` +
      `<ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#2c1810"/>` +
      `<path d="M56 54c2 2.5 6 2.5 8 0" stroke="${skinShadow}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<path d="M32 78v32h56v-32c0-14-12.5-24-28-24s-28 10-28 24z" fill="${variant === 0 ? '#4c1d95' : '#5b21b6'}"/>` +
      `<path d="M60 54l-10 24h20z" fill="#fff"/>` +
      `<line x1="60" y1="78" x2="60" y2="110" stroke="${variant === 0 ? '#6d28d9' : '#7c3aed'}" stroke-width="1"/>` +
      `<circle cx="60" cy="82" r="2" fill="${variant === 0 ? '#6d28d9' : '#7c3aed'}"/>` +
      `</svg>`
  } else {
    // Generic patient/default - simple neutral avatar
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">` +
      `<rect width="120" height="120" rx="60" fill="#f1f5f9"/>` +
      `<ellipse cx="60" cy="45" rx="22" ry="24" fill="${skin}"/>` +
      `<path d="M38 40c0-13 10-24 22-24s22 11 22 24" fill="${hair}"/>` +
      `<ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#2c1810"/>` +
      `<ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#2c1810"/>` +
      `<path d="M56 54c2 2.5 6 2.5 8 0" stroke="${skinShadow}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<path d="M32 78v32h56v-32c0-14-12.5-24-28-24s-28 10-28 24z" fill="#94a3b8"/>` +
      `<path d="M60 54l-10 24h20z" fill="#cbd5e1"/>` +
      `</svg>`
  }

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
