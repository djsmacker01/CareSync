/**
 * useOfflineSync — manages offline write queue and sync lifecycle.
 *
 * Usage:
 *   const { isOnline, pendingCount, syncStatus, enqueueWrite } = useOfflineSync()
 *
 * When the device goes offline, callers use enqueueWrite() to store a
 * pending API call. When back online, the hook automatically flushes the
 * queue using the current Supabase session token.
 *
 * Conflict handling:
 *   - 409 Conflict (duplicate MAR entry): item is removed from queue and
 *     counted as a "conflict" — data is not lost, server already has it.
 *   - Other 4xx errors: item stays in queue and surfaces in syncErrors.
 *   - Network failure during flush: queue is preserved, retried on next
 *     reconnect.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { enqueue, getAll, remove, count } from '../lib/offlineQueue'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export function useOfflineSync() {
  const { session }  = useAuth()
  const [isOnline,      setIsOnline]      = useState(navigator.onLine)
  const [pendingCount,  setPendingCount]  = useState(0)
  const [syncStatus,    setSyncStatus]    = useState('idle')  // 'idle' | 'syncing' | 'done' | 'error'
  const [syncErrors,    setSyncErrors]    = useState([])      // items that permanently failed
  const [conflicts,     setConflicts]     = useState(0)       // 409s resolved silently
  const isFlushing = useRef(false)

  // ── Poll pending count ────────────────────────────────────────
  async function refreshCount() {
    try {
      const n = await count()
      setPendingCount(n)
    } catch { /* IndexedDB not available (SSR / private mode) */ }
  }

  useEffect(() => {
    refreshCount()
  }, [])

  // ── Network status listeners ───────────────────────────────────
  useEffect(() => {
    function handleOnline()  { setIsOnline(true) }
    function handleOffline() { setIsOnline(false); setSyncStatus('idle') }
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // ── Auto-flush when back online ────────────────────────────────
  useEffect(() => {
    if (isOnline && session?.access_token) {
      flushQueue()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, session?.access_token])

  // ── Flush the queue ────────────────────────────────────────────
  const flushQueue = useCallback(async () => {
    if (isFlushing.current) return
    const items = await getAll()
    if (items.length === 0) return

    isFlushing.current = true
    setSyncStatus('syncing')
    setSyncErrors([])

    let newConflicts = 0
    const failed     = []

    for (const item of items) {
      try {
        const res = await fetch(`${BACKEND}${item.endpoint}`, {
          method:  item.method,
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(item.body),
        })

        if (res.ok || res.status === 409) {
          // 409 = duplicate (already recorded by another device) — remove from queue
          if (res.status === 409) newConflicts++
          await remove(item.id)
        } else {
          // Server-side error (403, 422, etc.) — keep in queue for manual review
          const json = await res.json().catch(() => ({}))
          failed.push({ ...item, serverError: json.error || `HTTP ${res.status}` })
        }
      } catch (networkErr) {
        // Network failure mid-flush — stop and retry on next reconnect
        failed.push({ ...item, serverError: 'Network error during sync' })
        break
      }
    }

    isFlushing.current = false
    await refreshCount()

    if (newConflicts > 0) setConflicts(c => c + newConflicts)

    if (failed.length > 0) {
      setSyncErrors(failed)
      setSyncStatus('error')
    } else {
      setSyncStatus('done')
      // Auto-clear the 'done' status after 3 s
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }, [session?.access_token])

  // ── Public: enqueue a write ────────────────────────────────────
  const enqueueWrite = useCallback(async ({ label, endpoint, method = 'POST', body }) => {
    await enqueue({ label, endpoint, method, body })
    setPendingCount(c => c + 1)
  }, [])

  return {
    isOnline,
    pendingCount,
    syncStatus,
    syncErrors,
    conflicts,
    enqueueWrite,
    flushQueue,
  }
}
