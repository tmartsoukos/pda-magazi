import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Tables from './pages/Tables'
import OrderPage from './pages/Order'
import PrintPage from './pages/Print'
import Menu from './pages/Menu'
import Reports from './pages/Reports'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="center-msg">Φόρτωση…</div>
  if (!session) return <Login />

  const isPrint = location.pathname.startsWith('/print')
  // Μέσα σε τραπέζι το κάτω μενού κρύβεται — τη θέση του παίρνουν οι ενέργειες παραγγελίας
  const hideNav = isPrint || location.pathname.startsWith('/order')

  return (
    <div className="app">
      <main className={isPrint ? 'print-main' : ''}>
        <Routes>
          <Route path="/" element={<Tables />} />
          <Route path="/order/:tableId" element={<OrderPage />} />
          <Route path="/print/:orderId" element={<PrintPage />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideNav && (
        <nav className="bottom-nav no-print">
          <NavLink to="/" end>🍽️ Τραπέζια</NavLink>
          <NavLink to="/menu">📋 Μενού</NavLink>
          <NavLink to="/reports">📊 Αναφορές</NavLink>
        </nav>
      )}
    </div>
  )
}
