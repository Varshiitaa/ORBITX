import { ACHIEVEMENTS } from '../engine/scoring'
import { GAME_BADGES, readGameHistory, unlockedGameBadges } from '../games/history'
import { useMissionStore } from '../store/missionStore'
import { PageHeader } from '../components/ui'

export function AchievementsPage() {
  const missions = useMissionStore((state) => state.missions)
  const gameBadges = unlockedGameBadges(readGameHistory())
  const earned = new Map<string, string[]>()
  for (const mission of missions) {
    for (const id of mission.report?.achievements ?? []) {
      const names = earned.get(id) ?? []
      names.push(mission.name)
      earned.set(id, names)
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Achievements"
        title="What the flights proved."
        description="Badges are awarded from the scored report. They stay with the saved mission, including after a refresh."
      />
      <p className="kicker">Flight badges</p>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {ACHIEVEMENTS.map((achievement) => {
          const missionsWithIt = earned.get(achievement.id) ?? []
          const unlocked = missionsWithIt.length > 0
          return (
            <li key={achievement.id} className={`panel p-5 ${unlocked ? '' : 'opacity-60'}`}>
              <p className="kicker">{unlocked ? 'Unlocked' : 'Locked'}</p>
              <h2 className="mt-2 font-display text-2xl">{achievement.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mute">{achievement.description}</p>
              {unlocked ? <p className="mt-3 text-xs text-faint">{missionsWithIt.join(', ')}</p> : null}
            </li>
          )
        })}
      </ul>
      <p className="kicker mt-10">Game badges</p>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {GAME_BADGES.map((achievement) => {
          const unlocked = gameBadges.some((badge) => badge.id === achievement.id)
          return (
            <li key={achievement.id} className={`panel p-5 ${unlocked ? '' : 'opacity-60'}`}>
              <p className="kicker">{unlocked ? 'Unlocked' : 'Locked'}</p>
              <h2 className="mt-2 font-display text-2xl">{achievement.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mute">{achievement.description}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
