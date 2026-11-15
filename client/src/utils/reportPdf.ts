import type { MissionConfig } from '../types'
import { kg, missionClock, percent, signedWatts, usd, watts } from './format'

export async function downloadMissionPdf(mission: MissionConfig) {
  const report = mission.report
  if (!report) return
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  let y = 56

  const write = (text: string, size = 11, color: [number, number, number] = [28, 36, 51], gap = 16) => {
    doc.setFont('times', size >= 16 ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, width - 96)
    for (const line of lines) {
      if (y > 760) {
        doc.addPage()
        y = 56
      }
      doc.text(line, 48, y)
      y += gap
    }
  }

  write('ORBITX', 22, [18, 42, 74], 22)
  write('Mission report', 16, [18, 42, 74], 18)
  write('Educational simulation. These figures are not flight-certified engineering products.', 10, [90, 100, 116], 20)
  write(`${mission.name} · ${report.outcome}`, 13, [18, 42, 74], 18)
  write(`Score ${report.score.total} / 100 · Success indicator ${report.successPct}% · ${report.failed ? 'Flight ended early' : 'Flight completed'}`)
  if (report.failureReason) write(report.failureReason)
  write(
    `Engineering ${report.score.engineering} · Science ${report.score.science} · Resources ${report.score.resources} · Reliability ${report.score.reliability} · Budget ${report.score.budget}`,
  )
  y += 6
  write('Score notes', 13, [18, 42, 74], 18)
  write(`Engineering. ${report.score.notes.engineering}`)
  write(`Science. ${report.score.notes.science}`)
  write(`Resources. ${report.score.notes.resources}`)
  write(`Reliability. ${report.score.notes.reliability}`)
  write(`Budget. ${report.score.notes.budget}`)
  y += 6
  write('Objectives', 13, [18, 42, 74], 18)
  for (const objective of report.objectives) {
    write(`${objective.name}: ${objective.status}. ${objective.note}`)
  }
  y += 6
  write('Resources at completion', 13, [18, 42, 74], 18)
  write(`Budget ${usd(report.totalBudgetUsd)}. Spent ${usd(report.budgetSpentUsd)}. Remaining ${usd(report.remainingBudgetUsd)}.`)
  write(`Health ${Math.round(report.health)}. Fuel remaining ${kg(report.fuelRemainingKg)} of ${kg(report.fuelCapacityKg)} (${percent(report.fuelEfficiency)} used).`)
  write(`Power generated ${watts(report.powerGeneratedW)}. Cruise load ${watts(report.powerConsumedW)}. Balance ${signedWatts(report.powerBalanceW)}.`)
  write(`Link index ${percent(report.commsCapacity * 100)}. Data collected ${report.dataCollected.toFixed(1)}. Data returned ${report.dataReturned.toFixed(1)}.`)
  write(`Final temperature ${report.temperatureC.toFixed(1)} °C. Simulated clock ${mission.flight ? missionClock(mission.flight.totalElapsedHours) : '—'}.`)
  y += 6
  write('Problems encountered', 13, [18, 42, 74], 18)
  for (const problem of report.problems) write(problem)
  y += 6
  write('Engineering decisions', 13, [18, 42, 74], 18)
  for (const decision of report.decisions) write(decision)
  if (report.events.length > 0) {
    y += 6
    write('Anomaly responses', 13, [18, 42, 74], 18)
    for (const event of report.events) write(`${event.title}: ${event.choice}. ${event.outcome}`)
  }
  y += 8
  write('ORBITX uses a documented educational model: the rocket equation for propellant, inverse-square sunlight, and a simplified link index. It is a game for the NASA Space Apps Challenge, not an operational mission design tool.', 10, [90, 100, 116], 14)

  doc.save(`${mission.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'orbitx'}-mission-report.pdf`)
}
