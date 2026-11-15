import { describe, expect, it } from 'vitest'
import { applyControl, createApproach, orbitChallenge, scoreOrbit } from './orbit'
import { engineerMission, scoreEngineer } from './engineer'
import { chooseResponse, createSurvival, scoreSurvival, survivalEvents } from './survival'
import { unlockedGameBadges, type GameResult } from './history'

function fly(difficulty: 'beginner' | 'intermediate' | 'expert', burns: { direction: -1 | 0 | 1; burnSeconds: number }[]) {
  const challenge = orbitChallenge(difficulty)
  let craft = createApproach(challenge)
  for (const burn of burns) {
    craft = applyControl(craft, challenge, burn)
    if (craft.status !== 'flying') break
  }
  return { challenge, craft }
}

describe('orbit master', () => {
  it('captures when the prograde burn matches circular speed', () => {
    const challenge = orbitChallenge('beginner')
    const seconds = challenge.speedDeficitKmS / challenge.thrustKmS2
    const { craft } = fly('beginner', [{ direction: 1, burnSeconds: seconds }])
    expect(craft.status).toBe('orbit')
    const score = scoreOrbit(craft, challenge)
    expect(score.won).toBe(true)
    expect(score.total).toBeGreaterThan(60)
    expect(score.fuel).toBeGreaterThan(40)
  })

  it('falls short when the burn is too small', () => {
    const { craft, challenge } = fly('beginner', [{ direction: 1, burnSeconds: 0.4 }])
    expect(craft.status).not.toBe('orbit')
    expect(craft.speedErrorKmS).toBeGreaterThan(challenge.speedToleranceKmS)
    expect(scoreOrbit(craft, challenge).won).toBe(false)
  })

  it('escapes when the burn is far past circular speed', () => {
    const { craft } = fly('beginner', [{ direction: 1, burnSeconds: 90 }])
    expect(craft.status).toBe('escape')
  })

  it('runs out of fuel before a capture when the tanks are used up off target', () => {
    const challenge = orbitChallenge('expert')
    let craft = createApproach(challenge)
    craft = applyControl(craft, challenge, { direction: -1, burnSeconds: 40 })
    expect(['fuel', 'crash']).toContain(craft.status)
    expect(scoreOrbit(craft, challenge).won).toBe(false)
  })

  it('scores a capture above a miss', () => {
    const challenge = orbitChallenge('beginner')
    const captured = fly('beginner', [{ direction: 1, burnSeconds: challenge.speedDeficitKmS / challenge.thrustKmS2 }])
    const missed = fly('beginner', [{ direction: 0, burnSeconds: 0 }])
    expect(scoreOrbit(captured.craft, challenge).total).toBeGreaterThan(scoreOrbit(missed.craft, challenge).total)
  })
})

describe('spacecraft engineer', () => {
  const stack = {
    structure: 'struct-standard',
    propulsion: 'prop-chemical',
    power: 'power-high-solar',
    communication: 'comm-medium',
    thermal: 'thermal-basic',
    storage: 'store-standard',
  }

  it('accepts a Mars chemical stack only when the launcher can lift it', () => {
    const heavy = scoreEngineer(engineerMission({
      difficulty: 'intermediate',
      spacecraft: stack,
      instrumentIds: ['inst-radar', 'inst-ir'],
      launchVehicleId: 'lv-heavy',
    }))
    const explorer = scoreEngineer(engineerMission({
      difficulty: 'intermediate',
      spacecraft: stack,
      instrumentIds: ['inst-radar', 'inst-ir'],
      launchVehicleId: 'lv-explorer',
    }))
    expect(heavy.won).toBe(true)
    expect(heavy.mass).toBeGreaterThan(0)
    expect(heavy.power).toBeGreaterThan(0)
    expect(explorer.won).toBe(false)
    expect(explorer.mass).toBe(0)
    expect(heavy.total).toBeGreaterThan(explorer.total)
  })

  it('rejects an empty bus and a power deficit', () => {
    const empty = scoreEngineer(engineerMission({
      difficulty: 'beginner',
      spacecraft: { structure: null, propulsion: null, power: null, communication: null, thermal: null, storage: null },
      instrumentIds: [],
      launchVehicleId: null,
    }))
    expect(empty.won).toBe(false)
    expect(empty.errors).toBeGreaterThan(0)
    const dark = scoreEngineer(engineerMission({
      difficulty: 'expert',
      spacecraft: { ...stack, power: 'power-basic-solar', structure: 'struct-heavy', propulsion: 'prop-electric', communication: 'comm-high', thermal: 'thermal-advanced', storage: 'store-high' },
      instrumentIds: ['inst-mag'],
      launchVehicleId: 'lv-explorer',
    }))
    expect(dark.power).toBe(0)
    expect(dark.won).toBe(false)
  })
})

describe('mission survival', () => {
  it('survives the safe choices and fails the reckless ones', () => {
    for (const difficulty of ['beginner', 'intermediate', 'expert'] as const) {
      let safe = createSurvival(difficulty)
      for (const event of survivalEvents(difficulty)) {
        const best = event.options.find((option) => option.quality === 'best')
        safe = chooseResponse(safe, difficulty, best?.id ?? event.options[0].id)
      }
      expect(safe.status).toBe('won')
      expect(safe.resources.health).toBeGreaterThan(20)
      expect(safe.resources.fuelKg).toBeGreaterThan(0)
      expect(scoreSurvival(safe).won).toBe(true)

      let reckless = createSurvival(difficulty)
      for (const event of survivalEvents(difficulty)) {
        if (reckless.status !== 'playing') break
        const poor = event.options.find((option) => option.quality === 'poor')
        reckless = chooseResponse(reckless, difficulty, poor?.id ?? event.options[0].id)
      }
      expect(reckless.status).toBe('lost')
      expect(scoreSurvival(reckless).total).toBeLessThan(scoreSurvival(safe).total)
    }
  })

  it('changes resources differently for each response', () => {
    const start = createSurvival('beginner')
    const event = survivalEvents('beginner')[0]
    const outcomes = event.options.map((option) => chooseResponse(start, 'beginner', option.id).resources.health)
    expect(new Set(outcomes).size).toBe(event.options.length)
  })
})

describe('game badges', () => {
  it('unlocks from stored results', () => {
    const history: GameResult[] = [
      { id: '1', game: 'orbit', difficulty: 'expert', won: true, score: 80, summary: '', at: '', fuelFraction: 0.5, science: 0 },
      { id: '2', game: 'engineer', difficulty: 'intermediate', won: true, score: 77, summary: '', at: '', science: 74 },
      { id: '3', game: 'survival', difficulty: 'beginner', won: true, score: 70, summary: '', at: '', science: 40 },
    ]
    const names = unlockedGameBadges(history).map((badge) => badge.name)
    expect(names).toEqual(expect.arrayContaining(['Orbital Expert', 'Master Engineer', 'Mission Survivor', 'Fuel Saver', 'Scientific Explorer']))
  })
})
