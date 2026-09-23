import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { CommandCenter } from './CommandCenter.tsx'
import { MobileNav } from './MobileNav.tsx'
import { Sidebar } from './Sidebar.tsx'
import { TopBar } from './TopBar.tsx'

export function CryptoShell() {
  const [collapsed, setCollapsed] = useState(true)
  const [commandOpen, setCommandOpen] = useState(false)
  const [density, setDensity] = useState(() => {
    try {
      const workspace = JSON.parse(window.localStorage.getItem('likely2x:workspace:v2') || '{}') as { density?: string }
      return workspace.density === 'compact' ? 'compact' : 'comfortable'
    } catch { return 'comfortable' }
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    function onWorkspaceChange(event: Event) {
      const state = (event as CustomEvent<{ density?: string }>).detail
      setDensity(state?.density === 'compact' ? 'compact' : 'comfortable')
    }
    window.addEventListener('likely2x:workspace', onWorkspaceChange)
    return () => window.removeEventListener('likely2x:workspace', onWorkspaceChange)
  }, [])

  return (
    <div className="crypto-app flex min-h-screen" data-density={density}>
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <TopBar onCommandOpen={() => setCommandOpen(true)} />
        <main className="min-w-0 flex-1 px-3 py-4 md:px-5 md:py-5">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <CommandCenter open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
