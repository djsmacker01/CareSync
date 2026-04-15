/**
 * offlineQueue.js — IndexedDB-backed write queue for offline-first support.
 *
 * When a nurse records a MAR entry / CD entry while offline, the payload is
 * stored here. When the device reconnects, useOfflineSync flushes the queue
 * by replaying the requests with a fresh JWT from the active session.
 *
 * Queue item shape:
 *   { id, label, endpoint, method, body, queuedAt }
 *
 * id         — auto-increment key (IDBKeyRange)
 * label      — human-readable description shown in the SyncBanner
 * endpoint   — relative API path, e.g. '/api/mar/entry'
 * method     — HTTP method, e.g. 'POST'
 * body       — request body object (serialised to JSON on replay)
 * queuedAt   — ISO timestamp of when the item was queued
 */

const DB_NAME    = 'caresync-offline'
const STORE_NAME = 'queue'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }

    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}

/** Add an item to the queue. Returns the assigned id. */
export async function enqueue({ label, endpoint, method, body }) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.add({ label, endpoint, method, body, queuedAt: new Date().toISOString() })
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

/** Return all queued items in insertion order. */
export async function getAll() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror   = () => reject(req.error)
  })
}

/** Remove a single item by id. */
export async function remove(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

/** Return the number of items currently queued. */
export async function count() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

/** Clear the entire queue (use only after a successful full flush). */
export async function clearAll() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req   = store.clear()
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}
