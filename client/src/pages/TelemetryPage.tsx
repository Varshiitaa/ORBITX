import { Link, useNavigate } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useActiveMission } from '../hooks/useActiveMission'
import { useMissionStore } from '../store/missionStore'
import { missionClock, percent } from '../utils/format'
import { EmptyMission, PageHeader } from '../components/ui'

const tooltip = {
  contentStyle: { background: '#0d1320', border: '1px solid #2a384e', borderRadius: 12 },
  labelStyle: { color: '#9aa8bd' },
}

export function TelemetryPage() {
  const navigate = useNavigate()
  const { mission, metrics } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  if (!mission || !metrics) return <EmptyMission onCreate={() => { createMission(); navigate('/app/telemetry') }} />
  const flight = mission.flight
  const sample = flight?.telemetry
  const rows = (flight?.samples ?? []).map((item) => ({
    t: Math.round(item.hours),
    altitude: Math.round(item.altitudeKm),
    velocity: Number(item.velocityKms.toFixed(2)),
    fuel: Math.max(0, Math.round(item.fuelKg)),
    battery: Math.round(item.batteryPct),
    temperature: Number(item.temperatureC.toFixed(1)),
    signal: Math.round(item.signalPct),
    health: Math.round(item.health),
  }))

  const systems = [
    { name: 'Propulsion', state: metrics.tankPropellantKg > 0 ? 'Nominal' : 'Open' },
    { name: 'Power', state: metrics.powerBalanceW < 0 ? 'Critical' : metrics.powerBalanceW < 40 ? 'Watch' : 'Nominal' },
    { name: 'Communications', state: metrics.commsCapacity >= 0.7 ? 'Nominal' : metrics.commsCapacity >= 0.45 ? 'Watch' : 'Critical' },
    { name: 'Thermal', state: metrics.equilibriumTempC > 80 ? 'Critical' : metrics.equilibriumTempC > 50 ? 'Watch' : 'Nominal' },
    { name: 'Payload', state: metrics.scienceCoverage >= 1 ? 'Nominal' : 'Open' },
  ]

  return (
    <div>
      <PageHeader
        kicker="Live telemetry · simulated"
        title="The bus, as the model sees it."
        description="Every value below is simulated educational telemetry generated from your spacecraft and the phase of the flight. ORBITX is not connected to a real spacecraft."
      />
      {!flight ? (
        <div className="panel max-w-xl p-6">
          <p className="text-sm text-mute">Telemetry streams after you start the simulation. There is nothing to plot yet.</p>
          <Link to="/app/simulation" className="mt-4 inline-block text-sm text-accent">Go to simulation</Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-faint">
            Simulated clock {missionClock(flight.totalElapsedHours)} · progress {percent(sample?.progressPct ?? 0)} · {mission.status}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Readout label="Altitude" value={sample ? `${Math.round(sample.altitudeKm).toLocaleString('en-US')} km` : '—'} />
            <Readout label="Velocity" value={sample ? `${sample.velocityKms.toFixed(2)} km/s` : '—'} />
            <Readout label="Fuel remaining" value={sample ? `${Math.max(0, Math.round(sample.fuelKg)).toLocaleString('en-US')} kg` : '—'} />
            <Readout label="Battery" value={sample ? `${Math.round(sample.batteryPct)}%` : '—'} />
            <Readout label="Temperature" value={sample ? `${sample.temperatureC.toFixed(1)} °C` : '—'} />
            <Readout label="Signal strength" value={sample ? `${Math.round(sample.signalPct)}%` : '—'} />
            <Readout label="Spacecraft health" value={sample ? `${Math.round(sample.health)}` : '—'} />
            <Readout label="Data returned" value={sample ? sample.dataReturned.toFixed(1) : '—'} />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Trend title="Altitude (km)" data={rows} dataKey="altitude" />
            <Trend title="Velocity (km/s)" data={rows} dataKey="velocity" />
            <Trend title="Fuel (kg)" data={rows} dataKey="fuel" />
            <Trend title="Battery (%)" data={rows} dataKey="battery" />
            <Trend title="Temperature (°C)" data={rows} dataKey="temperature" />
            <Trend title="Signal and health" data={rows} dataKey="signal" extra="health" />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="panel p-5">
              <p className="kicker">Mission event log</p>
              <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto">
                {flight.log.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <span className="font-mono text-[10px] text-faint">{entry.stamp}</span>
                    <span className="mt-1 block text-mute">{entry.message}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="panel p-5">
              <p className="kicker">System health</p>
              <ul className="mt-3 space-y-3 text-sm">
                {systems.map((system) => (
                  <li key={system.name} className="flex items-center justify-between">
                    <span>{system.name}</span>
                    <span className={system.state === 'Critical' ? 'text-bad' : system.state === 'Watch' ? 'text-warn' : 'text-good'}>{system.state}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-faint">
                Communication status follows the link index ({percent(metrics.commsCapacity * 100)}) plus any anomaly offset. These labels describe the educational model.
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <section className="panel p-4">
      <p className="kicker">{label}</p>
      <p className="num mt-2 text-xl">{value}</p>
    </section>
  )
}

function Trend({ title, data, dataKey, extra }: { title: string; data: object[]; dataKey: string; extra?: string }) {
  return (
    <section className="panel p-4">
      <p className="kicker">{title}</p>
      <div className="mt-2 h-44">
        {data.length < 2 ? (
          <p className="pt-8 text-sm text-mute">The line fills in as simulated time advances.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="t" hide />
              <YAxis stroke="#73829a" fontSize={11} width={48} tickLine={false} axisLine={false} />
              <Tooltip {...tooltip} />
              <Line type="monotone" dataKey={dataKey} stroke="#9fd0ff" dot={false} strokeWidth={1.6} />
              {extra ? <Line type="monotone" dataKey={extra} stroke="#c4b5fd" dot={false} strokeWidth={1.4} /> : null}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
