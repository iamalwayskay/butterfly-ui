import { useEffect } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { appEntryPath, appPath, appUrl, isAppHost, isLocalHost, isPreviewHost, resolveAppLocation } from "@/lib/app-location"
import { useFixtureAuth } from "@/lib/fixture-auth"
import { StatePanel } from "@/design-system/components"
import { AppShell } from "@/components/app-shell"
import { Lander } from "@/pages/lander"
import { Login } from "@/pages/login"
import { AddAds } from "@/pages/add-ads"
import { CreateAds } from "@/pages/create-ads"
import { MyAds } from "@/pages/my-ads"
import { AdDetail } from "@/pages/ad-detail"
import { WorkQueue } from "@/pages/work-queue"
import { CreativeCanvas } from "@/pages/creative-canvas"
import { Team } from "@/pages/team"
import { SettingsPage } from "@/pages/settings"
import { JevAnalysisDemo } from "@/design-system/catalogue/jev-analysis-demo"
import { DesignSystemPage } from "@/design-system/catalogue/design-system-page"

export default function App({ authenticated }: { authenticated?: boolean }) {
  const fixtureAuthenticated = useFixtureAuth()
  const location = useLocation()
  const hostname = window.location.hostname
  const resolved = resolveAppLocation(hostname, location.pathname, location.search, location.hash)
  if (resolved.redirectTo) return <Navigate to={resolved.redirectTo} replace />
  const appHost = isAppHost(hostname)
  const local = isLocalHost(hostname)
  const preview = isPreviewHost(hostname)
  return (
    <Routes>
      <Route path="/" element={appHost ? authenticated === undefined && fixtureAuthenticated === null ? <StatePanel tone="loading" title="Checking your saved session" description="Restoring this browser's local preview session. No authentication service is contacted." /> : <Navigate to={appEntryPath(authenticated ?? fixtureAuthenticated ?? false)} replace /> : <Lander />} />
      <Route path="/login" element={appHost || local ? <Login /> : <AppHostRedirect path="/login" />} />
      {preview ? <Route path="/app/login" element={<Login />} /> : null}
      {appHost || local || preview ? <>
        {/* Local aliases remain /app/demo/jev-analysis and /app/demo/design-system. */}
        <Route path={`${resolved.basePath}/demo/jev-analysis`} element={<JevAnalysisDemo />} />
        <Route path={`${resolved.basePath}/demo/design-system`} element={<DesignSystemPage />} />
        <Route path={`${resolved.basePath}/*`} element={<FixtureWorkspace authenticated={appHost ? authenticated ?? fixtureAuthenticated : true} />} />
      </> : <Route path="/app/*" element={<AppHostRedirect path={`${location.pathname}${location.search}${location.hash}`} />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function FixtureWorkspace({ authenticated }: { authenticated: boolean | null }) {
  if (authenticated === null) return <StatePanel tone="loading" title="Checking your saved session" description="Restoring this browser's local preview session. No authentication service is contacted." />
  if (!authenticated) return <Navigate to={appPath("/login")} replace />
  return <AppShell><WorkspaceRoutes /></AppShell>
}

function WorkspaceRoutes() {
  return <Routes>
    <Route index element={<Navigate to={appPath("/ads")} replace />} />
    <Route path="add" element={<AddAds />} />
    <Route path="create" element={<CreateAds />} />
    <Route path="ads" element={<MyAds />} />
    <Route path="ads/:id" element={<AdDetail />} />
    <Route path="work" element={<WorkQueue />} />
    <Route path="canvas" element={<CreativeCanvas />} />
    <Route path="fix" element={<LegacyRoute path="/work" view="review" />} />
    <Route path="changed" element={<LegacyRoute path="/work" view="drafts" />} />
    <Route path="clusters" element={<LegacyRoute path="/ads" view="groups" />} />
    <Route path="team" element={<Team />} />
    <Route path="settings" element={<SettingsPage />} />
    <Route path="*" element={<Navigate to={appPath("/ads")} replace />} />
  </Routes>
}

function LegacyRoute({ path, view }: { path: string; view: string }) {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set("view", view)
  return <Navigate to={{ pathname: appPath(path), search: `?${params}`, hash: location.hash }} replace />
}

function AppHostRedirect({ path }: { path: string }) {
  const destination = appUrl(path)
  useEffect(() => { window.location.replace(destination) }, [destination])
  return <a href={destination}>Continue to Butterfly</a>
}
