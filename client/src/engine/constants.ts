import type { Difficulty } from '../types'

/** Standard gravity used in the educational rocket equation, m/s². */
export const G0 = 9.80665

/** Continuous housekeeping load of the spacecraft bus, watts. */
export const BUS_POWER_W = 75

/**
 * Difficulty changes the money available and the propellant reserve.
 * Event counts are how many anomalies are drawn for a flight.
 * Reserve is a multiplier on the rocket-equation propellant load.
 */
export const DIFFICULTY: Record<
  Difficulty,
  { label: string; budget: number; propellant: number; events: number; summary: string }
> = {
  beginner: {
    label: 'Beginner',
    budget: 1.32,
    propellant: 1.16,
    events: 1,
    summary: 'More budget and a larger propellant reserve. One anomaly.',
  },
  intermediate: {
    label: 'Intermediate',
    budget: 1,
    propellant: 1.09,
    events: 2,
    summary: 'Nominal budget and reserve. Two anomalies.',
  },
  expert: {
    label: 'Expert',
    budget: 0.76,
    propellant: 1.04,
    events: 3,
    summary: 'Tight budget, little reserve propellant, and three anomalies.',
  },
}

export const SCORE_WEIGHTS = {
  engineering: 0.28,
  science: 0.26,
  resources: 0.16,
  reliability: 0.18,
  budget: 0.12,
} as const

/** Wall-clock length of a 1× simulation, seconds. */
export const SIM_SECONDS = 90

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function hashSeed(input: string) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
