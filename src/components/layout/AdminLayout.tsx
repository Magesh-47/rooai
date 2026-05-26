import { Outlet, Navigate } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'
import { useAuth } from '../../contexts/AuthContext'

export function AdminLayout() {
  const { profile, loading } = useAuth()

  if (loading) return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div className="spinner" style={{ width: 14, height: 14 }} />
    </div>
  )

  if (!profile) return <Navigate to="/login" replace />
  if (profile.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <AdminSidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  )
}
