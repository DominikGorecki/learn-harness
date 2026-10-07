import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import '../workspace.css'

// Presentation only: features retain authoritative content, state and callbacks.
export function WorkspacePage({ children, labelledBy, className = '', reading = false }: {
  children: ReactNode; labelledBy: string; className?: string; reading?: boolean
}) {
  return <section className={`workspace-page workspace-enter ${reading ? 'workspace-page-reading' : ''} ${className}`} aria-labelledby={labelledBy}>{children}</section>
}

export function WorkspaceHeader({ id, eyebrow, title, children, status }: {
  id: string; eyebrow: string; title: ReactNode; children?: ReactNode; status?: ReactNode
}) {
  return <header className="workspace-page-header">
    <p className="workspace-eyebrow">{eyebrow}</p>
    <div className="workspace-heading-line"><h1 id={id} tabIndex={-1} data-focus-anchor="heading">{title}</h1>{status}</div>
    {children && <div className="workspace-lead">{children}</div>}
  </header>
}

export function WorkspaceContext({ children }: { children: ReactNode }) {
  return <div className="workspace-context">{children}</div>
}

export function WorkspaceActions({ children, label }: { children: ReactNode; label?: string }) {
  return <div className="workspace-actions" role={label ? 'group' : undefined} aria-label={label}>{children}</div>
}

export function WorkspaceAction({ children, className = '', primary = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button type="button" {...props} className={`workspace-action ${primary ? 'workspace-action-primary' : ''} ${className}`}>{children}</button>
}

export function WorkspaceRow({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`workspace-row ${className}`}>{children}</div>
}

export function WorkspaceSection({ children, title, id, count }: { children: ReactNode; title: string; id?: string; count?: ReactNode }) {
  return <section className="workspace-document-section" aria-labelledby={id}>
    <div className="workspace-section-heading"><h2 id={id}>{title}</h2>{count !== undefined && <span>{count}</span>}</div>{children}
  </section>
}

export function WorkspaceMessage({ children, error = false, warning = false }: { children: ReactNode; error?: boolean; warning?: boolean }) {
  return <div className={`workspace-feedback ${error ? 'workspace-feedback-error' : warning ? 'workspace-feedback-warning' : ''}`} role={error ? 'alert' : 'status'}>{children}</div>
}
