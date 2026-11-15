import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useActiveMission } from '../hooks/useActiveMission'
import { useMissionStore } from '../store/missionStore'
import { dataRate, kg, percent, signedWatts, usd, watts } from '../utils/format'
import { Button, EmptyMission, IssueList, PageHeader, SpecRow } from '../components/ui'

const tooltip = {
  contentStyle: { background: '#0d1320', border: '1px solid #2a384e', borderRadius: 12 },
  labelStyle: { color: '#9aa8bd' },
  itemStyle: { color: '#e8eef7' },
}

export function ResourcesPage() {
  const navigate = useNavigate()
  const { mission, metrics } = useActiveMission()
  const createMission = useMissionStore((state) => state.createMission)
  if (!mission || !metrics) return <EmptyMission onCreate={() => { createMission(); navigate('/app/resources') }} />

  const costs = [
    { name: 'Hardware', value: Math.round(metrics.costs.components / 1_000_000) },
    { name: 'Payload', value: Math.round(metrics.costs.instruments / 1_000_000) },
    { name: 'Launch', value: Math.round(metrics.costs.launch / 1_000_000) },
    { name: 'Operations', value: Math.round(metrics.costs.operations / 1_000_000) },
  ]
  const masses = [
    { name: 'Structure', value: Math.round(metrics.mass.structure) },
    { name: 'Propulsion', value: Math.round(metrics.mass.propulsion) },
    { name: 'Power', value: Math.round(metrics.mass.power) },
    { name: 'Comms', value: Math.round(metrics.mass.communication) },
    { name: 'Thermal', value: Math.round(metrics.mass.thermal) },
    { name: 'Battery', value: Math.round(metrics.mass.storage) },
    { name: 'Payload', value: Math.round(metrics.mass.payload) },
    { name: 'Fuel', value: Math.round(metrics.mass.propellant) },
  ]
  const power = [
    { name: 'Generated', value: Math.round(metrics.powerGeneratedW) },
    { name: 'Cruise', value: Math.round(metrics.cruiseLoadW) },
    { name: 'Burn peak', value: Math.round(metrics.burnLoadW) },
  ]
  const errors = metrics.issues.filter((issue) => issue.level === 'error')

  return (
    <div>
      <PageHeader
        kicker="Resource manager"
        title="The budget, the watts, and the kilograms."
        description="Remaining budget is the difficulty-adjusted mission budget minus hardware, instruments, launch, and operations. Power balance is generation minus cruise load. Mass must stay under the launcher."
        actions={
          <Button disabled={!metrics.ready || mission.status === 'running'} onClick={() => navigate('/app/simulation')}>
            Proceed to simulation
          </Button>
        }
      />
      {!metrics.ready ? <p className="mb-4 text-sm text-bad">The simulation stays closed until every error below is resolved. You can return to any earlier step and change the design.</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <section className="panel p-4"><p className="kicker">Budget remaining</p><p className="num mt-3 text-2xl">{usd(metrics.remainingBudgetUsd)}</p><p className="mt-1 text-xs text-faint">of {usd(metrics.budgetUsd)}</p></section>
        <section className="panel p-4"><p className="kicker">Spacecraft mass</p><p className="num mt-3 text-2xl">{kg(metrics.totalMassKg)}</p><p className="mt-1 text-xs text-faint">limit {metrics.payloadCapacityKg ? kg(metrics.payloadCapacityKg) : 'no launcher'}</p></section>
        <section className="panel p-4"><p className="kicker">Power balance</p><p className={`num mt-3 text-2xl ${metrics.powerBalanceW < 0 ? 'text-bad' : ''}`}>{signedWatts(metrics.powerBalanceW)}</p><p className="mt-1 text-xs text-faint">{watts(metrics.powerGeneratedW)} generated</p></section>
        <section className="panel p-4"><p className="kicker">Link margin</p><p className={`num mt-3 text-2xl ${metrics.physics.linkCapable ? '' : 'text-bad'}`}>{metrics.physics.linkMarginDb.toFixed(1)} dB</p><p className="mt-1 text-xs text-faint">{dataRate(metrics.physics.linkMaxBps)} available</p></section>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Constraint label="Payload mass" value={kg(metrics.payloadMassKg)} ok />
        <Constraint label="Fuel required" value={kg(metrics.physics.propellantRequiredKg)} detail={`Tanked ${kg(metrics.physics.propellantTankKg)} with reserve`} ok={metrics.physics.propellantTankKg + 1 >= metrics.physics.propellantRequiredKg} />
        <Constraint label="Launch" value={metrics.physics.launchCompatible ? 'Within throw weight' : 'Over throw weight'} detail={`${kg(metrics.physics.launchMassKg)} / ${metrics.payloadCapacityKg ? kg(metrics.physics.launchCapacityKg) : 'no launcher'}`} ok={metrics.physics.launchCompatible} />
        <Constraint label="Power" value={watts(metrics.physics.powerGeneratedW)} detail={`Cruise load ${watts(metrics.physics.powerConsumptionW)} · ${metrics.physics.solarFluxWm2.toFixed(0)} W/m²`} ok={metrics.powerBalanceW >= 0} />
        <Constraint label="Battery" value={`${Math.round(metrics.physics.batteryCapacityWh).toLocaleString('en-US')} Wh`} detail={`Eclipse needs ${Math.round(metrics.physics.batteryRequiredWh).toLocaleString('en-US')} Wh`} ok={metrics.physics.batterySufficient} />
        <Constraint label="Communications" value={metrics.physics.linkCapable ? 'Link closes' : 'Link does not close'} detail={`${dataRate(metrics.physics.linkRequiredBps)} required · ${metrics.physics.linkGround}`} ok={metrics.physics.linkCapable} />
        <Constraint label="Thermal" value={metrics.physics.thermalSafe ? 'Within limits' : 'Outside limits'} detail={`Hot ${metrics.physics.thermalHotC.toFixed(0)}°C · cold ${metrics.physics.thermalColdC.toFixed(0)}°C`} ok={metrics.physics.thermalSafe} />
        <Constraint label="Feasibility" value={metrics.ready ? 'Ready to fly' : 'Blocked'} detail="Errors stop the launch. Warnings still let you fly." ok={metrics.ready} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Chart title="Cost, million USD" data={costs} />
        <Chart title="Mass, kg" data={masses} />
        <Chart title="Power, watts" data={power} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="panel p-5">
          <p className="kicker">Engineering warnings</p>
          <div className="mt-4">
            <IssueList issues={metrics.issues} />
          </div>
        </section>
        <section className="panel p-5">
          <p className="kicker">Accounts</p>
          <SpecRow label="Hardware" value={usd(metrics.costs.components)} />
          <SpecRow label="Instruments" value={usd(metrics.costs.instruments)} />
          <SpecRow label="Launch" value={usd(metrics.costs.launch)} />
          <SpecRow label="Operations" value={usd(metrics.costs.operations)} />
          <SpecRow label="Fuel" value={kg(metrics.tankPropellantKg)} />
          <SpecRow label="Payload" value={kg(metrics.payloadMassKg)} />
          <SpecRow label="Battery" value={`${Math.round(metrics.batteryWh)} Wh`} />
          <SpecRow label="Flight temperature" value={`${Math.round(metrics.equilibriumTempC)} °C`} />
          <SpecRow label="Link index" value={percent(metrics.commsCapacity * 100)} />
          <div className="mt-4 flex flex-col gap-2 text-sm">
            <Link to="/app/spacecraft" className="text-accent">Edit spacecraft</Link>
            <Link to="/app/instruments" className="text-accent">Edit instruments</Link>
            <Link to="/app/launch" className="text-accent">Edit launcher</Link>
          </div>
          {errors.length > 0 ? <p className="mt-4 text-sm text-bad">{errors.length} check{errors.length === 1 ? '' : 's'} still blocking launch.</p> : <p className="mt-4 text-sm text-good">The design can launch.</p>}
        </section>
      </div>
    </div>
  )
}

function Constraint({ label, value, detail, ok }: { label: string; value: string; detail?: string; ok: boolean }) {
  return (
    <section className={`rounded-2xl border p-4 ${ok ? 'border-line' : 'border-bad/70'}`}>
      <p className="kicker">{label}</p>
      <p className={`num mt-2 text-lg ${ok ? 'text-ink' : 'text-bad'}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs text-faint">{detail}</p> : null}
    </section>
  )
}

function Chart({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <section className="panel p-4">
      <p className="kicker">{title}</p>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#73829a" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#73829a" fontSize={11} tickLine={false} axisLine={false} width={40} />
            <Tooltip {...tooltip} />
            <Bar dataKey="value" fill="#9fd0ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
