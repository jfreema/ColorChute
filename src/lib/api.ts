/** Calls to ColorChute's own Worker API, with its error messages passed through */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { credentials: 'same-origin', ...init })
  } catch {
    throw new ApiError(0, "Couldn't reach ColorChute. Check your connection and try again.")
  }
  const isJson = res.headers.get('Content-Type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `The server had a problem (${res.status}). Please try again.`)
  // Anything but JSON means the API isn't there, like the dev server without the Worker
  if (!isJson) throw new ApiError(0, "Couldn't reach ColorChute's server.")
  return data as T
}

export const sendJson = <T = unknown>(path: string, body: unknown, method = 'POST') =>
  api<T>(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

/** Runs `fn` on every item, at most `limit` at a time */
export async function eachLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0
  const worker = async () => {
    while (next < items.length) await fn(items[next++])
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}
