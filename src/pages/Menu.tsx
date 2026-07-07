import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { type Category, type DiningTable, type Product } from '../types'

type Tab = 'products' | 'categories' | 'tables' | 'settings'

export default function Menu() {
  const [tab, setTab] = useState<Tab>('products')
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<DiningTable[]>([])

  const load = useCallback(async () => {
    const [c, p, t] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').order('sort_order'),
      supabase.from('tables').select('*').order('sort_order'),
    ])
    if (c.data) setCategories(c.data)
    if (p.data) setProducts(p.data)
    if (t.data) setTables(t.data)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="page">
      <header className="page-head">
        <h1>Διαχείριση</h1>
      </header>
      <div className="cat-bar">
        {(
          [
            ['products', 'Προϊόντα'],
            ['categories', 'Κατηγορίες'],
            ['tables', 'Τραπέζια'],
            ['settings', 'Ρυθμίσεις'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`cat-chip ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'products' && (
        <ProductsTab categories={categories} products={products} reload={load} />
      )}
      {tab === 'categories' && <CategoriesTab categories={categories} reload={load} />}
      {tab === 'tables' && <TablesTab tables={tables} reload={load} />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}

function ProductsTab({
  categories,
  products,
  reload,
}: {
  categories: Category[]
  products: Product[]
  reload: () => void
}) {
  const [filterCat, setFilterCat] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [catId, setCatId] = useState('')

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const category_id = catId || filterCat || categories[0]?.id
    if (!category_id || !name || !price) return
    await supabase.from('products').insert({
      category_id,
      name,
      price: Number(price),
      sort_order: products.length + 1,
    })
    setName('')
    setPrice('')
    reload()
  }

  async function update(p: Product, patch: Partial<Product>) {
    await supabase.from('products').update(patch).eq('id', p.id)
    reload()
  }

  async function remove(p: Product) {
    if (!confirm(`Διαγραφή «${p.name}»;`)) return
    await supabase.from('products').delete().eq('id', p.id)
    reload()
  }

  const shown = filterCat ? products.filter((p) => p.category_id === filterCat) : products

  return (
    <div className="admin-list">
      <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
        <option value="">Όλες οι κατηγορίες</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {shown.map((p) => (
        <div key={p.id} className="admin-row">
          <input
            defaultValue={p.name}
            onBlur={(e) => e.target.value !== p.name && update(p, { name: e.target.value })}
          />
          <input
            className="price-input"
            type="number"
            step="0.10"
            min="0"
            defaultValue={Number(p.price).toFixed(2)}
            onBlur={(e) =>
              Number(e.target.value) !== Number(p.price) &&
              update(p, { price: Number(e.target.value) })
            }
          />
          <label className="check">
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) => update(p, { active: e.target.checked })}
            />
            ενεργό
          </label>
          <button className="link-btn danger" onClick={() => remove(p)}>
            ✕
          </button>
        </div>
      ))}
      <form className="admin-row add-row" onSubmit={add}>
        <select value={catId} onChange={(e) => setCatId(e.target.value)}>
          <option value="">— κατηγορία —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Νέο προϊόν"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="price-input"
          type="number"
          step="0.10"
          min="0"
          placeholder="Τιμή"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button className="action-btn primary" type="submit">
          +
        </button>
      </form>
    </div>
  )
}

function CategoriesTab({
  categories,
  reload,
}: {
  categories: Category[]
  reload: () => void
}) {
  const [name, setName] = useState('')

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    await supabase
      .from('categories')
      .insert({ name, sort_order: categories.length + 1 })
    setName('')
    reload()
  }

  async function rename(c: Category, newName: string) {
    if (newName === c.name) return
    await supabase.from('categories').update({ name: newName }).eq('id', c.id)
    reload()
  }

  async function remove(c: Category) {
    if (!confirm(`Διαγραφή κατηγορίας «${c.name}» και όλων των προϊόντων της;`)) return
    await supabase.from('categories').delete().eq('id', c.id)
    reload()
  }

  return (
    <div className="admin-list">
      {categories.map((c) => (
        <div key={c.id} className="admin-row">
          <input defaultValue={c.name} onBlur={(e) => rename(c, e.target.value)} />
          <button className="link-btn danger" onClick={() => remove(c)}>
            ✕
          </button>
        </div>
      ))}
      <form className="admin-row add-row" onSubmit={add}>
        <input
          placeholder="Νέα κατηγορία"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="action-btn primary" type="submit">
          +
        </button>
      </form>
    </div>
  )
}

function TablesTab({ tables, reload }: { tables: DiningTable[]; reload: () => void }) {
  const [name, setName] = useState('')

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return
    await supabase.from('tables').insert({ name, sort_order: tables.length + 1 })
    setName('')
    reload()
  }

  async function rename(t: DiningTable, newName: string) {
    if (newName === t.name) return
    await supabase.from('tables').update({ name: newName }).eq('id', t.id)
    reload()
  }

  async function remove(t: DiningTable) {
    if (!confirm(`Διαγραφή «${t.name}» και του ιστορικού παραγγελιών του;`)) return
    await supabase.from('tables').delete().eq('id', t.id)
    reload()
  }

  return (
    <div className="admin-list">
      {tables.map((t) => (
        <div key={t.id} className="admin-row">
          <input defaultValue={t.name} onBlur={(e) => rename(t, e.target.value)} />
          <button className="link-btn danger" onClick={() => remove(t)}>
            ✕
          </button>
        </div>
      ))}
      <form className="admin-row add-row" onSubmit={add}>
        <input
          placeholder="Νέο τραπέζι"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="action-btn primary" type="submit">
          +
        </button>
      </form>
    </div>
  )
}

function SettingsTab() {
  const [name, setName] = useState(localStorage.getItem('shopName') ?? '')

  return (
    <div className="admin-list">
      <label className="settings-label">
        Όνομα μαγαζιού (τυπώνεται στα δελτία)
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            localStorage.setItem('shopName', e.target.value)
          }}
          placeholder="Το Μαγαζί"
        />
      </label>
      <p className="hint">
        Αποθηκεύεται τοπικά σε κάθε συσκευή. Ο κωδικός σύνδεσης αλλάζει από το
        Supabase dashboard.
      </p>
    </div>
  )
}
