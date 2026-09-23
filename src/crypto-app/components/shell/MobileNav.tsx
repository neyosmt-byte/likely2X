import { NavLink, useLocation } from 'react-router-dom'

import { cn } from '../../lib/cn.ts'
import { Button, Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '../ui/index.ts'
import { cryptoNavLinkTitle, isCryptoNavItemActive, visibleMobileMoreNavItems, visibleMobileNavItems } from './nav.ts'

export function MobileNav() {
  const location = useLocation()
  const mobileNavItems = visibleMobileNavItems()
  const mobileMoreNavItems = visibleMobileMoreNavItems()
  const moreIsActive = mobileMoreNavItems.some((item) => location.pathname.startsWith(item.path))

  return (
    <nav aria-label="移动主导航" className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-[var(--border)] bg-[var(--panel)] px-1 md:hidden">
      {mobileNavItems.map((item) =>
        item.path === '/more' ? (
          <Sheet key={item.path}>
            <SheetTrigger asChild>
              <Button
                aria-current={moreIsActive ? 'true' : undefined}
                aria-label="移动主导航更多模块"
                className={cn(
                  'h-full min-w-0 flex-col gap-1 rounded-md border-transparent bg-transparent px-0 text-[11px] font-semibold text-[var(--text-muted)] hover:bg-transparent',
                  moreIsActive && 'text-[var(--accent)] hover:text-[var(--accent)]',
                )}
                title="移动主导航更多模块"
                type="button"
                variant="ghost"
              >
                <item.icon size={18} />
                <span>{item.shortLabel ?? item.label}</span>
              </Button>
            </SheetTrigger>
            <SheetContent closeLabel="关闭更多模块" className="inset-x-3 bottom-20 top-auto max-h-[48svh] w-auto max-w-none rounded-xl border border-[var(--border-strong)] p-3 md:hidden">
              <SheetTitle className="text-sm font-semibold text-[var(--text)]">更多模块</SheetTitle>
              <SheetDescription className="mt-1 text-xs text-[var(--text-muted)]">移动端保留五个稳定触控区域，其余模块从这里进入。</SheetDescription>
              <div className="mt-4 grid gap-2">
                {mobileMoreNavItems.map((moreItem) => (
                  <NavLink
                    key={moreItem.path}
                    title={cryptoNavLinkTitle(moreItem, isCryptoNavItemActive(location.pathname, moreItem))}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-11 items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent)]',
                        isActive && 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-1))]',
                      )
                    }
                    to={moreItem.path}
                  >
                    <moreItem.icon size={17} className="text-[var(--accent)]" />
                    {moreItem.label}
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            title={cryptoNavLinkTitle(item, isCryptoNavItemActive(location.pathname, item))}
            className={({ isActive }) => cn('flex min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold text-[var(--text-muted)]', isActive && 'text-[var(--accent)]')}
          >
            <item.icon size={18} />
            <span>{item.shortLabel ?? item.label}</span>
          </NavLink>
        ),
      )}
    </nav>
  )
}
