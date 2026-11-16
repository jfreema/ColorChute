import { useSyncExternalStore } from 'react'
import { api, sendJson } from '../lib/api'
import { normalizeHex } from '../lib/color'
import { cleanCustomColors, CustomColor, MAX_CUSTOM_COLORS, UNNAMED_CUSTOM } from '../lib/customColorList'
import { CUSTOM_STARTERS, INK_COLLECTIONS, inkColorName } from '../lib/palettes'
import { canSave, getAccount, onAccountChange } from './account'
import { editor } from './store'

/**
 * The colors in the person's Custom print color group (Jared, 2026-11-16). Each account keeps its own list on the
 * server; one that never changed it sees CUSTOM_STARTERS. A copy in this browser shows the list right away on the
 * next visit, before the server answers.
 */
let colors: CustomColor[] = CUSTOM_STARTERS
const listeners = new Set<() => void>()

function set(next: CustomColor[]) {
  colors = next
  for (const fn of listeners) fn()
}

export function useCustomColors(): CustomColor[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => colors,
  )
}

const cacheKey = (userId: string) => `colorchute.customColors.${userId}`

function readCache(userId: string): CustomColor[] | null {
  try {
    const text = localStorage.getItem(cacheKey(userId))
    return text ? cleanCustomColors(JSON.parse(text)) : null
  } catch {
    return null
  }
}

function writeCache(list: CustomColor[]) {
  const id = getAccount().user?.id
  if (!id) return
  try {
    localStorage.setItem(cacheKey(id), JSON.stringify(list))
  } catch {
    // Private windows can refuse storage; the server still has the list
  }
}

/** Whose list came from the server, so a second account change for the same person doesn't ask again */
let loadedFor: string | null = null
let loading: Promise<void> | null = null

function load() {
  loading ??= fetchList().finally(() => (loading = null))
  return loading
}

async function fetchList() {
  const user = getAccount().user
  if (!user || !canSave()) {
    loadedFor = null
    return set(CUSTOM_STARTERS)
  }
  if (loadedFor === user.id) return
  loadedFor = null
  set(readCache(user.id) ?? CUSTOM_STARTERS)
  try {
    const r = await api<{ colors: unknown }>('/api/me/colors')
    if (getAccount().user?.id !== user.id) return
    const list = cleanCustomColors(r.colors) ?? CUSTOM_STARTERS
    loadedFor = user.id
    set(list)
    writeCache(list)
  } catch {
    // Offline or the server hiccupped: keep what's showing and ask again when the window is next focused
  }
}

onAccountChange(load)
if (getAccount().loaded) load()
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    if (!loadedFor && canSave()) load()
  })
}

/** Saves run one after another, so the server always ends up with the newest list */
let saving: Promise<unknown> = Promise.resolve()

/** False (and asks again) while the account's own list hasn't come back, so a change can't save over it */
function ready(): boolean {
  if (!canSave() || loadedFor === getAccount().user?.id) return true
  load()
  editor.toast('Still loading your Custom colors. Try again in a moment.')
  return false
}

function update(next: CustomColor[]) {
  set(next)
  // The dev server without the Worker edits freely; its changes last until the page reloads
  if (!canSave()) return
  writeCache(next)
  saving = saving
    .then(() => sendJson('/api/me/colors', { colors: next }, 'PUT'))
    .catch((e: Error) => editor.toast(`Couldn't save your Custom colors. ${e.message}`))
}

/** The last color taken out, so adding it straight back keeps its name */
let lastRemoved: CustomColor | null = null

export function addCustomColor(hex: string) {
  if (!ready()) return
  const h = normalizeHex(hex)
  if (colors.some((c) => c.hex === h)) return editor.toast('That color is already in Custom')
  if (colors.length >= MAX_CUSTOM_COLORS) {
    return editor.toast(`Custom holds up to ${MAX_CUSTOM_COLORS} colors. Remove one first.`)
  }
  // A color that matches one in another group borrows its name
  const name = lastRemoved?.hex === h
    ? lastRemoved.name
    : inkColorName(h, undefined, INK_COLLECTIONS.filter((c) => !c.custom))?.name ?? UNNAMED_CUSTOM
  update([...colors, { name, hex: h }])
  editor.toast(`Added ${name === UNNAMED_CUSTOM ? h : name} to Custom`)
}

export function removeCustomColor(hex: string) {
  if (!ready()) return
  const h = normalizeHex(hex)
  const gone = colors.find((c) => c.hex === h)
  if (!gone) return
  lastRemoved = gone
  update(colors.filter((c) => c !== gone))
  editor.toast(`Removed ${gone.name === UNNAMED_CUSTOM ? h : gone.name} from Custom`)
}
