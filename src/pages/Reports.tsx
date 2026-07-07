import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { money } from '../types'

interface DayRow {
  day: string
  orders_count: number
  revenue: number
}

interface ProductRow {
  day: string
  product_name: string
  qty: number
  revenue: number
}

const today = () => {
  // Τοπική ημερομηνία (όχι UTC)
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Reports() {
  const [date, setDate] = useState(today())
  const [dayRow, setDayRow] = useState<DayRow | null>(null)
  const [productRows, setProductRows] = useState<ProductRow[]>([])

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([
      supabase.from('daily_report').select('*').eq('day', date).maybeSingle(),
      supabase
        .from('daily_products')
        .select('*')
        .eq('day', date)
        .order('qty', { ascending: false }),
    ])
    setDayRow(d.data ?? null)
    setProductRows(p.data ?? [])
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Αναφορές</h1>
      </header>
      <input
        type="date"
        className="date-input"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Τζίρος</span>
          <span className="stat-value">{money(dayRow?.revenue ?? 0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Παραγγελίες</span>
          <span className="stat-value">{dayRow?.orders_count ?? 0}</span>
        </div>
      </div>
      <section>
        <h2>Ανά προϊόν</h2>
        {productRows.length === 0 && <p className="hint">Καμία πώληση αυτή την ημέρα.</p>}
        {productRows.map((r) => (
          <div key={r.product_name} className="item-row">
            <span className="qty">{r.qty}×</span>
            <span className="name">{r.product_name}</span>
            <span>{money(r.revenue)}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
