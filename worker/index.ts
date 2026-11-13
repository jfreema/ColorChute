/**
 * ColorChute's Worker: serves the built site, plus a small API for Google sign-in, approving accounts and saving
 * designs. Accounts, sessions and designs live in one D1 database (free plan). Layer images are stored as PNG
 * blobs in D1, split into 1 MB chunks because a D1 value tops out at 2 MB.
 *
 * Secrets, set in the Cloudflare dashboard (Worker → Settings → Variables and Secrets):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  the Google OAuth web client
 *   ADMIN_EMAILS                            comma-separated Google addresses that are always approved admins
 */

interface Env {
  ASSETS: Fetcher
  DB: D1Database
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  ADMIN_EMAILS?: string
}

interface UserRow {
  id: string
  email: string
  name: string | null
  picture: string | null
  status: 'pending' | 'approved' | 'denied'
  is_admin: number
  samples_seeded: number
  created_at: number
  last_login_at: number | null
  decided_at: number | null
}

const SESSION_COOKIE = 'cc_session'
const OAUTH_COOKIE = 'cc_oauth'
const SESSION_MS = 30 * 24 * 3600 * 1000
const CHUNK = 1_000_000
const MAX_BLOB = 25_000_000
const MAX_META = 300_000
const ID = '[A-Za-z0-9_-]{1,64}'

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req)
    try {
      return await route(req, env, url)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      console.error(e)
      return json({ error: 'Something went wrong on the server. Please try again.' }, 500)
    }
  },
} satisfies ExportedHandler<Env>

async function route(req: Request, env: Env, url: URL): Promise<Response> {
  const p = url.pathname, m = req.method
  if (m !== 'GET' && m !== 'HEAD') {
    // Cookies are SameSite=Lax; this also refuses cross-site scripts that try to write
    if (req.headers.get('Origin') !== url.origin) throw new HttpError(403, 'Cross-site request refused')
  }

  if (p === '/api/auth/login' && m === 'GET') return login(env, url, url.searchParams.get('popup') === '1')
  await schema(env)
  if (p === '/api/auth/callback' && m === 'GET') return callback(req, env, url)
  if (p === '/api/auth/logout' && m === 'POST') return logout(req, env)
  if (p === '/api/me' && m === 'GET') return me(req, env)

  const user = await currentUser(req, env)
  if (p === '/api/me/samples-seeded' && m === 'POST') {
    const u = requireUser(user)
    await env.DB.prepare('UPDATE users SET samples_seeded = 1 WHERE id = ?').bind(u.id).run()
    return json({ ok: true })
  }

  if (p === '/api/admin/users' && m === 'GET') return adminList(env, requireAdmin(user, env))
  let r = p.match(new RegExp(`^/api/admin/users/(${ID})$`))
  if (r && m === 'POST') return adminUpdate(req, env, requireAdmin(user, env), r[1])

  if (p === '/api/designs' && m === 'GET') return listDesigns(env, requireApproved(user, env))
  r = p.match(new RegExp(`^/api/designs/(${ID})$`))
  if (r) {
    const u = requireApproved(user, env)
    if (m === 'GET') return getDesign(env, u, r[1])
    if (m === 'PUT') return putDesign(req, env, u, r[1])
    if (m === 'DELETE') return deleteDesign(env, u, r[1])
  }
  r = p.match(new RegExp(`^/api/designs/(${ID})/blobs/(${ID})/(${ID})$`))
  if (r) {
    const u = requireApproved(user, env)
    const key = `${r[2]}/${r[3]}`
    if (m === 'GET') return getBlob(env, u, r[1], key)
    if (m === 'PUT') return putBlob(req, env, u, r[1], key)
  }
  throw new HttpError(404, 'Not found')
}

// MARK: Database

let ready: Promise<unknown> | null = null

function schema(env: Env) {
  ready ??= env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT, picture TEXT,
      status TEXT NOT NULL DEFAULT 'pending', is_admin INTEGER NOT NULL DEFAULT 0,
      samples_seeded INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
      last_login_at INTEGER, decided_at INTEGER, decided_by TEXT)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS designs (
      user_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, meta TEXT NOT NULL, PRIMARY KEY (user_id, id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS blobs (
      user_id TEXT NOT NULL, design_id TEXT NOT NULL, key TEXT NOT NULL, chunk INTEGER NOT NULL,
      data BLOB NOT NULL, PRIMARY KEY (user_id, design_id, key, chunk))`),
  ]).catch((e) => {
    ready = null
    throw e
  })
  return ready
}

// MARK: Accounts

function adminEmails(env: Env): Set<string> {
  return new Set((env.ADMIN_EMAILS ?? '').split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))
}

const isAdmin = (u: UserRow, env: Env) => u.is_admin === 1 || adminEmails(env).has(u.email.toLowerCase())
const statusOf = (u: UserRow, env: Env) => (isAdmin(u, env) ? 'approved' : u.status)

function publicUser(u: UserRow, env: Env) {
  return {
    id: u.id, email: u.email, name: u.name, picture: u.picture, status: statusOf(u, env), admin: isAdmin(u, env),
    samplesSeeded: u.samples_seeded === 1,
  }
}

async function currentUser(req: Request, env: Env): Promise<UserRow | null> {
  const token = cookie(req, SESSION_COOKIE)
  if (!token) return null
  return env.DB.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
  ).bind(await sha256Hex(token), Date.now()).first<UserRow>()
}

function requireUser(u: UserRow | null): UserRow {
  if (!u) throw new HttpError(401, 'Sign in to save designs')
  return u
}

function requireApproved(u: UserRow | null, env: Env): UserRow {
  const user = requireUser(u)
  const s = statusOf(user, env)
  if (s === 'pending') throw new HttpError(403, 'Your account is waiting for approval')
  if (s !== 'approved') throw new HttpError(403, "Your account doesn't have access to save designs")
  return user
}

function requireAdmin(u: UserRow | null, env: Env): UserRow {
  const user = requireUser(u)
  if (!isAdmin(user, env)) throw new HttpError(403, 'Admins only')
  return user
}

async function me(req: Request, env: Env) {
  const u = await currentUser(req, env)
  let pending: number | undefined
  if (u && isAdmin(u, env)) {
    // Admins named in ADMIN_EMAILS count as approved even if their row predates the secret
    const { results } = await env.DB.prepare("SELECT email FROM users WHERE status = 'pending'").all<{ email: string }>()
    const admins = adminEmails(env)
    pending = results.filter((r) => !admins.has(r.email.toLowerCase())).length
  }
  return json({
    configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    user: u ? publicUser(u, env) : null,
    pending,
  })
}

async function adminList(env: Env, _admin: UserRow) {
  const { results } = await env.DB.prepare(
    `SELECT u.*, (SELECT COUNT(*) FROM designs d WHERE d.user_id = u.id) AS designs FROM users u
     ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, u.created_at DESC`,
  ).all<UserRow & { designs: number }>()
  return json({
    users: results.map((u) => ({
      ...publicUser(u, env), createdAt: u.created_at, lastLoginAt: u.last_login_at, decidedAt: u.decided_at,
      designs: u.designs, locked: adminEmails(env).has(u.email.toLowerCase()),
    })),
  })
}

async function adminUpdate(req: Request, env: Env, admin: UserRow, id: string) {
  const body = await readJson<{ status?: string; admin?: boolean }>(req, 10_000)
  const target = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
  if (!target) throw new HttpError(404, 'No such user')
  if (target.id === admin.id) throw new HttpError(400, "You can't change your own access")
  if (adminEmails(env).has(target.email.toLowerCase())) {
    throw new HttpError(400, 'This admin is set in the ADMIN_EMAILS secret; change it there')
  }
  const status = body.status ?? target.status
  if (!['pending', 'approved', 'denied'].includes(status)) throw new HttpError(400, 'Unknown status')
  const makeAdmin = body.admin === undefined ? target.is_admin : body.admin ? 1 : 0
  await env.DB.prepare('UPDATE users SET status = ?, is_admin = ?, decided_at = ?, decided_by = ? WHERE id = ?')
    .bind(status, status === 'approved' ? makeAdmin : 0, Date.now(), admin.id, id).run()
  return json({ ok: true })
}

// MARK: Google sign-in

const redirectUri = (url: URL) => `${url.origin}/api/auth/callback`

/** `popup` is set when the app opened sign-in in a small window, so the editor and its unsaved work stay put */
async function login(env: Env, url: URL, popup: boolean) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return page('Sign-in is not set up yet', 'The Google sign-in keys have not been added to this site yet.', 503, popup)
  }
  const state = randomToken(16)
  const verifier = randomToken(32)
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  auth.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(url), response_type: 'code', scope: 'openid email profile',
    state, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account',
  }).toString()
  const headers = new Headers({ Location: auth.toString(), 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', setCookie(OAUTH_COOKIE, `${state}.${verifier}.${popup ? 1 : 0}`, 600, '/api/auth'))
  return new Response(null, { status: 302, headers })
}

async function callback(req: Request, env: Env, url: URL) {
  const [state, verifier, mode] = (cookie(req, OAUTH_COOKIE) ?? '').split('.')
  const popup = mode === '1'
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return login(env, url, popup)
  if (url.searchParams.get('error')) return finish(popup, 'cancelled', clearCookie(OAUTH_COOKIE, '/api/auth'))
  const code = url.searchParams.get('code')
  if (!state || !verifier || !code || state !== url.searchParams.get('state')) {
    return page('Sign-in expired', 'That sign-in took too long or was opened in another browser. Please try again.', 400, popup)
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri(url),
      grant_type: 'authorization_code', code_verifier: verifier,
    }),
  })
  if (!res.ok) {
    console.error('Google token exchange failed', res.status, await res.text())
    return page('Sign-in failed', 'Google did not accept the sign-in. Please try again.', 502, popup)
  }
  // The ID token came straight from Google over TLS, so its claims can be trusted after these checks
  const { id_token } = await res.json<{ id_token?: string }>()
  const c = id_token ? decodeJwt(id_token) : null
  if (
    !c || !['https://accounts.google.com', 'accounts.google.com'].includes(String(c.iss)) ||
    c.aud !== env.GOOGLE_CLIENT_ID || Number(c.exp) * 1000 < Date.now() || typeof c.sub !== 'string' ||
    typeof c.email !== 'string' || !(c.email_verified === true || c.email_verified === 'true')
  ) {
    return page('Sign-in failed', 'Google returned an account we could not verify. Please try again.', 400, popup)
  }
  const email = c.email.toLowerCase()
  const admin = adminEmails(env).has(email)
  const now = Date.now()
  const token = randomToken(32)
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO users (id, email, name, picture, status, is_admin, created_at, last_login_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
       ON CONFLICT (id) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture,
         last_login_at = excluded.last_login_at,
         status = CASE WHEN excluded.is_admin = 1 THEN 'approved' ELSE users.status END,
         is_admin = MAX(users.is_admin, excluded.is_admin)`,
    ).bind(c.sub, email, typeof c.name === 'string' ? c.name : null, typeof c.picture === 'string' ? c.picture : null,
      admin ? 'approved' : 'pending', admin ? 1 : 0, now),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < ?').bind(c.sub, now),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256Hex(token), c.sub, now, now + SESSION_MS),
  ])
  return finish(popup, 'signed-in', clearCookie(OAUTH_COOKIE, '/api/auth'), setCookie(SESSION_COOKIE, token, SESSION_MS / 1000, '/'))
}

async function logout(req: Request, env: Env) {
  const token = cookie(req, SESSION_COOKIE)
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run()
  return json({ ok: true }, 200, [clearCookie(SESSION_COOKIE, '/')])
}

// MARK: Designs

interface DesignMeta {
  name: string
  createdAt: number
  updatedAt: number
  options: { id: string; layers: { id: string }[] }[]
}

function rowToDesign(r: { id: string; meta: string }) {
  return { ...JSON.parse(r.meta), id: r.id }
}

async function listDesigns(env: Env, u: UserRow) {
  const { results } = await env.DB.prepare('SELECT id, meta FROM designs WHERE user_id = ? ORDER BY updated_at DESC')
    .bind(u.id).all<{ id: string; meta: string }>()
  return json({ designs: results.map(rowToDesign) })
}

async function getDesign(env: Env, u: UserRow, id: string) {
  const r = await env.DB.prepare('SELECT id, meta FROM designs WHERE user_id = ? AND id = ?').bind(u.id, id)
    .first<{ id: string; meta: string }>()
  if (!r) throw new HttpError(404, 'That design is gone')
  return json(rowToDesign(r))
}

/** Saves a design's details. Its images go up first, one request each, so a save fails here if one is missing. */
async function putDesign(req: Request, env: Env, u: UserRow, id: string) {
  const d = await readJson<DesignMeta>(req, MAX_META)
  const idOk = (s: unknown) => typeof s === 'string' && new RegExp(`^${ID}$`).test(s)
  if (typeof d.name !== 'string' || !Array.isArray(d.options) || !d.options.length ||
    !d.options.every((o) => idOk(o.id) && Array.isArray(o.layers) && o.layers.every((l) => idOk(l.id)))) {
    throw new HttpError(400, "That design's details are incomplete")
  }
  const keys = d.options.flatMap((o) => [`${o.id}/thumb`, ...o.layers.map((l) => `${o.id}/${l.id}`)])
  const { results: missing } = await env.DB.prepare(
    `SELECT value FROM json_each(?1)
     WHERE value NOT IN (SELECT key FROM blobs WHERE user_id = ?2 AND design_id = ?3 AND chunk = 0)`,
  ).bind(JSON.stringify(keys), u.id, id).all<{ value: string }>()
  if (missing.length) throw new HttpError(409, 'Some of the images did not upload. Please save again.')
  const now = Date.now()
  const meta = JSON.stringify({ ...d, id: undefined, name: d.name.slice(0, 200) })
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO designs (user_id, id, name, created_at, updated_at, meta) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at, meta = excluded.meta`,
    ).bind(u.id, id, d.name.slice(0, 200), Number(d.createdAt) || now, Number(d.updatedAt) || now, meta),
    env.DB.prepare('DELETE FROM blobs WHERE user_id = ?1 AND design_id = ?2 AND key NOT IN (SELECT value FROM json_each(?3))')
      .bind(u.id, id, JSON.stringify(keys)),
  ])
  return json({ ok: true })
}

async function deleteDesign(env: Env, u: UserRow, id: string) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM designs WHERE user_id = ? AND id = ?').bind(u.id, id),
    env.DB.prepare('DELETE FROM blobs WHERE user_id = ? AND design_id = ?').bind(u.id, id),
  ])
  return json({ ok: true })
}

async function putBlob(req: Request, env: Env, u: UserRow, designId: string, key: string) {
  const len = Number(req.headers.get('Content-Length') ?? 0)
  if (len > MAX_BLOB) throw new HttpError(413, 'That image is too big to save')
  const data = new Uint8Array(await req.arrayBuffer())
  if (data.length > MAX_BLOB) throw new HttpError(413, 'That image is too big to save')
  const png = [0x89, 0x50, 0x4e, 0x47]
  if (data.length < 8 || png.some((b, i) => data[i] !== b)) throw new HttpError(400, 'Only PNG images can be saved')
  const stmts = [env.DB.prepare('DELETE FROM blobs WHERE user_id = ? AND design_id = ? AND key = ?').bind(u.id, designId, key)]
  for (let i = 0; i * CHUNK < data.length; i++) {
    stmts.push(env.DB.prepare('INSERT INTO blobs (user_id, design_id, key, chunk, data) VALUES (?, ?, ?, ?, ?)')
      .bind(u.id, designId, key, i, data.subarray(i * CHUNK, (i + 1) * CHUNK)))
  }
  await env.DB.batch(stmts)
  return json({ ok: true })
}

async function getBlob(env: Env, u: UserRow, designId: string, key: string) {
  const { results } = await env.DB.prepare(
    'SELECT data FROM blobs WHERE user_id = ? AND design_id = ? AND key = ? ORDER BY chunk',
  ).bind(u.id, designId, key).all<{ data: ArrayBuffer | number[] }>()
  if (!results.length) throw new HttpError(404, 'Image not found')
  const parts = results.map((r) => (r.data instanceof ArrayBuffer ? new Uint8Array(r.data) : Uint8Array.from(r.data)))
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  // URLs carry the option's save time, so a cached copy is never stale
  return new Response(out, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=31536000, immutable' } })
}

// MARK: Helpers

function json(data: unknown, status = 200, cookies: string[] = []) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  for (const c of cookies) headers.append('Set-Cookie', c)
  return new Response(JSON.stringify(data), { status, headers })
}

async function readJson<T>(req: Request, max: number): Promise<T> {
  const text = await req.text()
  if (text.length > max) throw new HttpError(413, 'That is too much to save at once')
  try {
    return JSON.parse(text) as T
  } catch {
    throw new HttpError(400, 'Bad request')
  }
}

/**
 * Ends a sign-in. In the pop-up window it tells the editor (over a BroadcastChannel, since Google's pages cut the
 * link back to the opener) and closes itself; otherwise it goes back to the editor.
 */
function finish(popup: boolean, result: 'signed-in' | 'cancelled', ...cookies: string[]) {
  if (!popup) {
    const headers = new Headers({ Location: '/', 'Cache-Control': 'no-store' })
    for (const c of cookies) headers.append('Set-Cookie', c)
    return new Response(null, { status: 302, headers })
  }
  const script = `<script>try{new BroadcastChannel('colorchute-auth').postMessage('${result}')}catch(e){}window.close()</script>`
  const res = result === 'signed-in'
    ? page("You're signed in", 'You can close this window and go back to ColorChute.', 200, true, script)
    : page('Sign-in cancelled', 'You can close this window.', 200, true, script)
  for (const c of cookies) res.headers.append('Set-Cookie', c)
  return res
}

function page(title: string, message: string, status: number, popup = false, extra = '') {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
  const link = popup
    ? '<a href="#" onclick="window.close();return false" style="font-weight: 800; color: #2f5bea">Close this window</a>'
    : '<a href="/" style="font-weight: 800; color: #2f5bea">Back to ColorChute</a>'
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ColorChute</title>
<body style="font-family: system-ui, sans-serif; background: #2f5bea; color: #171f3d; display: grid; place-items: center; min-height: 100vh; margin: 0">
<div style="background: #fff; border: 3px solid #171f3d; border-radius: 16px; padding: 28px 32px; max-width: 420px; box-shadow: 4px 5px 0 #171f3d">
<h1 style="margin: 0 0 8px; font-size: 22px">${esc(title)}</h1><p style="margin: 0 0 18px">${esc(message)}</p>
${link}</div>${extra}</body>`
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

function cookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get('Cookie') ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim()
  }
  return null
}

const setCookie = (name: string, value: string, maxAge: number, path: string) =>
  `${name}=${value}; Path=${path}; Max-Age=${Math.round(maxAge)}; HttpOnly; Secure; SameSite=Lax`
const clearCookie = (name: string, path: string) => setCookie(name, '', 0, path)

function randomToken(bytes: number) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

function base64Url(b: Uint8Array) {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Hex(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  return [...d].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(part + '='.repeat((4 - (part.length % 4)) % 4))
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))))
  } catch {
    return null
  }
}
