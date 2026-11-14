var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/index.ts
var SESSION_COOKIE = "cc_session";
var OAUTH_COOKIE = "cc_oauth";
var SESSION_MS = 30 * 24 * 3600 * 1e3;
var CHUNK = 1e6;
var MAX_BLOB = 25e6;
var MAX_META = 3e5;
var ID = "[A-Za-z0-9_-]{1,64}";
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
  static {
    __name(this, "HttpError");
  }
};
var worker_default = {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      return await route(req, env, url);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Something went wrong on the server. Please try again." }, 500);
    }
  }
};
async function route(req, env, url) {
  const p = url.pathname, m = req.method;
  if (m !== "GET" && m !== "HEAD") {
    if (req.headers.get("Origin") !== url.origin) throw new HttpError(403, "Cross-site request refused");
  }
  if (p === "/api/auth/login" && m === "GET") return login(env, url, url.searchParams.get("popup") === "1");
  await schema(env);
  if (p === "/api/auth/callback" && m === "GET") return callback(req, env, url);
  if (p === "/api/auth/logout" && m === "POST") return logout(req, env);
  if (p === "/api/me" && m === "GET") return me(req, env);
  const user = await currentUser(req, env);
  if (p === "/api/me/samples-seeded" && m === "POST") {
    const u = requireUser(user);
    await env.DB.prepare("UPDATE users SET samples_seeded = 1 WHERE id = ?").bind(u.id).run();
    return json({ ok: true });
  }
  if (p === "/api/admin/users" && m === "GET") return adminList(env, requireAdmin(user, env));
  let r = p.match(new RegExp(`^/api/admin/users/(${ID})$`));
  if (r && m === "POST") return adminUpdate(req, env, requireAdmin(user, env), r[1]);
  if (p === "/api/designs" && m === "GET") return listDesigns(env, requireApproved(user, env));
  r = p.match(new RegExp(`^/api/designs/(${ID})$`));
  if (r) {
    const u = requireApproved(user, env);
    if (m === "GET") return getDesign(env, u, r[1]);
    if (m === "PUT") return putDesign(req, env, u, r[1]);
    if (m === "DELETE") return deleteDesign(env, u, r[1]);
  }
  r = p.match(new RegExp(`^/api/designs/(${ID})/blobs/(${ID})/(${ID})$`));
  if (r) {
    const u = requireApproved(user, env);
    const key = `${r[2]}/${r[3]}`;
    if (m === "GET") return getBlob(env, u, r[1], key);
    if (m === "PUT") return putBlob(req, env, u, r[1], key);
  }
  throw new HttpError(404, "Not found");
}
__name(route, "route");
var ready = null;
function schema(env) {
  ready ??= env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT, picture TEXT,
      status TEXT NOT NULL DEFAULT 'pending', is_admin INTEGER NOT NULL DEFAULT 0,
      samples_seeded INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
      last_login_at INTEGER, decided_at INTEGER, decided_by TEXT)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS designs (
      user_id TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL, meta TEXT NOT NULL, PRIMARY KEY (user_id, id))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS blobs (
      user_id TEXT NOT NULL, design_id TEXT NOT NULL, key TEXT NOT NULL, chunk INTEGER NOT NULL,
      data BLOB NOT NULL, PRIMARY KEY (user_id, design_id, key, chunk))`)
  ]).catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
__name(schema, "schema");
function adminEmails(env) {
  return new Set((env.ADMIN_EMAILS ?? "").split(/[,\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean));
}
__name(adminEmails, "adminEmails");
var isAdmin = /* @__PURE__ */ __name((u, env) => u.is_admin === 1 || adminEmails(env).has(u.email.toLowerCase()), "isAdmin");
var statusOf = /* @__PURE__ */ __name((u, env) => isAdmin(u, env) ? "approved" : u.status, "statusOf");
function publicUser(u, env) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    picture: u.picture,
    status: statusOf(u, env),
    admin: isAdmin(u, env),
    samplesSeeded: u.samples_seeded === 1
  };
}
__name(publicUser, "publicUser");
async function currentUser(req, env) {
  const token = cookie(req, SESSION_COOKIE);
  if (!token) return null;
  return env.DB.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?"
  ).bind(await sha256Hex(token), Date.now()).first();
}
__name(currentUser, "currentUser");
function requireUser(u) {
  if (!u) throw new HttpError(401, "Sign in to save designs");
  return u;
}
__name(requireUser, "requireUser");
function requireApproved(u, env) {
  const user = requireUser(u);
  const s = statusOf(user, env);
  if (s === "pending") throw new HttpError(403, "Your account is waiting for approval");
  if (s !== "approved") throw new HttpError(403, "Your account doesn't have access to save designs");
  return user;
}
__name(requireApproved, "requireApproved");
function requireAdmin(u, env) {
  const user = requireUser(u);
  if (!isAdmin(user, env)) throw new HttpError(403, "Admins only");
  return user;
}
__name(requireAdmin, "requireAdmin");
async function me(req, env) {
  const u = await currentUser(req, env);
  let pending;
  if (u && isAdmin(u, env)) {
    const { results } = await env.DB.prepare("SELECT email FROM users WHERE status = 'pending'").all();
    const admins = adminEmails(env);
    pending = results.filter((r) => !admins.has(r.email.toLowerCase())).length;
  }
  return json({
    configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    user: u ? publicUser(u, env) : null,
    pending
  });
}
__name(me, "me");
async function adminList(env, _admin) {
  const { results } = await env.DB.prepare(
    `SELECT u.*, (SELECT COUNT(*) FROM designs d WHERE d.user_id = u.id) AS designs FROM users u
     ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, u.created_at DESC`
  ).all();
  return json({
    users: results.map((u) => ({
      ...publicUser(u, env),
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      decidedAt: u.decided_at,
      designs: u.designs,
      locked: adminEmails(env).has(u.email.toLowerCase())
    }))
  });
}
__name(adminList, "adminList");
async function adminUpdate(req, env, admin, id) {
  const body = await readJson(req, 1e4);
  const target = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  if (!target) throw new HttpError(404, "No such user");
  if (target.id === admin.id) throw new HttpError(400, "You can't change your own access");
  if (adminEmails(env).has(target.email.toLowerCase())) {
    throw new HttpError(400, "This admin is set in the ADMIN_EMAILS secret; change it there");
  }
  const status = body.status ?? target.status;
  if (!["pending", "approved", "denied"].includes(status)) throw new HttpError(400, "Unknown status");
  const makeAdmin = body.admin === void 0 ? target.is_admin : body.admin ? 1 : 0;
  await env.DB.prepare("UPDATE users SET status = ?, is_admin = ?, decided_at = ?, decided_by = ? WHERE id = ?").bind(status, status === "approved" ? makeAdmin : 0, Date.now(), admin.id, id).run();
  return json({ ok: true });
}
__name(adminUpdate, "adminUpdate");
var redirectUri = /* @__PURE__ */ __name((url) => `${url.origin}/api/auth/callback`, "redirectUri");
async function login(env, url, popup) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return page("Sign-in is not set up yet", "The Google sign-in keys have not been added to this site yet.", 503, popup);
  }
  const state = randomToken(16);
  const verifier = randomToken(32);
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(url),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account"
  }).toString();
  const headers = new Headers({ Location: auth.toString(), "Cache-Control": "no-store" });
  headers.append("Set-Cookie", setCookie(OAUTH_COOKIE, `${state}.${verifier}.${popup ? 1 : 0}`, 600, "/api/auth"));
  return new Response(null, { status: 302, headers });
}
__name(login, "login");
async function callback(req, env, url) {
  const [state, verifier, mode] = (cookie(req, OAUTH_COOKIE) ?? "").split(".");
  const popup = mode === "1";
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return login(env, url, popup);
  if (url.searchParams.get("error")) return finish(popup, "cancelled", clearCookie(OAUTH_COOKIE, "/api/auth"));
  const code = url.searchParams.get("code");
  if (!state || !verifier || !code || state !== url.searchParams.get("state")) {
    return page("Sign-in expired", "That sign-in took too long or was opened in another browser. Please try again.", 400, popup);
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(url),
      grant_type: "authorization_code",
      code_verifier: verifier
    })
  });
  if (!res.ok) {
    console.error("Google token exchange failed", res.status, await res.text());
    return page("Sign-in failed", "Google did not accept the sign-in. Please try again.", 502, popup);
  }
  const { id_token } = await res.json();
  const c = id_token ? decodeJwt(id_token) : null;
  if (!c || !["https://accounts.google.com", "accounts.google.com"].includes(String(c.iss)) || c.aud !== env.GOOGLE_CLIENT_ID || Number(c.exp) * 1e3 < Date.now() || typeof c.sub !== "string" || typeof c.email !== "string" || !(c.email_verified === true || c.email_verified === "true")) {
    return page("Sign-in failed", "Google returned an account we could not verify. Please try again.", 400, popup);
  }
  const email = c.email.toLowerCase();
  const admin = adminEmails(env).has(email);
  const now = Date.now();
  const token = randomToken(32);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO users (id, email, name, picture, status, is_admin, created_at, last_login_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
       ON CONFLICT (id) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture,
         last_login_at = excluded.last_login_at,
         status = CASE WHEN excluded.is_admin = 1 THEN 'approved' ELSE users.status END,
         is_admin = MAX(users.is_admin, excluded.is_admin)`
    ).bind(
      c.sub,
      email,
      typeof c.name === "string" ? c.name : null,
      typeof c.picture === "string" ? c.picture : null,
      admin ? "approved" : "pending",
      admin ? 1 : 0,
      now
    ),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at < ?").bind(c.sub, now),
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256Hex(token), c.sub, now, now + SESSION_MS)
  ]);
  return finish(popup, "signed-in", clearCookie(OAUTH_COOKIE, "/api/auth"), setCookie(SESSION_COOKIE, token, SESSION_MS / 1e3, "/"));
}
__name(callback, "callback");
async function logout(req, env) {
  const token = cookie(req, SESSION_COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, [clearCookie(SESSION_COOKIE, "/")]);
}
__name(logout, "logout");
function rowToDesign(r) {
  return { ...JSON.parse(r.meta), id: r.id };
}
__name(rowToDesign, "rowToDesign");
async function listDesigns(env, u) {
  const { results } = await env.DB.prepare("SELECT id, meta FROM designs WHERE user_id = ? ORDER BY updated_at DESC").bind(u.id).all();
  return json({ designs: results.map(rowToDesign) });
}
__name(listDesigns, "listDesigns");
async function getDesign(env, u, id) {
  const r = await env.DB.prepare("SELECT id, meta FROM designs WHERE user_id = ? AND id = ?").bind(u.id, id).first();
  if (!r) throw new HttpError(404, "That design is gone");
  return json(rowToDesign(r));
}
__name(getDesign, "getDesign");
async function putDesign(req, env, u, id) {
  const d = await readJson(req, MAX_META);
  const idOk = /* @__PURE__ */ __name((s) => typeof s === "string" && new RegExp(`^${ID}$`).test(s), "idOk");
  if (typeof d.name !== "string" || !Array.isArray(d.options) || !d.options.length || !d.options.every((o) => idOk(o.id) && Array.isArray(o.layers) && o.layers.every((l) => idOk(l.id)))) {
    throw new HttpError(400, "That design's details are incomplete");
  }
  const keys = d.options.flatMap((o) => [`${o.id}/thumb`, ...o.layers.map((l) => `${o.id}/${l.id}`)]);
  const { results: missing } = await env.DB.prepare(
    `SELECT value FROM json_each(?1)
     WHERE value NOT IN (SELECT key FROM blobs WHERE user_id = ?2 AND design_id = ?3 AND chunk = 0)`
  ).bind(JSON.stringify(keys), u.id, id).all();
  if (missing.length) throw new HttpError(409, "Some of the images did not upload. Please save again.");
  const now = Date.now();
  const meta = JSON.stringify({ ...d, id: void 0, name: d.name.slice(0, 200) });
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO designs (user_id, id, name, created_at, updated_at, meta) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at, meta = excluded.meta`
    ).bind(u.id, id, d.name.slice(0, 200), Number(d.createdAt) || now, Number(d.updatedAt) || now, meta),
    env.DB.prepare("DELETE FROM blobs WHERE user_id = ?1 AND design_id = ?2 AND key NOT IN (SELECT value FROM json_each(?3))").bind(u.id, id, JSON.stringify(keys))
  ]);
  return json({ ok: true });
}
__name(putDesign, "putDesign");
async function deleteDesign(env, u, id) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM designs WHERE user_id = ? AND id = ?").bind(u.id, id),
    env.DB.prepare("DELETE FROM blobs WHERE user_id = ? AND design_id = ?").bind(u.id, id)
  ]);
  return json({ ok: true });
}
__name(deleteDesign, "deleteDesign");
async function putBlob(req, env, u, designId, key) {
  const len = Number(req.headers.get("Content-Length") ?? 0);
  if (len > MAX_BLOB) throw new HttpError(413, "That image is too big to save");
  const data = new Uint8Array(await req.arrayBuffer());
  if (data.length > MAX_BLOB) throw new HttpError(413, "That image is too big to save");
  const png = [137, 80, 78, 71];
  if (data.length < 8 || png.some((b, i) => data[i] !== b)) throw new HttpError(400, "Only PNG images can be saved");
  const stmts = [env.DB.prepare("DELETE FROM blobs WHERE user_id = ? AND design_id = ? AND key = ?").bind(u.id, designId, key)];
  for (let i = 0; i * CHUNK < data.length; i++) {
    stmts.push(env.DB.prepare("INSERT INTO blobs (user_id, design_id, key, chunk, data) VALUES (?, ?, ?, ?, ?)").bind(u.id, designId, key, i, data.subarray(i * CHUNK, (i + 1) * CHUNK)));
  }
  await env.DB.batch(stmts);
  return json({ ok: true });
}
__name(putBlob, "putBlob");
async function getBlob(env, u, designId, key) {
  const { results } = await env.DB.prepare(
    "SELECT data FROM blobs WHERE user_id = ? AND design_id = ? AND key = ? ORDER BY chunk"
  ).bind(u.id, designId, key).all();
  if (!results.length) throw new HttpError(404, "Image not found");
  const parts = results.map((r) => r.data instanceof ArrayBuffer ? new Uint8Array(r.data) : Uint8Array.from(r.data));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return new Response(out, { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=31536000, immutable" } });
}
__name(getBlob, "getBlob");
function json(data, status = 200, cookies = []) {
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify(data), { status, headers });
}
__name(json, "json");
async function readJson(req, max) {
  const text = await req.text();
  if (text.length > max) throw new HttpError(413, "That is too much to save at once");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Bad request");
  }
}
__name(readJson, "readJson");
function finish(popup, result, ...cookies) {
  if (!popup) {
    const headers = new Headers({ Location: "/", "Cache-Control": "no-store" });
    for (const c of cookies) headers.append("Set-Cookie", c);
    return new Response(null, { status: 302, headers });
  }
  const script = `<script>try{new BroadcastChannel('colorchute-auth').postMessage('${result}')}catch(e){}window.close()<\/script>`;
  const res = result === "signed-in" ? page("You're signed in", "You can close this window and go back to ColorChute.", 200, true, script) : page("Sign-in cancelled", "You can close this window.", 200, true, script);
  for (const c of cookies) res.headers.append("Set-Cookie", c);
  return res;
}
__name(finish, "finish");
function page(title, message, status, popup = false, extra = "") {
  const esc = /* @__PURE__ */ __name((s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`), "esc");
  const link = popup ? '<a href="#" onclick="window.close();return false" style="font-weight: 800; color: #2f5bea">Close this window</a>' : '<a href="/" style="font-weight: 800; color: #2f5bea">Back to ColorChute</a>';
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} \xB7 ColorChute</title>
<body style="font-family: system-ui, sans-serif; background: #2f5bea; color: #171f3d; display: grid; place-items: center; min-height: 100vh; margin: 0">
<div style="background: #fff; border: 3px solid #171f3d; border-radius: 16px; padding: 28px 32px; max-width: 420px; box-shadow: 4px 5px 0 #171f3d">
<h1 style="margin: 0 0 8px; font-size: 22px">${esc(title)}</h1><p style="margin: 0 0 18px">${esc(message)}</p>
${link}</div>${extra}</body>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
__name(page, "page");
function cookie(req, name) {
  for (const part of (req.headers.get("Cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
__name(cookie, "cookie");
var setCookie = /* @__PURE__ */ __name((name, value, maxAge, path) => `${name}=${value}; Path=${path}; Max-Age=${Math.round(maxAge)}; HttpOnly; Secure; SameSite=Lax`, "setCookie");
var clearCookie = /* @__PURE__ */ __name((name, path) => setCookie(name, "", 0, path), "clearCookie");
function randomToken(bytes) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}
__name(randomToken, "randomToken");
function base64Url(b) {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64Url, "base64Url");
async function sha256Hex(s) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return [...d].map((x) => x.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function decodeJwt(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(part + "=".repeat((4 - part.length % 4) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}
__name(decodeJwt, "decodeJwt");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-nuc3ts/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-nuc3ts/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
