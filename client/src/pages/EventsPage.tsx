import { Link, useNavigate } from 'react-router-dom'
import { useActiveMission } from '../hooks/useActiveMission'
import { useMissionStore } from '../store/missionStore'
import { EmptyMission, PageHeader } from '../components/ui'
import { EventDecision } from '../components/EventDecision'

export function EventsPage() {
  const navigate = useNavigate()
  const { mission } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  if (!mission) return <EmptyMission onCreate={() => { createMission(); navigate('/app/events') }} />
  const flight = mission.flight

  return (
    <div>
      <PageHeader
        kicker="Mission events"
        title="The flight does not stay on the script."
        description="Anomalies are drawn from the destination and difficulty when the simulation starts. The clock holds until you choose. Each choice changes propellant, health, power margin, or the science return."
      />
      {flight?.pending ? <EventDecision pending={flight.pending} /> : null}
      {!flight ? (
        <div className="panel max-w-xl p-6">
          <p className="text-sm text-mute">Events are scheduled during cruise. Start the simulation to meet them.</p>
          <Link to="/app/simulation" className="mt-4 inline-block text-sm text-accent">Open simulation</Link>
        </div>
      ) : null}
      <section className="mt-6">
        <p className="kicker">Responses so far</p>
        <ul className="mt-4 space-y-4">
          {flight?.resolutions.map((event) => (
            <li key={`${event.eventId}-${event.optionId}`} className="panel p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg">{event.title}</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{event.risk} risk</span>
              </div>
              <p className="mt-2 text-sm text-ink">{event.choice}</p>
              <p className="mt-1 text-sm text-mute">{event.outcome}</p>
            </li>
          ))}
          {flight && flight.resolutions.length === 0 && !flight.pending ? (
            <li className="text-sm text-mute">No anomaly has been reached yet. {mission.difficulty === 'beginner' ? 'Beginner flights draw one.' : mission.difficulty === 'intermediate' ? 'Intermediate flights draw two.' : 'Expert flights draw three.'}</li>
          ) : null}
        </ul>
      </section>
    </div>
  )
}
