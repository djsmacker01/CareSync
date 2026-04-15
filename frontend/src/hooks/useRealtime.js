import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Subscribes to Postgres changes on the given tables and calls onChanged
 * whenever any event fires (debounced to avoid rapid-fire re-fetches).
 *
 * @param {Array<{ table: string, event?: string }>} subscriptions
 *   e.g. [{ table: 'mar_entries', event: 'INSERT' }, { table: 'visitors' }]
 *   event defaults to '*' (INSERT | UPDATE | DELETE)
 *
 * @param {Function} onChanged  called after the debounce window closes
 * @param {number}   [debounceMs=500]
 *
 * @returns {'connecting' | 'live' | 'error'}  current realtime status
 */
export function useRealtime(subscriptions, onChanged, debounceMs = 500) {
  const [status, setStatus] = useState('connecting')

  // Keep a stable reference to the callback so the effect never re-runs
  // just because the parent passed a new function reference.
  const onChangedRef = useRef(onChanged)
  onChangedRef.current = onChanged

  const timerRef = useRef(null)

  useEffect(() => {
    if (!subscriptions?.length) return

    // Unique channel name per set of tables
    const channelName = `rt-${subscriptions.map(s => s.table).join('-')}`

    let channel = supabase.channel(channelName)

    for (const { table, event = '*' } of subscriptions) {
      channel = channel.on(
        'postgres_changes',
        { event, schema: 'public', table },
        () => {
          // Debounce: reset the timer on every incoming event so we only
          // re-fetch once after a burst of rapid changes (e.g. bulk MAR round).
          clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => onChangedRef.current(), debounceMs)
        },
      )
    }

    channel.subscribe(s => {
      if (s === 'SUBSCRIBED')                          setStatus('live')
      else if (s === 'TIMED_OUT' || s === 'CHANNEL_ERROR') setStatus('error')
      else                                             setStatus('connecting')
    })

    return () => {
      clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
      setStatus('connecting')
    }
    // Intentionally omitting subscriptions from deps – they are stable arrays
    // defined at the module level in each page file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounceMs])

  return status
}
