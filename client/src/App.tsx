import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { AchievementsPage } from './pages/AchievementsPage'
import { ArchivePage } from './pages/ArchivePage'
import { EngineerGamePage } from './pages/EngineerGamePage'
import { GamesPage } from './pages/GamesPage'
import { EventsPage } from './pages/EventsPage'
import { InstrumentsPage } from './pages/InstrumentsPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { ExplorePage } from './pages/ExplorePage'
import { LandingPage } from './pages/LandingPage'
import { PlanetPage } from './pages/PlanetPage'
import { LaunchPage } from './pages/LaunchPage'
import { MethodologyPage } from './pages/MethodologyPage'
import { NasaPage } from './pages/NasaPage'
import { OrbitMasterPage } from './pages/OrbitMasterPage'
import { MissionSelectPage } from './pages/MissionSelectPage'
import { ObjectivesPage } from './pages/ObjectivesPage'
import { OverviewPage } from './pages/OverviewPage'
import { ReportPage } from './pages/ReportPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { SimulationPage } from './pages/SimulationPage'
import { SurvivalGamePage } from './pages/SurvivalGamePage'
import { SpacecraftPage } from './pages/SpacecraftPage'
import { TelemetryPage } from './pages/TelemetryPage'
import { CommandChrome } from './components/CommandChrome'
import { useMissionStore } from './store/missionStore'

export default function App() {
  const hydrated = useMissionStore((state) => state.hydrated)
  const syncFromServer = useMissionStore((state) => state.syncFromServer)

  useEffect(() => {
    if (!hydrated) return
    void syncFromServer()
  }, [hydrated, syncFromServer])

  if (!hydrated) {
    return <div className="grid min-h-screen place-items-center bg-space-950 font-display tracking-[0.22em] text-ink">ORBITX</div>
  }

  return (
    <CommandChrome>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/explore/:bodyId" element={<PlanetPage />} />
      <Route path="/analysis" element={<AnalysisPage />} />
      <Route path="/methodology" element={<MethodologyPage />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<OverviewPage />} />
        <Route path="missions" element={<MissionSelectPage />} />
        <Route path="objectives" element={<ObjectivesPage />} />
        <Route path="spacecraft" element={<SpacecraftPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="games/orbit" element={<OrbitMasterPage />} />
        <Route path="games/engineer" element={<EngineerGamePage />} />
        <Route path="games/survival" element={<SurvivalGamePage />} />
        <Route path="nasa" element={<NasaPage />} />
        <Route path="instruments" element={<InstrumentsPage />} />
        <Route path="launch" element={<LaunchPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="simulation" element={<SimulationPage />} />
        <Route path="telemetry" element={<TelemetryPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="methodology" element={<MethodologyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </CommandChrome>
  )
}
