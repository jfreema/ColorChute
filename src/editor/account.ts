import { useSyncExternalStore } from 'react'
import { api } from '../lib/api'
import { editor } from './store'

/**
 * Who is signed in. Editing and saving designs needs a Google account that the admin approved (Jared, 2026-11-14);
 * everyone else can only look at the public designs. Sign-in runs in a pop-up window so unsaved work in the editor
 * is never lost to a page change.
 */
export interface User {
  id: string
  email: string
  name: string | null
  picture: string | null
  status: 'pending' | 'approved' | 'denied'
  admin: boolean
  samplesSeeded: boolean
}

/** Why the sign-in dialog is showing, if it is */
export type AccountPrompt = 'signin' | 'pending' | 'denied' | 'unavailable' | null

export interface AccountState {
  loaded: boolean
  /** The server answered; false offline or on the dev server without the Worker */
  reachable: boolean
  /** Google sign-in keys are set on the server */
  configured: boolean
  user: User | null
  /** Accounts waiting for approval, for admins */
  pending: number
  prompt: AccountPrompt
}

let state: AccountState = { loaded: false, reachable: false, configured: false, user: null, pending: 0, prompt: null }
const listeners = new Set<() => void>()
const changeListeners = new Set<() => void>()
/** What the person was doing when they were asked to sign in, so it carries on once they can save */
let resume: (() => void) | null = null

function set(patch: Partial<AccountState>) {
  const before = state.user
  state = { ...state, ...patch }
  for (const fn of listeners) fn()
  const after = state.user
  if (before?.id !== after?.id || before?.status !== after?.status || before?.admin !== after?.admin) {
    for (const fn of changeListeners) fn()
  }
}

export function useAccount<T>(select: (s: AccountState) => T): T {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => select(state),
  )
}

export const getAccount = () => state

/** Called when someone signs in or out, or their approval changes */
export function onAccountChange(fn: () => void) {
  changeListeners.add(fn)
  return () => changeListeners.delete(fn)
}

export const canSave = () => state.user?.status === 'approved'

let loading: Promise<void> | null = null

/** Asks the server who is signed in. Calls made while one is running share it. */
export function loadAccount(): Promise<void> {
  loading ??= (async () => {
    try {
      const r = await api<{ configured: boolean; user: User | null; pending?: number }>('/api/me')
      set({ loaded: true, reachable: true, configured: r.configured, user: r.user, pending: r.pending ?? 0 })
    } catch {
      // Offline or the server is down: keep whoever was signed in, so a blip doesn't lock someone out mid-design
      set({ loaded: true, reachable: false })
    }
  })().finally(() => (loading = null))
  return loading
}

/** True when editing and saving are allowed. Otherwise shows why not, and runs `retry` once the person is approved. */
export function requireSave(retry?: () => void): boolean {
  if (canSave()) return true
  resume = retry ?? null
  const u = state.user
  set({
    prompt: !state.reachable || !state.configured ? 'unavailable' : !u ? 'signin' : u.status === 'pending' ? 'pending' : 'denied',
  })
  return false
}

/** Asks the server again, as from "Check again" while waiting for approval */
export async function checkApproval() {
  await loadAccount()
  if (!canSave()) return editor.toast('Still waiting for approval')
  const next = resume
  resume = null
  set({ prompt: null })
  editor.toast("You're approved. Editing and saving work now.")
  next?.()
}

export function closePrompt() {
  resume = null
  set({ prompt: null })
}

export function showPrompt(prompt: AccountPrompt) {
  set({ prompt })
}

/** Opens Google sign-in. False when the browser blocked the window and there was unsaved work to protect. */
export function signIn(): boolean {
  const w = 480, h = 640
  const left = Math.round(window.screenX + (window.outerWidth - w) / 2)
  const top = Math.round(window.screenY + (window.outerHeight - h) / 2)
  const popup = window.open('/api/auth/login?popup=1', 'colorchute-signin', `popup,width=${w},height=${h},left=${left},top=${top}`)
  if (popup) {
    set({ prompt: null })
    watching = true
    return true
  }
  // Pop-ups blocked: going to Google in this tab is fine only when there's nothing to lose
  if (!editor.state.dirty) {
    location.href = '/api/auth/login'
    return true
  }
  editor.toast('Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.')
  return false
}

export async function signOut() {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
  resume = null
  set({ user: null, pending: 0, prompt: null })
}

export function setPendingCount(pending: number) {
  set({ pending })
}

let signingIn: Promise<void> | null = null

/** The account just signed in: carry on with the save that asked for it, or say why it can't */
function afterSignIn() {
  watching = false
  signingIn ??= finishSignIn().finally(() => (signingIn = null))
  return signingIn
}

async function finishSignIn() {
  await loadAccount()
  const u = state.user
  if (!u) return
  if (u.status === 'approved') {
    const next = resume
    resume = null
    set({ prompt: null })
    editor.toast(`Signed in as ${u.email}`)
    next?.()
  } else {
    set({ prompt: u.status === 'pending' ? 'pending' : 'denied' })
  }
}

/** Set while the sign-in window is open, so coming back to this tab checks for the new session */
let watching = false
let lastFocusCheck = 0

if (typeof window !== 'undefined') {
  try {
    new BroadcastChannel('colorchute-auth').addEventListener('message', (e) => {
      if (e.data === 'signed-in') afterSignIn()
      else watching = false
    })
  } catch {
    // Older browsers: the focus check below still notices the sign-in
  }
  window.addEventListener('focus', () => {
    if (watching) return void afterSignIn()
    // Picks up an approval or a sign-out from another tab, at most once a minute
    if (state.user && Date.now() - lastFocusCheck > 60_000) {
      lastFocusCheck = Date.now()
      loadAccount()
    }
  })
}
