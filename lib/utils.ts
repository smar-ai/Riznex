export function gbp(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '£0.00'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(value)
}

export function pct(value: number | null | undefined, decimals = 1): string {
  if (value == null || isNaN(value)) return '0.0%'
  return `${(value * 100).toFixed(decimals)}%`
}

export function fmtDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function fmtDateInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getWeekStart(date = new Date()): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  d.setUTCDate(diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function getWeekEnd(weekStart: Date): Date {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + 6)
  d.setUTCHours(23, 59, 59, 999)
  return d
}

export function getMonthStart(date = new Date()): Date {
  const d = new Date(date)
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export function getMonthEnd(date = new Date()): Date {
  const d = new Date(date)
  d.setUTCMonth(d.getUTCMonth() + 1)
  d.setUTCDate(0)
  d.setUTCHours(23, 59, 59, 999)
  return d
}

export function platformLabel(platform: string, store?: string): string {
  const isTasty = store && store.includes('Tasty')
  if (platform === 'POS' || platform === 'In-Store POS') {
    return isTasty ? 'Tasty Bun POS' : 'Herbies POS'
  }
  if (isTasty) {
    if (platform === 'Website' || platform === 'Tasty Bun Website') return 'Tasty Bun Website'
    if (platform === 'Mobile App' || platform === 'Tasty Bun Mobile App') return 'Tasty Bun Mobile App'
    if (platform === 'Web & App' || platform === 'Tasty Bun Web & App') return 'Tasty Bun Web & App'
  } else {
    if (platform === 'Website' || platform === 'Mobile App' || platform === 'Web & App') {
      return 'Herbies Web & App'
    }
  }

  const map: Record<string, string> = {
    just_eat: 'Just Eat',
    uber_eats: 'Uber Eats',
    deliveroo: 'Deliveroo',
    'Just Eat': 'Just Eat',
    'Uber Eats': 'Uber Eats',
    'Deliveroo': 'Deliveroo',
    'Herbies POS': 'Herbies POS',
    'Tasty Bun POS': 'Tasty Bun POS',
    'Herbies Web & App': 'Herbies Web & App',
    'Tasty Bun Web & App': 'Tasty Bun Web & App',
    'Herbies Website': 'Herbies Web & App',
    'Tasty Bun Website': 'Tasty Bun Website',
    'Herbies Mobile App': 'Herbies Web & App',
    'Tasty Bun Mobile App': 'Tasty Bun Mobile App',
    walk_in: 'Walk-in',
    cash: 'Cash',
  }
  return map[platform] ?? platform
}

export function platformColor(platform: string): string {
  const map: Record<string, string> = {
    just_eat: '#f97316',
    uber_eats: '#22d3a5',
    deliveroo: '#4f8ef7',
    'Just Eat': '#f97316',
    'Uber Eats': '#22d3a5',
    'Deliveroo': '#4f8ef7',
    'Herbies POS': '#ef4444',
    'Tasty Bun POS': '#f59e0b',
    'Herbies Web & App': '#ec4899',
    'Tasty Bun Web & App': '#e11d48',
    'Herbies Website': '#ec4899',
    'Tasty Bun Website': '#e11d48',
    'Herbies Mobile App': '#8b5cf6',
    'Tasty Bun Mobile App': '#a855f7',
    'POS': '#ef4444',
    'Website': '#ec4899',
    'Mobile App': '#8b5cf6',
    walk_in: '#a78bfa',
    cash: '#fbbf24',
  }
  return map[platform] ?? '#8892b0'
}

export function expenseCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    wages: 'Staff Wages',
    electricity: 'Electricity',
    gas: 'Gas',
    water: 'Water',
    internet: 'Internet',
    fuel: 'Fuel',
    rent: 'Rent',
    tax: 'Tax / VAT',
    misc: 'Miscellaneous',
    fees: 'Franchise & POS Fees',
    social_media: 'Social Media Handling Fee',
    facebook_ads: 'Facebook Ads',
    google_ads: 'Google Ads',
    newspaper_ads: 'Newspaper Ads',
    print_material: 'Print Material',
    marketing_misc: 'Other Marketing',
    herbies_head_office: 'Herbies Pizza Head Office Marketing',
  }
  return map[cat] ?? cat
}

export const EXPENSE_CATEGORIES = [
  { value: 'wages', label: 'Staff Wages' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'gas', label: 'Gas' },
  { value: 'water', label: 'Water' },
  { value: 'internet', label: 'Internet' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'rent', label: 'Rent' },
  { value: 'tax', label: 'Tax / VAT' },
  { value: 'misc', label: 'Miscellaneous' },
  { value: 'fees', label: 'Franchise & POS Fees' },
  { value: 'social_media', label: 'Social Media Handling Fee' },
  { value: 'facebook_ads', label: 'Facebook Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'newspaper_ads', label: 'Newspaper Ads' },
  { value: 'print_material', label: 'Print Material' },
  { value: 'marketing_misc', label: 'Other Marketing' },
  { value: 'herbies_head_office', label: 'Herbies Pizza Head Office Marketing' },
]

export const PLATFORMS = [
  { value: 'Deliveroo', label: 'Deliveroo', color: '#4f8ef7' },
  { value: 'Just Eat', label: 'Just Eat', color: '#f97316' },
  { value: 'Uber Eats', label: 'Uber Eats', color: '#22d3a5' },
  { value: 'Herbies POS', label: 'Herbies POS', color: '#ef4444' },
  { value: 'Herbies Web & App', label: 'Herbies Web & App', color: '#ec4899' },
  { value: 'Tasty Bun POS', label: 'Tasty Bun POS', color: '#f59e0b' },
  { value: 'Tasty Bun Web & App', label: 'Tasty Bun Web & App', color: '#e11d48' },
  { value: 'Tasty Bun Website', label: 'Tasty Bun Website', color: '#e11d48' },
  { value: 'Tasty Bun Mobile App', label: 'Tasty Bun Mobile App', color: '#a855f7' },
]
