import { useState } from 'react'

/** A Google profile photo, or the first letter of the name when there isn't one */
export function Avatar({ user, size = 26 }: { user: { name: string | null; email: string; picture: string | null }; size?: number }) {
  const [failed, setFailed] = useState(false)
  const letter = (user.name || user.email).trim().charAt(0).toUpperCase()
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {user.picture && !failed ? (
        <img src={user.picture} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        letter
      )}
    </span>
  )
}
