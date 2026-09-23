import { ChevronLeft, ChevronRight } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

import { cn } from '../../lib/cn.ts'
import { Button } from '../ui/index.ts'
import { BrandLogo } from './BrandLogo.tsx'
import { cryptoNavLinkTitle, isCryptoNavItemActive, visibleCryptoNavItems } from './nav.ts'

type SidebarProps = {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

function sidebarToggleTitle(collapsed: boolean) {
  return collapsed ? '侧栏导航已折叠，点击展开' : '侧栏导航已展开，点击折叠'
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation()

  return (
    <aside
      className={cn('hidden min-h-screen shrink-0 border-r border-[var(--border)] bg-[var(--panel)] transition-[width] duration-200 md:flex md:flex-col', collapsed ? 'w-[72px]' : 'w-[208px]')}
      data-collapsed={collapsed}
      data-testid="crypto-sidebar"
    >
      <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-3">
        <BrandLogo className={cn(collapsed ? 'size-8' : 'h-7 max-w-[116px]')} variant={collapsed ? 'icon' : 'wordmark'} />
        <Button
          aria-controls="crypto-sidebar-navigation"
          aria-expanded={!collapsed}
          aria-label="侧栏导航"
          size="icon"
          title={sidebarToggleTitle(collapsed)}
          variant="ghost"
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
        </Button>
      </div>
      <nav id="crypto-sidebar-navigation" aria-label="Crypto 主导航" className="grid gap-1 p-2">
        {visibleCryptoNavItems().map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            title={cryptoNavLinkTitle(item, isCryptoNavItemActive(location.pathname, item))}
            className={({ isActive }) =>
              cn('flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]', isActive && 'bg-[var(--surface-3)] text-[var(--text)]')
            }
          >
            <item.icon size={17} className="shrink-0" />
            <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto" />
    </aside>
  )
}
