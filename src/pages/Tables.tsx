import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import { money, type DiningTable, type Order } from '../types'

export default function Tables() {
  const [tables, setTables] = useState<DiningTable[]>([])
  const [openOrders, setOpenOrders] = useState<Map<string, Order>>(new Map())
  const navigate = useNavigate()

  const load = useCallback(async () => {
    const [t, o] = await Promise.all([
      supabase.from('tables').select('*').order('sort_order'),
      supabase.from('orders').select('*').eq('status', 'open'),
    ])
    if (t.data) setTables(t.data)
    if (o.data) setOpenOrders(new Map(o.data.map((ord: Order) => [ord.table_id, ord])))
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtime(['tables', 'orders', 'order_items'], load)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Τραπέζια</h1>
        <button className="link-btn" onClick={() => supabase.auth.signOut()}>
          Έξοδος
        </button>
      </header>
      <div className="table-grid">
        {tables.map((t) => {
          const order = openOrders.get(t.id)
          return (
            <button
              key={t.id}
              className={`table-tile ${order ? 'busy' : 'free'}`}
              onClick={() => navigate(`/order/${t.id}`)}
            >
              <span className="table-name">{t.name}</span>
              <span className="table-total">
                {order ? money(order.total) : 'Ελεύθερο'}
              </span>
            </button>
          )
        })}
      </div>
      {tables.length === 0 && (
        <p className="center-msg">Δεν υπάρχουν τραπέζια — πρόσθεσε από το Μενού.</p>
      )}
    </div>
  )
}
