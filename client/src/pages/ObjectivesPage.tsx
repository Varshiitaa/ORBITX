import { useNavigate } from 'react-router-dom'
import { OBJECTIVES, getMission, instrumentsForObjective } from '../data/catalog'
import { useActiveMission } from '../hooks/useActiveMission'
import { designLocked, useMissionStore } from '../store/missionStore'
import { EmptyMission, IssueList, PageHeader } from '../components/ui'

export function ObjectivesPage() {
  const navigate = useNavigate()
  const { mission, metrics } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  const updateActive = useMissionStore((state) => state.updateActive)
  if (!mission || !metrics) return <EmptyMission onCreate={() => { createMission(); navigate('/app/objectives') }} />
  const destination = getMission(mission.destinationId)
  const locked = designLocked(mission.status)
  const objectiveIssues = metrics.issues.filter((issue) => issue.step === 'objectives' || issue.code.startsWith('objective-'))

  return (
    <div>
      <PageHeader
        kicker="Mission objectives"
        title="What should this flight answer?"
        description="Each objective requires at least one supporting instrument before the mission can launch. A weak destination match still flies, and it reduces the science return."
      />
      {locked ? <p className="mb-4 text-sm text-warn">The design is locked while the simulation is running. Pause is not enough — restart the simulation to edit.</p> : null}
      {mission.report ? <p className="mb-4 text-sm text-mute">Editing this finished mission clears its report.</p> : null}
      <div className="grid gap-4">
        {OBJECTIVES.map((objective) => {
          const selected = mission.objectiveIds.includes(objective.id)
          const suggested = destination?.suggestedObjectiveIds.includes(objective.id)
          const fit = destination ? objective.relevantDestinations.includes(destination.id) : true
          const tools = instrumentsForObjective(objective.id)
          return (
            <button
              key={objective.id}
              type="button"
              disabled={locked}
              data-testid={`objective-${objective.id}`}
              onClick={() =>
                updateActive((current) => ({
                  ...current,
                  objectiveIds: selected ? current.objectiveIds.filter((id) => id !== objective.id) : [...current.objectiveIds, objective.id],
                }))
              }
              className={`rounded-2xl border p-4 text-left disabled:cursor-not-allowed ${selected ? 'border-accent bg-space-900' : 'border-line'}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl">{objective.name}</h2>
                {suggested ? <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Suggested here</span> : null}
                {destination && !fit ? <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">Weak match</span> : null}
                {selected ? <span className="ml-auto text-sm text-good">Selected</span> : null}
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mute">{objective.description}</p>
              <p className="mt-3 text-xs text-faint">Requires one of: {tools.map((tool) => tool.name).join(', ')}</p>
            </button>
          )
        })}
      </div>
      <section className="panel mt-6 p-5">
        <p className="kicker">Objective check</p>
        <div className="mt-3">
          <IssueList issues={objectiveIssues.length > 0 ? objectiveIssues : metrics.issues.filter((issue) => issue.code === 'objectives')} />
        </div>
      </section>
    </div>
  )
}
