import type { ReactNode } from 'react'

/** TapeOut radar is a public, read-only demo. Account actions stay local until a wallet is connected. */
export function AccessBoundary({ children }: { children: ReactNode }) {
  return <>{children}</>
}
