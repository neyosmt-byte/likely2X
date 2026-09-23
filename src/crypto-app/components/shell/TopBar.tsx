import { Bell, Search, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { Button } from '../ui/index.ts'
import { activeCryptoNavItem } from './nav.ts'
import { BrandLogo } from './BrandLogo.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

type TopBarProps = { onCommandOpen: () => void }

export function TopBar({ onCommandOpen }: TopBarProps) {
  const location = useLocation()
  const currentItem = activeCryptoNavItem(location.pathname)
  return <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-3 backdrop-blur md:px-4">
    <BrandLogo className="shrink-0 md:hidden" variant="icon" />
    <div aria-label="顶部状态栏" role="region" className="hidden min-w-[148px] items-center gap-2 rounded-md border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-1)_82%,black)] px-2.5 py-1.5 md:flex">
      <currentItem.icon size={14} className="text-[var(--accent)]" />
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">当前模块</span>
      <strong className="text-sm text-[var(--text)]">{currentItem.label}</strong>
    </div>
    <Button className="h-9 min-w-0 flex-1 justify-start px-3 text-left font-normal text-[var(--text-muted)] md:max-w-xl" aria-label="搜索 Processor、Circuit、项目，打开命令中心" title="搜索 Processor、Circuit、项目，打开命令中心" onClick={onCommandOpen} type="button" variant="secondary">
      <Search size={16} /><span className="truncate">搜索 Processor、Circuit、项目</span><kbd className="ml-auto hidden rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] md:inline">⌘K</kbd>
    </Button>
    <ThemeToggle />
    <Button asChild aria-label="通知中心" size="icon" title="通知中心" variant="ghost"><Link to="/notifications"><Bell size={17} /></Link></Button>
    <Button asChild aria-label="账户中心" size="icon" title="账户中心" variant="ghost"><Link to="/account"><UserRound size={17} /></Link></Button>
  </header>
}
