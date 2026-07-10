import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

import { Layout }      from './components/layout/Layout'

import { Login }       from './pages/Login'
import { Dashboard }   from './pages/Dashboard'
import { History }     from './pages/History'
import { MeetingDetail } from './pages/MeetingDetail'
import { Record }      from './pages/Record'
import { Upload }      from './pages/Upload'
import { Query }       from './pages/Query'
import { Settings }    from './pages/Settings'

import { Users }        from './pages/admin/Users'
import { Integrations } from './pages/admin/Integrations'

// ── Auth guards ───────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div className="spinner" style={{ width: 14, height: 14 }} />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile?.role !== 'admin') return <Navigate to="/meetings" replace />
  return <>{children}</>
}

function RootRedirect() {
  const { loading } = useAuth()
  if (loading) return null
  return <Navigate to="/meetings" replace />
}

// ── Router ────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Root redirect */}
      <Route path="/" element={<RequireAuth><RootRedirect /></RequireAuth>} />

      {/* All authenticated routes share the same Layout */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/meetings"      element={<Dashboard />} />
        <Route path="/meetings/:id"  element={<MeetingDetail />} />
        <Route path="/history"       element={<History />} />
        <Route path="/record"        element={<Record />} />
        <Route path="/upload"        element={<Upload />} />
        <Route path="/query"         element={<Query />} />
        <Route path="/settings"      element={<Settings />} />

        {/* Admin-only */}
        <Route path="/admin/users"         element={<RequireAdmin><Users /></RequireAdmin>} />
        <Route path="/admin/integrations"  element={<RequireAdmin><Integrations /></RequireAdmin>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
