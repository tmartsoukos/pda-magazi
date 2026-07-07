import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { money, shopName, type DiningTable, type Order, type OrderItem } from '../types'

/**
 * Σελίδα εκτύπωσης δελτίου 80mm.
 * mode=new  → μόνο τα μη τυπωμένα είδη (δελτίο παραγγελίας)
 * mode=all  → όλα τα είδη με σύνολο (λογαριασμός)
 */
export default function PrintPage() {
  const { orderId } = useParams()
  const [params] = useSearchParams()
  const mode = params.get('mode') === 'all' ? 'all' : 'new'
  const navigate = useNavigate()

  const [order, setOrder] = useState<Order | null>(null)
  const [table, setTable] = useState<DiningTable | null>(null)
  const [items, setItems] = useState<OrderItem[] | null>(null)
  const printedOnce = useRef(false)

  useEffect(() => {
    async function load() {
      const { data: o } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId!)
        .single()
      if (!o) return
      setOrder(o)
      const [t, it] = await Promise.all([
        supabase.from('tables').select('*').eq('id', o.table_id).single(),
        mode === 'new'
          ? supabase
              .from('order_items')
              .select('*')
              .eq('order_id', orderId!)
              .eq('printed', false)
              .order('created_at')
          : supabase
              .from('order_items')
              .select('*')
              .eq('order_id', orderId!)
              .order('created_at'),
      ])
      setTable(t.data)
      setItems(it.data ?? [])
    }
    load()
  }, [orderId, mode])

  const doPrint = useCallback(async () => {
    window.print()
    // Μετά την εκτύπωση δελτίου, σήμανση ειδών ως τυπωμένα
    if (mode === 'new' && items && items.length > 0) {
      await supabase
        .from('order_items')
        .update({ printed: true })
        .in('id', items.map((i) => i.id))
    }
  }, [mode, items])

  // Αυτόματη εκτύπωση μόλις φορτωθούν τα δεδομένα
  useEffect(() => {
    if (items && items.length > 0 && !printedOnce.current) {
      printedOnce.current = true
      setTimeout(doPrint, 400)
    }
  }, [items, doPrint])

  if (!order || !items) return <div className="center-msg">Φόρτωση…</div>

  const total = items.reduce((s, it) => s + Number(it.unit_price) * it.qty, 0)

  return (
    <div className="print-page">
      <div className="ticket">
        <h1>{shopName()}</h1>
        <p className="ticket-sub">
          {mode === 'all' ? 'ΛΟΓΑΡΙΑΣΜΟΣ' : 'ΔΕΛΤΙΟ ΠΑΡΑΓΓΕΛΙΑΣ'}
        </p>
        <p className="ticket-sub">
          {table?.name} — {new Date().toLocaleString('el-GR')}
        </p>
        <hr />
        {items.length === 0 ? (
          <p>Κανένα νέο είδος για εκτύπωση.</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="ticket-row">
              <span>
                {it.qty}× {it.product_name}
                {it.notes && <em> ({it.notes})</em>}
              </span>
              <span>{money(Number(it.unit_price) * it.qty)}</span>
            </div>
          ))
        )}
        <hr />
        <div className="ticket-row ticket-total">
          <span>ΣΥΝΟΛΟ</span>
          <span>{money(mode === 'all' ? Number(order.total) : total)}</span>
        </div>
        <p className="ticket-sub">Δεν αποτελεί φορολογική απόδειξη</p>
      </div>
      <div className="print-actions no-print">
        <button className="action-btn primary" onClick={doPrint}>
          Εκτύπωση ξανά
        </button>
        <button className="action-btn" onClick={() => navigate(-1)}>
          ← Πίσω
        </button>
      </div>
    </div>
  )
}
