import { useLocation } from 'react-router-dom'
import { MISSIONS } from '../data/catalog'
import { MODEL_NOTES } from '../engine/calculations'
import { BUS_POWER_W, DIFFICULTY, G0, SCORE_WEIGHTS } from '../engine/constants'
import { PageHeader } from '../components/ui'

export function MethodologyPage() {
  const inApp = useLocation().pathname.startsWith('/app')
  const body = (
    <div className={inApp ? '' : 'mx-auto max-w-3xl px-5 py-10 md:px-0'}>
      <PageHeader
        kicker="Methodology"
        title="What the simulation is willing to claim."
        description="ORBITX is an educational model for the NASA Space Apps Challenge. Design choices change the flight. The score still uses the educational link index and cruise-temperature rule. The engineering panel adds a rocket-equation propellant load, inverse-square solar power, an eclipse battery check, a link budget, and a single-node thermal balance."
      />
      <div className="space-y-8 text-sm leading-relaxed text-mute">
        <section>
          <h2 className="font-display text-2xl text-ink">Mass</h2>
          <p className="mt-2">{MODEL_NOTES.mass}</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Propellant</h2>
          <p className="mt-2">{MODEL_NOTES.propellant}</p>
          <p className="mt-2">g0 is {G0} m/s². Reserve factors are Beginner ×{DIFFICULTY.beginner.propellant}, Intermediate ×{DIFFICULTY.intermediate.propellant}, Expert ×{DIFFICULTY.expert.propellant}. The larger beginner tank is heavier, and it is what lets a beginner survive a propellant leak that strands an expert.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Power</h2>
          <p className="mt-2">{MODEL_NOTES.power}</p>
          <p className="mt-2">The bus load is fixed at {BUS_POWER_W} W. A design that cannot feed the bus, or an electric thruster that cannot be powered at the destination, cannot launch.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Communications</h2>
          <p className="mt-2">{MODEL_NOTES.link}</p>
          <p className="mt-2">Returned science is the collected science times that index, after anomaly adjustments. A return under 10 science units fails the transmission phase.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Thermal and radiation</h2>
          <p className="mt-2">{MODEL_NOTES.thermal}</p>
          <p className="mt-2">Health lost during cruise grows with temperature above 50°C and with radiation the structure does not cover. Expert difficulty refuses to launch when thermal protection or shielding is below the destination.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Budget and score</h2>
          <p className="mt-2">{MODEL_NOTES.budget}</p>
          <p className="mt-2">{MODEL_NOTES.score}</p>
          <p className="mt-2">
            Budget multipliers are Beginner ×{DIFFICULTY.beginner.budget}, Intermediate ×{DIFFICULTY.intermediate.budget}, Expert ×{DIFFICULTY.expert.budget}. Anomaly counts are {DIFFICULTY.beginner.events}, {DIFFICULTY.intermediate.events}, and {DIFFICULTY.expert.events}. Displayed weights: engineering {SCORE_WEIGHTS.engineering}, science {SCORE_WEIGHTS.science}, resources {SCORE_WEIGHTS.resources}, reliability {SCORE_WEIGHTS.reliability}, budget {SCORE_WEIGHTS.budget}.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Time and randomness</h2>
          <p className="mt-2">A 1× flight is compressed into about 90 seconds of real time. The day counter is simulated mission time. Which anomalies appear is chosen with a seeded generator when you press Start, so the same seed and the same decisions replay the same flight. The small ripple on temperature and signal is display noise. It does not change the score.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Destination assumptions</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-faint">
                <tr>
                  <th className="py-2 font-medium">Mission</th>
                  <th className="py-2 font-medium">Δv</th>
                  <th className="py-2 font-medium">Sun AU</th>
                  <th className="py-2 font-medium">Thermal</th>
                  <th className="py-2 font-medium">Radiation</th>
                  <th className="py-2 font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {MISSIONS.map((mission) => (
                  <tr key={mission.id} className="border-t border-line text-ink">
                    <td className="py-2">{mission.name}</td>
                    <td className="num py-2">{mission.deltaV.toLocaleString('en-US')} m/s</td>
                    <td className="num py-2">{mission.distanceAu}</td>
                    <td className="num py-2">{mission.thermalStress}</td>
                    <td className="num py-2">{mission.radiation}</td>
                    <td className="num py-2">{mission.durationDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">Delta-v is a simplified mission total from an assumed parking orbit, not a patched-conic design. Distances are representative, not a specific launch window. Altitude and velocity on the telemetry page are scripted profiles for the educational display.</p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-ink">Units</h2>
          <p className="mt-2">Mass in kilograms. Power in watts. Budget in US dollars. Fuel in kilograms. Distance in kilometers. Temperature in degrees Celsius. Time in hours and days.</p>
        </section>
      </div>
    </div>
  )
  return body
}
