const DB_NAME = 'NM2-Shorts'
const STORE_NAME = 'shorts'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {string} title
 * @returns {Promise<string>} id
 */
export async function saveShort(blob, filename, title) {
  const db = await openDB()
  const id = `short-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const record = {
    id,
    filename: String(filename || 'analytics-short.webm').slice(0, 200),
    title: String(title || 'Analytics Short').slice(0, 200),
    createdAt: Date.now(),
    blob,
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(record)
    req.onsuccess = () => resolve(id)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * @returns {Promise<Array<{ id: string, filename: string, title: string, createdAt: number }>>}
 */
export async function listShorts() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => {
      const rows = (req.result || []).map(({ id, filename, title, createdAt }) => ({
        id,
        filename,
        title,
        createdAt,
      }))
      rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      resolve(rows)
    }
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * @param {string} id
 * @returns {Promise<{ id: string, filename: string, title: string, createdAt: number, blob: Blob } | null>}
 */
export async function getShort(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * @param {string} id
 */
export async function deleteShort(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}
