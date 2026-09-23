import type { ReactNode } from 'react'

/** TapeOut radar is a public, read-only workspace. Local settings stay in the browser. */
export function AccessBoundary({ children }: { children: ReactNode }) {
  return <>{children}</>
}
