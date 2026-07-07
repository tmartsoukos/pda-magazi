import { useEffect } from 'react'
import { supabase } from './supabase'

/**
 * Συνδρομή σε αλλαγές πινάκων μέσω Supabase Realtime.
 * Σε κάθε αλλαγή καλείται το onChange (για επαναφόρτωση δεδομένων).
 */
export function useRealtime(tables: string[], onChange: () => void) {
  useEffect(() => {
    const channel = supabase.channel('rt-' + tables.join('-'))
    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        onChange,
      )
    }
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
