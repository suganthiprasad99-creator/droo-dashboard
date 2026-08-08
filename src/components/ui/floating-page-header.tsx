import type { ReactNode } from 'react'

export function FloatingPageHeader({
  title,
  children,
  className = '',
}: {
  title: string
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={`app-page-header ${className}`.trim()}>
      <h1>{title}</h1>
      {children ? <div className="app-page-header-actions">{children}</div> : null}
    </header>
  )
}
