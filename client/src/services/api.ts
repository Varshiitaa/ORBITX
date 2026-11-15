import type { MissionConfig } from '../types'

export async function getHealth() {
  try {
    const response = await fetch('/api/health')
    if (!response.ok) return null
    const body = (await response.json()) as { ok?: boolean; mongo?: boolean; mode?: string }
    return { ok: Boolean(body.ok), mongo: Boolean(body.mongo), mode: body.mode ?? 'demo' }
  } catch {
    return null
  }
}

export async function fetchMissions() {
  try {
    const response = await fetch('/api/missions')
    if (!response.ok) return null
    const body = (await response.json()) as unknown
    return Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

export async function saveMission(mission: MissionConfig) {
  const response = await fetch(`/api/missions/${mission.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mission),
  })
  if (!response.ok) throw new Error('The mission could not be saved to the database.')
}

export async function deleteMissionRemote(id: string) {
  const response = await fetch(`/api/missions/${id}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) throw new Error('The mission could not be deleted from the database.')
}
