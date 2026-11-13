import { useCallback, useEffect, useState } from 'react'
import { setPendingCount, useAccount } from '../editor/account'
import { editor } from '../editor/store'
import { api, sendJson } from '../lib/api'
import { Avatar } from './Avatar'
import { Dialog } from './Dialog'
import { ShieldCheck } from './icons'

interface AdminUser {
  id: string
  email: string
  name: string | null
  picture: string | null
  status: 'pending' | 'approved' | 'denied'
  admin: boolean
  createdAt: number
  lastLoginAt: number | null
  designs: number
  /** An admin set by the ADMIN_EMAILS secret, which only Cloudflare can change */
  locked: boolean
}

const day = (t: number | null) => (t ? new Date(t).toLocaleDateString() : 'never')

/** Approve or turn away new accounts, and pick other admins */
export function AdminDialog({ onClose }: { onClose: () => void }) {
  const me = useAccount((s) => s.user)
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [working, setWorking] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await api<{ users: AdminUser[] }>('/api/admin/users')
      setUsers(r.users)
      setPendingCount(r.users.filter((u) => u.status === 'pending').length)
    } catch (e) {
      editor.toast(e instanceof Error ? e.message : "Couldn't load accounts")
      setUsers([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const update = async (u: AdminUser, change: { status?: AdminUser['status']; admin?: boolean }, done: string) => {
    setWorking(u.id)
    try {
      await sendJson(`/api/admin/users/${u.id}`, change)
      editor.toast(done)
      await load()
    } catch (e) {
      editor.toast(e instanceof Error ? e.message : "Couldn't change that account")
    } finally {
      setWorking(null)
    }
  }

  const pending = users?.filter((u) => u.status === 'pending') ?? []
  const others = users?.filter((u) => u.status !== 'pending') ?? []
  const who = (u: AdminUser) => u.name || u.email

  const row = (u: AdminUser) => {
    const self = u.id === me?.id
    const busy = working === u.id
    return (
      <div key={u.id} className="user-row">
        <Avatar user={u} size={34} />
        <div className="who">
          <div className="nm">
            {u.name || u.email}
            {u.admin && <span className="pill" style={{ background: 'var(--sky)' }}>Admin</span>}
            {u.status === 'denied' && <span className="pill block">No access</span>}
          </div>
          <div className="hint">
            {u.name ? `${u.email} · ` : ''}joined {day(u.createdAt)} · last signed in {day(u.lastLoginAt)}
            {u.designs ? ` · ${u.designs} design${u.designs === 1 ? '' : 's'}` : ''}
          </div>
        </div>
        <div className="acts">
          {self ? (
            <span className="hint">You</span>
          ) : u.locked ? (
            <span className="hint" title="Set by ADMIN_EMAILS in Cloudflare">Always admin</span>
          ) : u.status === 'pending' ? (
            <>
              <button className="btn small" disabled={busy} onClick={() => update(u, { status: 'denied' }, `Turned away ${who(u)}`)}>Deny</button>
              <button className="btn small green" disabled={busy} onClick={() => update(u, { status: 'approved' }, `Approved ${who(u)}`)}>Approve</button>
            </>
          ) : u.status === 'approved' ? (
            <>
              <button className="btn small" disabled={busy}
                onClick={() => update(u, { admin: !u.admin }, u.admin ? `${who(u)} is no longer an admin` : `${who(u)} is now an admin`)}>
                {u.admin ? 'Remove admin' : 'Make admin'}
              </button>
              <button className="btn small red" disabled={busy} onClick={() => update(u, { status: 'denied' }, `Removed access for ${who(u)}`)}>
                Remove access
              </button>
            </>
          ) : (
            <button className="btn small green" disabled={busy} onClick={() => update(u, { status: 'approved' }, `Approved ${who(u)}`)}>Approve</button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog title="Admin" icon={<ShieldCheck size={14} />} chip="var(--sky)" wide onClose={onClose}>
      {users === null ? (
        <div className="empty">Loading accounts…</div>
      ) : (
        <>
          <div className="section-label">Waiting for approval <span className="sub">{pending.length || 'none'}</span></div>
          {pending.length > 0 ? (
            <div className="card">{pending.map(row)}</div>
          ) : (
            <p className="dialog-text">Nobody is waiting. New people show up here after they sign in with Google.</p>
          )}
          <div className="section-label">Accounts <span className="sub">{others.length}</span></div>
          <div className="card">{others.map(row)}</div>
          <p className="dialog-text" style={{ opacity: 0.85, fontSize: 12 }}>
            Approved accounts can save designs. Removing access keeps their saved designs but stops them saving or
            opening them. Admins can approve people too.
          </p>
        </>
      )}
    </Dialog>
  )
}
