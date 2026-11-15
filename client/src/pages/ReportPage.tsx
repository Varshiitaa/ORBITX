import { Link, useNavigate } from 'react-router-dom'
import { ACHIEVEMENTS } from '../engine/scoring'
import { useActiveMission } from '../hooks/useActiveMission'
import { useMissionStore } from '../store/missionStore'
import { kg, percent, signedWatts, usd, watts } from '../utils/format'
import { downloadMissionPdf } from '../utils/reportPdf'
import { bestScore, readGameHistory } from '../games/history'
import { Button, EmptyMission, Meter, PageHeader } from '../components/ui'

export function ReportPage() {
  const navigate = useNavigate()
  const { mission } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  const duplicateMission = useMissionStore((state) => state.duplicateMission)
  if (!mission) return <EmptyMission onCreate={() => { createMission(); navigate('/app/report') }} />
  const report = mission.report
  if (!report) {
    return (
      <div>
        <PageHeader kicker="Mission report" title="The report is written when the flight ends." description="Finish or fail a simulation to score engineering, science, resources, reliability, and budget." />
        <Link to="/app/simulation" className="text-sm text-accent">Go to simulation</Link>
      </div>
    )
  }
  const badges = ACHIEVEMENTS.filter((item) => report.achievements.includes(item.id))
  const scores = [
    ['Engineering', report.score.engineering, report.score.notes.engineering],
    ['Science', report.score.science, report.score.notes.science],
    ['Resources', report.score.resources, report.score.notes.resources],
    ['Reliability', report.score.reliability, report.score.notes.reliability],
    ['Budget', report.score.budget, report.score.notes.budget],
  ] as const

  return (
    <div>
      <PageHeader
        kicker="Final mission report"
        title={report.outcome}
        description={`${mission.name} scored ${report.score.total} out of 100. The success indicator is ${report.successPct}%. Weights are engineering 28%, science 26%, resources 16%, reliability 18%, budget 12%.`}
        actions={
          <>
            <Button onClick={() => downloadMissionPdf(mission)}>Download PDF</Button>
            <Button variant="secondary" onClick={() => { duplicateMission(mission.id); navigate('/app/archive') }}>
              Duplicate mission
            </Button>
          </>
        }
      />
      {report.failureReason ? <p className="mb-4 text-sm text-bad">{report.failureReason}</p> : null}
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <section className="panel grid place-items-center p-6 text-center">
          <p className="kicker">Overall score</p>
          <p className="num mt-3 text-6xl">{report.score.total}</p>
          <p className="mt-2 text-sm text-mute">out of 100</p>
        </section>
        <section className="panel p-5">
          <ul className="space-y-4">
            {scores.map(([label, value, note]) => (
              <li key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="num">{value}</span>
                </div>
                <Meter value={value} />
                <p className="mt-1 text-xs text-faint">{note}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <p className="kicker">Scientific objectives</p>
          <ul className="mt-3 space-y-3 text-sm">
            {report.objectives.map((objective) => (
              <li key={objective.id}>
                <span className="text-ink">{objective.name}</span>
                <span className={`ml-2 ${objective.status === 'completed' ? 'text-good' : objective.status === 'partial' ? 'text-warn' : 'text-bad'}`}>{objective.status}</span>
                <span className="mt-1 block text-mute">{objective.note}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel p-5 text-sm">
          <p className="kicker">Closure numbers</p>
          <ul className="mt-3 space-y-2 text-mute">
            <li>Budget spent {usd(report.budgetSpentUsd)} of {usd(report.totalBudgetUsd)}. Remaining {usd(report.remainingBudgetUsd)}.</li>
            <li>Spacecraft health {Math.round(report.health)}.</li>
            <li>Fuel remaining {kg(report.fuelRemainingKg)} of {kg(report.fuelCapacityKg)}. Used {percent(report.fuelEfficiency)}.</li>
            <li>Power {watts(report.powerGeneratedW)} generated, {watts(report.powerConsumedW)} cruise load, balance {signedWatts(report.powerBalanceW)}.</li>
            <li>Link index {percent(report.commsCapacity * 100)}.</li>
            <li>Data collected {report.dataCollected.toFixed(1)}. Data returned {report.dataReturned.toFixed(1)}.</li>
            <li>Final temperature {report.temperatureC.toFixed(1)} °C.</li>
            <li>Stages cleared {report.stagesCleared} of {report.stageCount}.</li>
          </ul>
        </section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-5">
          <p className="kicker">Problems encountered</p>
          <ul className="mt-3 space-y-2 text-sm text-mute">
            {report.problems.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
        </section>
        <section className="panel p-5">
          <p className="kicker">Decisions that shaped the result</p>
          <ul className="mt-3 space-y-2 text-sm text-mute">
            {report.decisions.map((decision) => <li key={decision}>{decision}</li>)}
          </ul>
        </section>
      </div>
      {report.events.length > 0 ? (
        <section className="panel mt-6 p-5">
          <p className="kicker">Anomaly record</p>
          <ul className="mt-3 space-y-3 text-sm">
            {report.events.map((event) => (
              <li key={`${event.eventId}-${event.optionId}`}>
                <span className="text-ink">{event.title}: {event.choice}.</span>
                <span className="mt-1 block text-mute">{event.outcome}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="panel mt-6 p-5">
        <p className="kicker">Training record</p>
        <p className="mt-2 text-sm text-mute">Best scores from Space Games on this device. They do not change the flight score above.</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['Orbit Master', bestScore(readGameHistory(), 'orbit')],
            ['Spacecraft Engineer', bestScore(readGameHistory(), 'engineer')],
            ['Mission Survival', bestScore(readGameHistory(), 'survival')],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs text-faint">{label}</dt>
              <dd className="num mt-1 text-2xl">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="mt-6">
        <p className="kicker">Achievements from this flight</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {badges.length === 0 ? <li className="text-sm text-mute">None on this flight.</li> : null}
          {badges.map((badge) => (
            <li key={badge.id} className="rounded-full border border-line px-3 py-1 text-sm">{badge.name}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
