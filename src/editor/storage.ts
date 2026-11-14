import { api, ApiError, eachLimit, sendJson } from '../lib/api'
import { idb, persistStorage } from '../lib/idb'
import type { ColorOption, Design } from './designs'

/**
 * Where saved designs live. Approved accounts save to the server, so designs follow them to any computer. Public
 * designs, the ones an admin marked "Available to public", are read only and anyone can open them. This browser's
 * IndexedDB only holds designs saved before accounts existed, offered to copy into an account.
 */
export interface DesignSummary {
  id: string
  name: string
  updatedAt: number
  optionCount: number
  thumb: string
  swatches: string[]
  shirt?: string
  /** One of my designs that an admin made public */
  public?: boolean
  /** A public design that's one of mine, and its id among my designs */
  mine?: boolean
  designId?: string
}

export interface DesignStore {
  kind: 'local' | 'cloud'
  list(): Promise<DesignSummary[]>
  get(id: string): Promise<Design | undefined>
  put(d: Design): Promise<void>
  delete(id: string): Promise<void>
}

const blobUrls = new Map<Blob, string>()

/** An object URL for a saved image, made once per image */
export function urlFor(b: Blob) {
  let u = blobUrls.get(b)
  if (!u) blobUrls.set(b, (u = URL.createObjectURL(b)))
  return u
}

function summary(d: { id: string; name: string; updatedAt: number; options: { swatches: string[]; shirtColor?: string }[] }, thumb: string): DesignSummary {
  const o = d.options[0]
  return {
    id: d.id, name: d.name, updatedAt: d.updatedAt, optionCount: d.options.length, thumb, swatches: o?.swatches ?? [],
    shirt: o?.shirtColor,
  }
}

export const localStore: DesignStore = {
  kind: 'local',
  async list() {
    const all = await idb.all<Design>()
    all.sort((a, b) => b.updatedAt - a.updatedAt)
    return all.map((d) => summary(d, d.options[0] ? urlFor(d.options[0].thumbnail) : ''))
  },
  get: (id) => idb.get<Design>(id),
  async put(d) {
    persistStorage()
    await idb.put(d)
  },
  delete: (id) => idb.delete(id),
}

// MARK: Account storage

type OptionMeta = Omit<ColorOption, 'thumbnail' | 'layers'> & { layers: Omit<ColorOption['layers'][number], 'png'>[] }
type DesignMeta = Omit<Design, 'options'> & { options: OptionMeta[] }

/** Designs already downloaded or saved this session */
const cache = new Map<string, Design>()
/** For each design, the image the server holds under each key, so a save only uploads what changed */
const onServer = new Map<string, Map<string, Blob>>()

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/
// Images are cached for good; the option's save time in the URL makes a new address whenever they change
const blobUrl = (designId: string, key: string, v: number) => `/api/designs/${designId}/blobs/${key}?v=${v}`
const sig = (d: DesignMeta) => JSON.stringify([d.name, d.updatedAt, d.options.map((o) => [o.id, o.name, o.updatedAt])])

function toMeta(d: Design): DesignMeta {
  return {
    ...d,
    options: d.options.map(({ thumbnail: _t, layers, ...o }) => ({ ...o, layers: layers.map(({ png: _p, ...l }) => l) })),
  }
}

async function fetchBlob(url: string): Promise<Blob> {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, "Couldn't reach ColorChute. Check your connection and try again.")
  }
  if (!res.ok) throw new ApiError(res.status, 'Part of this design could not be loaded. Please try again.')
  return res.blob()
}

export const cloudStore: DesignStore = {
  kind: 'cloud',
  async list() {
    const { designs } = await api<{ designs: DesignMeta[] }>('/api/designs')
    for (const m of designs) {
      const c = cache.get(m.id)
      // Changed on another computer since it was opened here
      if (c && sig(toMeta(c)) !== sig(m)) cache.delete(m.id)
    }
    return designs.map((m) => ({
      ...summary(m, m.options[0] ? blobUrl(m.id, `${m.options[0].id}/thumb`, m.options[0].updatedAt) : ''),
      public: (m as PublicMeta).public,
    }))
  },

  async get(id) {
    const hit = cache.get(id)
    if (hit) return hit
    let m: DesignMeta
    try {
      m = await api<DesignMeta>(`/api/designs/${id}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return undefined
      throw e
    }
    const has = new Map<string, Blob>()
    const options = await Promise.all(
      m.options.map(async (o): Promise<ColorOption> => {
        const [thumbnail, ...pngs] = await Promise.all([
          fetchBlob(blobUrl(id, `${o.id}/thumb`, o.updatedAt)),
          ...o.layers.map((l) => fetchBlob(blobUrl(id, `${o.id}/${l.id}`, o.updatedAt))),
        ])
        has.set(`${o.id}/thumb`, thumbnail)
        o.layers.forEach((l, i) => has.set(`${o.id}/${l.id}`, pngs[i]))
        return { ...o, thumbnail, layers: o.layers.map((l, i) => ({ ...l, png: pngs[i] })) }
      }),
    )
    const d: Design = { ...m, id, options }
    cache.set(id, d)
    onServer.set(id, has)
    return d
  },

  async put(d) {
    const ids = [d.id, ...d.options.flatMap((o) => [o.id, ...o.layers.map((l) => l.id)])]
    if (!ids.every((x) => SAFE_ID.test(x))) throw new Error("This design has a layer name the server can't store. Save it as a new design.")
    const has = onServer.get(d.id) ?? new Map<string, Blob>()
    onServer.set(d.id, has)
    const uploads: [string, Blob][] = []
    for (const o of d.options) {
      if (has.get(`${o.id}/thumb`) !== o.thumbnail) uploads.push([`${o.id}/thumb`, o.thumbnail])
      for (const l of o.layers) if (has.get(`${o.id}/${l.id}`) !== l.png) uploads.push([`${o.id}/${l.id}`, l.png])
    }
    await eachLimit(uploads, 4, async ([key, blob]) => {
      await api(`/api/designs/${d.id}/blobs/${key}`, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: blob })
      has.set(key, blob)
    })
    await sendJson(`/api/designs/${d.id}`, toMeta(d), 'PUT')
    cache.set(d.id, d)
  },

  async delete(id) {
    await api(`/api/designs/${id}`, { method: 'DELETE' })
    cache.delete(id)
    onServer.delete(id)
  },
}

/** Forgets downloaded designs, when someone signs out */
export function clearCloudCache() {
  cache.clear()
  onServer.clear()
}

/** Makes one of my designs public, or not. Admins only. */
export async function setDesignPublic(id: string, pub: boolean) {
  await sendJson(`/api/designs/${id}/public`, { public: pub }, 'PUT')
}

// MARK: Public designs

type PublicMeta = DesignMeta & { mine?: boolean; designId?: string; public?: boolean }

const publicMeta = new Map<string, PublicMeta>()
const publicCache = new Map<string, Design>()
const publicBlobUrl = (id: string, key: string, v: number) => `/api/public/designs/${id}/blobs/${key}?v=${v}`

/** Designs an admin made public: anyone can list and open them, nobody can change them through here */
export const publicStore = {
  async list(): Promise<DesignSummary[]> {
    const { designs } = await api<{ designs: PublicMeta[] }>('/api/public/designs')
    for (const m of designs) {
      const had = publicMeta.get(m.id)
      if (had && sig(had) !== sig(m)) publicCache.delete(m.id)
      publicMeta.set(m.id, m)
    }
    return designs.map((m) => ({
      ...summary(m, m.options[0] ? publicBlobUrl(m.id, `${m.options[0].id}/thumb`, m.options[0].updatedAt) : ''),
      mine: m.mine, designId: m.designId,
    }))
  },

  async get(id: string): Promise<Design | undefined> {
    const hit = publicCache.get(id)
    if (hit) return hit
    if (!publicMeta.has(id)) await publicStore.list()
    const m = publicMeta.get(id)
    if (!m) return undefined
    const options = await Promise.all(
      m.options.map(async (o): Promise<ColorOption> => {
        const [thumbnail, ...pngs] = await Promise.all([
          fetchBlob(publicBlobUrl(id, `${o.id}/thumb`, o.updatedAt)),
          ...o.layers.map((l) => fetchBlob(publicBlobUrl(id, `${o.id}/${l.id}`, o.updatedAt))),
        ])
        return { ...o, thumbnail, layers: o.layers.map((l, i) => ({ ...l, png: pngs[i] })) }
      }),
    )
    const { mine: _m, designId: _d, public: _p, ...rest } = m
    const d: Design = { ...rest, id, options }
    publicCache.set(id, d)
    return d
  },
}
