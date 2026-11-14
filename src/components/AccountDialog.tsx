import { checkApproval, closePrompt, signIn, signOut, useAccount } from '../editor/account'
import { Dialog } from './Dialog'
import { Clock, LogIn, OctagonX } from './icons'

const keepWork = 'You can keep designing and exporting. To keep this work for later, use More, then Download project file.'

/** Explains why saving needs an account, and what to do about it */
export function AccountDialog() {
  const prompt = useAccount((s) => s.prompt)
  const user = useAccount((s) => s.user)
  const configured = useAccount((s) => s.configured)
  if (!prompt) return null

  if (prompt === 'signin') {
    return (
      <Dialog title="Sign in to save" icon={<LogIn size={14} />} chip="var(--green)" onClose={closePrompt}
        footer={
          <>
            <button className="btn" onClick={closePrompt}>Not now</button>
            <button className="btn green" onClick={signIn}><LogIn size={15} /> Sign in with Google</button>
          </>
        }>
        <p className="dialog-text">
          Anyone can design here. Saving designs needs an account, so your work is kept safe and follows you to any
          computer.
        </p>
        <p className="dialog-text">
          Sign in with Google. New accounts are approved by the ColorChute admin before they can save.{' '}
          <a href="/privacy" target="_blank" rel="noreferrer">What we keep</a>
        </p>
      </Dialog>
    )
  }

  if (prompt === 'pending') {
    return (
      <Dialog title="Waiting for approval" icon={<Clock size={14} />} onClose={closePrompt}
        footer={
          <>
            <button className="btn" onClick={() => signOut()}>Sign out</button>
            <span className="grow" />
            <button className="btn" onClick={checkApproval}>Check again</button>
            <button className="btn yellow" onClick={closePrompt}>OK</button>
          </>
        }>
        <p className="dialog-text">
          You're signed in as <b>{user?.email}</b>. The admin needs to approve your account before you can save designs.
        </p>
        <p className="dialog-text">{keepWork}</p>
      </Dialog>
    )
  }

  if (prompt === 'denied') {
    return (
      <Dialog title="No access to save" icon={<OctagonX size={14} />} chip="var(--red)" onClose={closePrompt}
        footer={
          <>
            <button className="btn" onClick={() => signOut()}>Sign out</button>
            <span className="grow" />
            <button className="btn yellow" onClick={closePrompt}>OK</button>
          </>
        }>
        <p className="dialog-text">
          <b>{user?.email}</b> doesn't have access to save designs. Ask the ColorChute admin if you think it should.
        </p>
        <p className="dialog-text">{keepWork}</p>
      </Dialog>
    )
  }

  return (
    <Dialog title="Saving isn't available" icon={<OctagonX size={14} />} onClose={closePrompt}
      footer={<button className="btn yellow" onClick={closePrompt}>OK</button>}>
      <p className="dialog-text">
        {configured
          ? "Couldn't reach ColorChute's server to save. Check your connection and try again."
          : "Sign-in isn't set up on this site yet, so designs can't be saved."}
      </p>
      <p className="dialog-text">{keepWork}</p>
    </Dialog>
  )
}
