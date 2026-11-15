import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMission } from '../data/catalog'
import { useMissionStore } from '../store/missionStore'
import { PageHeader } from '../components/ui'

export function ArchivePage() {
  const navigate = useNavigate()
  const missions = useMissionStore((state) => state.missions)
  const sync = useMissionStore((state) => state.sync)
  const setActive = useMissionStore((state) => state.setActive)
  const deleteMission = useMissionStore((state) => state.deleteMission)
  const duplicateMission = useMissionStore((state) => state.duplicateMission)
  const createMission = useMissionStore((state) => state.createMission)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const note = sync === 'database' ? 'Missions are stored in this browser and in MongoDB.' : 'Missions are stored in this browser. The database is not connected, so this session is the demo save.'

  return (
    <div>
      <PageHeader
        kicker="Saved missions"
        title="Continue, review, or discard."
        description={note}
        actions={
          <button
            type="button"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-space-950"
            onClick={() => {
              createMission()
              navigate('/app/missions')
            }}
          >
            Create mission
          </button>
        }
      />
      {missions.length === 0 ? <p className="text-sm text-mute">No missions saved yet.</p> : null}
      <ul className="space-y-3">
        {missions.map((mission) => {
          const destination = getMission(mission.destinationId)
          return (
            <li key={mission.id} className="panel flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-display text-xl">{mission.name}</h2>
                <p className="mt-1 text-sm text-mute">
                  {destination?.name ?? 'No destination'} · {mission.status} · {mission.difficulty}
                  {mission.report ? ` · score ${mission.report.score.total}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-line px-3 py-1.5 text-sm"
                  onClick={() => {
                    setActive(mission.id)
                    navigate(mission.report ? '/app/report' : '/app')
                  }}
                >
                  {mission.report ? 'View report' : 'Continue'}
                </button>
                <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm" onClick={() => { duplicateMission(mission.id); navigate('/app') }}>
                  Duplicate
                </button>
                {pendingDelete === mission.id ? (
                  <>
                    <button type="button" className="rounded-full border border-bad px-3 py-1.5 text-sm text-bad" onClick={() => { deleteMission(mission.id); setPendingDelete(null) }}>
                      Confirm delete
                    </button>
                    <button type="button" className="rounded-full px-3 py-1.5 text-sm text-mute" onClick={() => setPendingDelete(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" className="rounded-full px-3 py-1.5 text-sm text-mute" onClick={() => setPendingDelete(mission.id)}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
