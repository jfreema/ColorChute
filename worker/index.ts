/**
 * ColorChute's Worker: serves the built site, plus a small API for Google sign-in, approving accounts and saving
 * designs. Accounts, sessions and designs live in one D1 database (free plan). Layer images are stored as PNG
 * blobs in D1, split into 1 MB chunks because a D1 value tops out at 2 MB.
 *
 * Secrets, set in the Cloudflare dashboard (Worker → Settings → Variables and Secrets) with type Secret, which deploys
 * never touch (plain-text ones were once deleted by a deploy; `keep_vars` in wrangler.toml now guards those too):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  the Google OAuth web client
 *   ADMIN_EMAILS                            comma-separated Google addresses that are always approved admins
 *
 * Each account's Custom print colors are one small JSON list (table custom_colors), checked by the same rules the app
 * uses (src/lib/customColorList.ts).
 *
 * Share links (/s/<token>) let anyone with the link look at one design, public or not. The Worker answers those pages
 * itself only to add link-preview tags (the design's name and picture) to the app's index.html.
 */

import { cleanCustomColors, MAX_CUSTOM_COLORS } from '../src/lib/customColorList'

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
/** A share link (/s/<token>) or a public design's link (/p/<id>) */
const LINK_PAGE = new RegExp(`^/(s|p)/(${ID})$`)

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    const link = url.pathname.match(LINK_PAGE)
    if (link && req.method === 'GET') return linkPage(env, url, link[1] as 's' | 'p', link[2])
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
  if (p === '/api/me/colors') {
    if (m === 'GET') return getCustomColors(env, requireApproved(user, env))
    if (m === 'PUT') return putCustomColors(req, env, requireApproved(user, env))
  }

  if (p === '/api/admin/users' && m === 'GET') return adminList(env, requireAdmin(user, env))
  let r = p.match(new RegExp(`^/api/admin/users/(${ID})$`))
  if (r && m === 'POST') return adminUpdate(req, env, requireAdmin(user, env), r[1])

  // Public designs: anyone can look, only their owner (an admin) can change whether they're public
  if (p === '/api/public/designs' && m === 'GET') return listPublic(env, user)
  r = p.match(new RegExp(`^/api/public/designs/(${ID})/blobs/(${ID})/(${ID})$`))
  if (r && m === 'GET') return getPublicBlob(env, r[1], `${r[2]}/${r[3]}`)
  r = p.match(new RegExp(`^/api/designs/(${ID})/public$`))
  if (r && m === 'PUT') return setPublic(req, env, requireApproved(requireAdmin(user, env), env), r[1])

  // Share links: anyone with the link can look; the owner can make one or turn it off
  r = p.match(new RegExp(`^/api/shared/(${ID})$`))
  if (r && m === 'GET') return getShared(env, user, r[1])
  r = p.match(new RegExp(`^/api/shared/(${ID})/blobs/(${ID})/(${ID})$`))
  if (r && m === 'GET') return getSharedBlob(env, r[1], `${r[2]}/${r[3]}`)
  r = p.match(new RegExp(`^/api/designs/(${ID})/share$`))
  if (r && m === 'PUT') return share(env, requireApproved(user, env), r[1])
  if (r && m === 'DELETE') return unshare(env, requireApproved(user, env), r[1])

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
    // Designs an admin marked "Available to public". Anyone can view them, signed in or not. The random id keeps the
    // owner's account id out of public addresses.
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS public_designs (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, design_id TEXT NOT NULL, published_at INTEGER NOT NULL,
      UNIQUE (user_id, design_id))`),
    // Share links: anyone with the link can view the design, public or not, until its owner turns the link off.
    // The id is the secret in the link, so it's long and random.
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS share_links (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, design_id TEXT NOT NULL, created_at INTEGER NOT NULL,
      UNIQUE (user_id, design_id))`),
    // Each account's Custom print colors, as a JSON list of { name, hex }. No row means the starting colors.
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS custom_colors (
      user_id TEXT PRIMARY KEY, colors TEXT NOT NULL, updated_at INTEGER NOT NULL)`),
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

// MARK: Custom colors

/** The account's Custom colors, or null if it never changed them (the app then shows the starting colors) */
async function getCustomColors(env: Env, u: UserRow) {
  const r = await env.DB.prepare('SELECT colors FROM custom_colors WHERE user_id = ?').bind(u.id).first<{ colors: string }>()
  return json({ colors: r ? cleanCustomColors(JSON.parse(r.colors)) : null })
}

async function putCustomColors(req: Request, env: Env, u: UserRow) {
  const { colors } = await readJson<{ colors?: unknown }>(req, 20_000)
  if (Array.isArray(colors) && colors.length > MAX_CUSTOM_COLORS) {
    throw new HttpError(400, `Custom holds up to ${MAX_CUSTOM_COLORS} colors`)
  }
  const list = cleanCustomColors(colors)
  if (!list) throw new HttpError(400, 'Send the list of colors')
  await env.DB.prepare(
    `INSERT INTO custom_colors (user_id, colors, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET colors = excluded.colors, updated_at = excluded.updated_at`,
  ).bind(u.id, JSON.stringify(list), Date.now()).run()
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
  const { results } = await env.DB.prepare(
    `SELECT d.id, d.meta, p.id IS NOT NULL AS pub, s.id AS share FROM designs d
     LEFT JOIN public_designs p ON p.user_id = d.user_id AND p.design_id = d.id
     LEFT JOIN share_links s ON s.user_id = d.user_id AND s.design_id = d.id
     WHERE d.user_id = ? ORDER BY d.updated_at DESC`,
  ).bind(u.id).all<{ id: string; meta: string; pub: number; share: string | null }>()
  return json({
    designs: results.map((r) => ({ ...rowToDesign(r), public: r.pub === 1, ...(r.share ? { shared: r.share } : {}) })),
  })
}

/** Every public design, newest first. The owner's own come back marked, with their real id, so they open as theirs. */
async function listPublic(env: Env, u: UserRow | null) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.user_id, d.id AS design_id, d.meta FROM public_designs p
     JOIN designs d ON d.user_id = p.user_id AND d.id = p.design_id ORDER BY d.updated_at DESC`,
  ).all<{ id: string; user_id: string; design_id: string; meta: string }>()
  return json({
    designs: results.map((r) => {
      const mine = u?.id === r.user_id
      return { ...JSON.parse(r.meta), id: r.id, ...(mine ? { mine: true, designId: r.design_id } : {}) }
    }),
  })
}

async function setPublic(req: Request, env: Env, u: UserRow, id: string) {
  const { public: pub } = await readJson<{ public?: unknown }>(req, 1000)
  if (typeof pub !== 'boolean') throw new HttpError(400, 'Say whether the design should be public')
  const d = await env.DB.prepare('SELECT id FROM designs WHERE user_id = ? AND id = ?').bind(u.id, id).first()
  if (!d) throw new HttpError(404, 'That design is gone')
  await (pub
    ? env.DB.prepare('INSERT OR IGNORE INTO public_designs (id, user_id, design_id, published_at) VALUES (?, ?, ?, ?)')
      .bind(randomToken(9), u.id, id, Date.now())
    : env.DB.prepare('DELETE FROM public_designs WHERE user_id = ? AND design_id = ?').bind(u.id, id)
  ).run()
  return json({ ok: true })
}

/** Makes a share link for one of my designs, or returns the one it already has */
async function share(env: Env, u: UserRow, id: string) {
  const d = await env.DB.prepare('SELECT id FROM designs WHERE user_id = ? AND id = ?').bind(u.id, id).first()
  if (!d) throw new HttpError(404, 'Save this design before sharing it')
  await env.DB.prepare('INSERT OR IGNORE INTO share_links (id, user_id, design_id, created_at) VALUES (?, ?, ?, ?)')
    .bind(randomToken(12), u.id, id, Date.now()).run()
  const row = await env.DB.prepare('SELECT id FROM share_links WHERE user_id = ? AND design_id = ?').bind(u.id, id)
    .first<{ id: string }>()
  return json({ token: row!.id })
}

/** Turns a design's share link off. Sharing again makes a new link, so the old one stays dead. */
async function unshare(env: Env, u: UserRow, id: string) {
  await env.DB.prepare('DELETE FROM share_links WHERE user_id = ? AND design_id = ?').bind(u.id, id).run()
  return json({ ok: true })
}

/** A shared design's details, for anyone with the link. Its owner gets their own id back, so it opens as theirs. */
async function getShared(env: Env, u: UserRow | null, token: string) {
  const r = await env.DB.prepare(
    `SELECT s.user_id, d.id, d.meta FROM share_links s JOIN designs d ON d.user_id = s.user_id AND d.id = s.design_id
     WHERE s.id = ?`,
  ).bind(token).first<{ user_id: string; id: string; meta: string }>()
  if (!r) throw new HttpError(404, 'This share link was turned off, or the design was deleted.')
  const mine = u?.id === r.user_id
  return json({ ...JSON.parse(r.meta), id: token, ...(mine ? { mine: true, designId: r.id } : {}) })
}

async function getSharedBlob(env: Env, token: string, key: string) {
  const { results } = await env.DB.prepare(
    `SELECT b.data FROM share_links s
     JOIN blobs b ON b.user_id = s.user_id AND b.design_id = s.design_id
     WHERE s.id = ? AND b.key = ? ORDER BY b.chunk`,
  ).bind(token, key).all<{ data: ArrayBuffer | number[] }>()
  // Private, so nothing between here and the viewer keeps a copy after the link is turned off
  return pngResponse(results, 'private')
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
    env.DB.prepare('DELETE FROM public_designs WHERE user_id = ? AND design_id = ?').bind(u.id, id),
    env.DB.prepare('DELETE FROM share_links WHERE user_id = ? AND design_id = ?').bind(u.id, id),
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
  return pngResponse(results, 'private')
}

async function getPublicBlob(env: Env, publicId: string, key: string) {
  const { results } = await env.DB.prepare(
    `SELECT b.data FROM public_designs p
     JOIN blobs b ON b.user_id = p.user_id AND b.design_id = p.design_id
     WHERE p.id = ? AND b.key = ? ORDER BY b.chunk`,
  ).bind(publicId, key).all<{ data: ArrayBuffer | number[] }>()
  return pngResponse(results, 'public')
}

/** Joins an image's chunks back into one PNG */
function pngResponse(results: { data: ArrayBuffer | number[] }[], cache: 'private' | 'public') {
  if (!results.length) throw new HttpError(404, 'Image not found')
  const parts = results.map((r) => (r.data instanceof ArrayBuffer ? new Uint8Array(r.data) : Uint8Array.from(r.data)))
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  // URLs carry the option's save time, so a cached copy is never stale
  return new Response(out, { headers: { 'Content-Type': 'image/png', 'Cache-Control': `${cache}, max-age=31536000, immutable` } })
}

// MARK: Link previews

/**
 * The app's page for a share link or a public design's link, with tags that give the link a preview (name, color
 * options and a picture) when it's pasted into a text message or chat. The app itself reads the link and opens the
 * design. A link that doesn't work gets the plain page, and the app says why.
 */
async function linkPage(env: Env, url: URL, kind: 's' | 'p', id: string): Promise<Response> {
  const index = await env.ASSETS.fetch(new Request(new URL('/', url)))
  if (!index.ok) return index
  let design: DesignMeta | null = null
  try {
    await schema(env)
    const table = kind === 's' ? 'share_links' : 'public_designs'
    const row = await env.DB.prepare(
      `SELECT d.meta FROM ${table} l JOIN designs d ON d.user_id = l.user_id AND d.id = l.design_id WHERE l.id = ?`,
    ).bind(id).first<{ meta: string }>()
    design = row ? JSON.parse(row.meta) : null
  } catch (e) {
    console.error('Link preview failed', e)
  }
  const headers = new Headers(index.headers)
  headers.set('Cache-Control', 'no-cache')
  headers.delete('ETag')
  if (!design?.options?.length) return new Response(index.body, { status: 200, headers })

  type Opt = DesignMeta['options'][number] & { name?: string; updatedAt?: number }
  const options = design.options as Opt[]
  const option = options.find((o) => o.id === url.searchParams.get('option')) ?? options[0]
  const base = kind === 's' ? `/api/shared/${id}` : `/api/public/designs/${id}`
  const names = options.map((o) => o.name).filter(Boolean)
  const description = options.length === 1
    ? 'A shirt design. Open it to see it on a shirt.'
    : `${options.length} color options: ${names.slice(0, 4).join(', ')}${names.length > 4 ? ' and more' : ''}. Open it to compare them on a shirt.`
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)
  const tag = (property: string, content: string) => `<meta property="${property}" content="${esc(content)}">`
  const tags = [
    tag('og:type', 'website'),
    tag('og:site_name', 'ColorChute'),
    tag('og:title', design.name),
    tag('og:description', description),
    tag('og:url', url.toString()),
    tag('og:image', `${url.origin}${base}/blobs/${option.id}/thumb?v=${option.updatedAt ?? 0}`),
    '<meta name="twitter:card" content="summary">',
  ].join('')
  return new HTMLRewriter()
    .on('head', { element: (e) => void e.append(tags, { html: true }) })
    .on('meta[name="description"]', { element: (e) => void e.setAttribute('content', description) })
    .transform(new Response(index.body, { status: 200, headers }))
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
