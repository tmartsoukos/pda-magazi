import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useRealtime } from '../lib/useRealtime'
import {
  money,
  type CartItem,
  type Category,
  type DiningTable,
  type Order,
  type OrderItem,
  type Product,
} from '../types'

export default function OrderPage() {
  const { tableId } = useParams()
  const navigate = useNavigate()

  const [table, setTable] = useState<DiningTable | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeCat, setActiveCat] = useState<string>('')
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [t, c, p, o] = await Promise.all([
      supabase.from('tables').select('*').eq('id', tableId!).single(),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('active', true).order('sort_order'),
      supabase
        .from('orders')
        .select('*')
        .eq('table_id', tableId!)
        .eq('status', 'open')
        .maybeSingle(),
    ])
    if (t.data) setTable(t.data)
    if (c.data) {
      setCategories(c.data)
      setActiveCat((prev) => prev || c.data[0]?.id || '')
    }
    if (p.data) setProducts(p.data)
    setOrder(o.data ?? null)
    if (o.data) {
      const it = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', o.data.id)
        .order('created_at')
      setItems(it.data ?? [])
    } else {
      setItems([])
    }
  }, [tableId])

  useEffect(() => {
    load()
  }, [load])
  useRealtime(['orders', 'order_items'], load)

  const cartTotal = useMemo(
    () => cart.reduce((s, ci) => s + ci.product.price * ci.qty, 0),
    [cart],
  )
  const unpaidItems = useMemo(() => items.filter((it) => !it.paid), [items])
  const paidItems = useMemo(() => items.filter((it) => it.paid), [items])
  // Υπόλοιπο προς πληρωμή = μόνο τα απλήρωτα είδη
  const dueTotal = useMemo(
    () => unpaidItems.reduce((s, it) => s + Number(it.unit_price) * it.qty, 0),
    [unpaidItems],
  )

  function addToCart(p: Product) {
    setCart((prev) => {
      const same = prev.find((ci) => ci.product.id === p.id && ci.notes === '')
      if (same)
        return prev.map((ci) => (ci === same ? { ...ci, qty: ci.qty + 1 } : ci))
      return [...prev, { product: p, qty: 1, notes: '' }]
    })
  }

  function changeQty(index: number, delta: number) {
    setCart((prev) =>
      prev
        .map((ci, i) => (i === index ? { ...ci, qty: ci.qty + delta } : ci))
        .filter((ci) => ci.qty > 0),
    )
  }

  function changeNotes(index: number, notes: string) {
    setCart((prev) => prev.map((ci, i) => (i === index ? { ...ci, notes } : ci)))
  }

  /** Αποστολή καλαθιού: δημιουργεί παραγγελία αν δεν υπάρχει, εισάγει είδη */
  async function send(printAfter: boolean) {
    if (cart.length === 0 || busy) return
    setBusy(true)
    try {
      let orderId = order?.id
      if (!orderId) {
        const { data, error } = await supabase
          .from('orders')
          .insert({ table_id: tableId })
          .select()
          .single()
        if (error) throw error
        orderId = data.id
      }
      const { error } = await supabase.from('order_items').insert(
        cart.map((ci) => ({
          order_id: orderId,
          product_id: ci.product.id,
          product_name: ci.product.name,
          unit_price: ci.product.price,
          qty: ci.qty,
          notes: ci.notes,
        })),
      )
      if (error) throw error
      setCart([])
      if (printAfter) navigate(`/print/${orderId}?mode=new`)
      else await load()
    } catch {
      alert('Σφάλμα αποστολής — δοκίμασε ξανά')
    } finally {
      setBusy(false)
    }
  }

  /** Πληρωμή μίας μονάδας: γραμμή με qty>1 σπάει, αλλιώς μαρκάρεται όλη */
  async function payOne(it: OrderItem) {
    if (it.qty > 1) {
      await supabase.from('order_items').update({ qty: it.qty - 1 }).eq('id', it.id)
      await supabase.from('order_items').insert({
        order_id: it.order_id,
        product_id: it.product_id,
        product_name: it.product_name,
        unit_price: it.unit_price,
        qty: 1,
        notes: it.notes,
        printed: it.printed,
        paid: true,
      })
    } else {
      await supabase.from('order_items').update({ paid: true }).eq('id', it.id)
    }
    await load()
  }

  /** Αναίρεση πληρωμής είδους */
  async function unpay(it: OrderItem) {
    await supabase.from('order_items').update({ paid: false }).eq('id', it.id)
    await load()
  }

  async function deleteItem(it: OrderItem) {
    if (!confirm(`Διαγραφή «${it.product_name}» από την παραγγελία;`)) return
    await supabase.from('order_items').delete().eq('id', it.id)
    await load()
  }

  async function closeOrder() {
    if (!order) return
    if (!confirm(`Κλείσιμο τραπεζιού — υπόλοιπο ${money(dueTotal)};`)) return
    await supabase
      .from('orders')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', order.id)
    navigate('/')
  }

  async function cancelOrder() {
    if (!order) return
    if (!confirm('Ακύρωση όλης της παραγγελίας;')) return
    await supabase
      .from('orders')
      .update({ status: 'cancelled', closed_at: new Date().toISOString() })
      .eq('id', order.id)
    navigate('/')
  }

  const catProducts = products.filter((p) => p.category_id === activeCat)

  return (
    <div className="page order-page">
      <header className="page-head">
        <button className="link-btn" onClick={() => navigate('/')}>
          ← Πίσω
        </button>
        <h1>{table?.name ?? ''}</h1>
        {order && (
          <button className="link-btn danger" onClick={cancelOrder}>
            Ακύρωση
          </button>
        )}
      </header>

      <div className="cat-bar">
        {categories.map((c) => (
          <button
            key={c.id}
            className={`cat-chip ${c.id === activeCat ? 'active' : ''}`}
            onClick={() => setActiveCat(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {catProducts.map((p) => (
          <button key={p.id} className="product-btn" onClick={() => addToCart(p)}>
            <span>{p.name}</span>
            <span className="price">{money(p.price)}</span>
          </button>
        ))}
      </div>

      {unpaidItems.length > 0 && (
        <section className="sent-items">
          <h2>Σταλμένα — υπόλοιπο {money(dueTotal)}</h2>
          {unpaidItems.map((it) => (
            <div key={it.id} className="item-row">
              <span className="qty">{it.qty}×</span>
              <span className="name">
                {it.product_name}
                {it.notes && <em> — {it.notes}</em>}
              </span>
              <span>{money(Number(it.unit_price) * it.qty)}</span>
              <button className="pay-btn" onClick={() => payOne(it)}>
                Πληρωμή
              </button>
              <button className="link-btn danger" onClick={() => deleteItem(it)}>
                ✕
              </button>
            </div>
          ))}
        </section>
      )}

      {paidItems.length > 0 && (
        <section className="paid-items">
          <h2>
            Πληρωμένα (
            {money(paidItems.reduce((s, it) => s + Number(it.unit_price) * it.qty, 0))})
          </h2>
          {paidItems.map((it) => (
            <div key={it.id} className="item-row paid">
              <span className="qty">{it.qty}×</span>
              <span className="name">
                {it.product_name}
                {it.notes && <em> — {it.notes}</em>}
              </span>
              <span>{money(Number(it.unit_price) * it.qty)}</span>
              <button className="link-btn" onClick={() => unpay(it)}>
                ↩
              </button>
            </div>
          ))}
        </section>
      )}

      {cart.length > 0 && (
        <section className="cart">
          <h2>Νέα είδη ({money(cartTotal)})</h2>
          {cart.map((ci, i) => (
            <div key={i} className="item-row">
              <button className="qty-btn" onClick={() => changeQty(i, -1)}>
                −
              </button>
              <span className="qty">{ci.qty}</span>
              <button className="qty-btn" onClick={() => changeQty(i, 1)}>
                +
              </button>
              <span className="name">{ci.product.name}</span>
              <input
                className="notes-input"
                placeholder="σημείωση"
                value={ci.notes}
                onChange={(e) => changeNotes(i, e.target.value)}
              />
              <span>{money(ci.product.price * ci.qty)}</span>
            </div>
          ))}
        </section>
      )}

      <footer className="order-actions no-print">
        <button
          className="action-btn primary"
          disabled={cart.length === 0 || busy}
          onClick={() => send(true)}
        >
          Αποστολή + Εκτύπωση
        </button>
        <button
          className="action-btn"
          disabled={cart.length === 0 || busy}
          onClick={() => send(false)}
        >
          Αποστολή
        </button>
        {order && (
          <>
            <button
              className="action-btn"
              onClick={() => navigate(`/print/${order.id}?mode=all`)}
            >
              Λογαριασμός
            </button>
            <button className="action-btn success" onClick={closeOrder}>
              Κλείσιμο {money(dueTotal)}
            </button>
          </>
        )}
      </footer>
    </div>
  )
}
