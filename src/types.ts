export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface Product {
  id: string
  category_id: string
  name: string
  price: number
  active: boolean
  sort_order: number
}

export interface DiningTable {
  id: string
  name: string
  sort_order: number
}

export interface Order {
  id: string
  table_id: string
  status: 'open' | 'closed' | 'cancelled'
  opened_at: string
  closed_at: string | null
  total: number
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  unit_price: number
  qty: number
  notes: string
  printed: boolean
  paid: boolean
  created_at: string
}

/** Στοιχείο καλαθιού πριν την αποστολή */
export interface CartItem {
  product: Product
  qty: number
  notes: string
}

export const money = (v: number | string) => `${Number(v).toFixed(2)} €`

export const shopName = () => localStorage.getItem('shopName') || 'ALLEGRA PIZZA // PASTA'
