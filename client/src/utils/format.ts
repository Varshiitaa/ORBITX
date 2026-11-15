export function usd(value: number) {
  const amount = Math.abs(Math.round(value)).toLocaleString('en-US')
  return value < 0 ? `-$${amount}` : `$${amount}`
}

export function kg(value: number) {
  return `${Math.round(value).toLocaleString('en-US')} kg`
}

export function watts(value: number) {
  return `${Math.round(value).toLocaleString('en-US')} W`
}

export function signedWatts(value: number) {
  const rounded = Math.round(value)
  const body = Math.abs(rounded).toLocaleString('en-US')
  if (rounded > 0) return `+${body} W`
  if (rounded < 0) return `-${body} W`
  return '0 W'
}

export function km(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000
    return `${millions >= 100 ? millions.toFixed(0) : millions.toFixed(1)} million km`
  }
  return `${Math.round(value).toLocaleString('en-US')} km`
}

export function daysLabel(days: number) {
  return `${days.toLocaleString('en-US')} days`
}

export function dataRate(value: number) {
  if (!Number.isFinite(value)) return '—'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} Gb/s`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} Mb/s`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} kb/s`
  return `${value.toFixed(0)} b/s`
}

export function percent(value: number) {
  return `${Math.round(value)}%`
}

export function missionClock(hours: number) {
  const safe = Math.max(0, hours)
  const day = Math.floor(safe / 24) + 1
  const hour = Math.floor(safe % 24)
  const minute = Math.floor((safe % 1) * 60)
  return `Day ${day} · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
