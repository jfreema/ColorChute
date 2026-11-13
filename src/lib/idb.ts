/** A tiny promise wrapper around one IndexedDB object store */
const DB_NAME = 'colorchute'
const STORE = 'designs'

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req.result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error ?? new Error('Storage was full or blocked'))
      }),
  )
}

export const idb = {
  get: <T>(id: string) => run<T | undefined>('readonly', (s) => s.get(id)),
  all: <T>() => run<T[]>('readonly', (s) => s.getAll()),
  put: <T>(value: T) => run('readwrite', (s) => s.put(value)),
  delete: (id: string) => run('readwrite', (s) => s.delete(id)),
}

/** Asks the browser not to clear saved designs when space runs low */
export function persistStorage() {
  navigator.storage?.persist?.().catch(() => {})
}
