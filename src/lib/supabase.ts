import { createClient } from '@supabase/supabase-js'

// Δημόσια στοιχεία σύνδεσης (το publishable key δεν είναι μυστικό —
// η ασφάλεια βασίζεται σε RLS και Auth)
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://kznyhsswcphtildmlqai.supabase.co'
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_Glk5rxa2gcJIBWNImmuFqA_kFkJ9GSW'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
