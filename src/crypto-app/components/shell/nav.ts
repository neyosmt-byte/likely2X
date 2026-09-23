import { Activity, Bell, ChartCandlestick, Compass, Database, Menu, Radar, Sparkles, UserRound, type LucideIcon } from 'lucide-react'

export type CryptoNavItem = {
  icon: LucideIcon
  label: string
  path: string
  shortLabel?: string
}

export const cryptoNavItems: CryptoNavItem[] = [
  { icon: Compass, label: '发现', path: '/' },
  { icon: Radar, label: '生态雷达', path: '/radar' },
  { icon: ChartCandlestick, label: '项目与资产', path: '/market' },
  { icon: Activity, label: '生态异动', path: '/anomaly' },
  { icon: Sparkles, label: '生态 Alpha', path: '/alpha' },
  { icon: Database, label: '数据同步', path: '/data' },
  { icon: Bell, label: '通知', path: '/notifications' },
  { icon: UserRound, label: '我的空间', path: '/account' },
]

export const mobileNavItems: CryptoNavItem[] = [
  { icon: Compass, label: '发现', path: '/' },
  { icon: Radar, label: '雷达', path: '/radar' },
  { icon: ChartCandlestick, label: '行情', path: '/market' },
  { icon: Sparkles, label: 'Alpha', path: '/alpha' },
  { icon: Menu, label: '更多', path: '/more' },
]

export const mobileMoreNavItems: CryptoNavItem[] = [
  { icon: Database, label: '数据健康', path: '/data' },
  { icon: Activity, label: '异动', path: '/anomaly' },
  { icon: Bell, label: '通知', path: '/notifications' },
  { icon: UserRound, label: '我的空间', path: '/account' },
]

export const accountNavItem: CryptoNavItem = { icon: UserRound, label: '我的空间', path: '/account' }
export const notificationsNavItem: CryptoNavItem = { icon: Bell, label: '通知', path: '/notifications' }

export function visibleCryptoNavItems() { return cryptoNavItems }

export function visibleMobileNavItems() {
  return mobileNavItems
}

export function visibleMobileMoreNavItems() { return mobileMoreNavItems }

export function activeCryptoNavItem(pathname: string) {
  if (pathname === '/' || pathname.startsWith('/crypto')) {
    return cryptoNavItems[0]
  }

  if (pathname.startsWith('/account')) {
    return accountNavItem
  }

  if (pathname.startsWith('/notifications')) {
    return notificationsNavItem
  }

  return visibleCryptoNavItems().find((item) => item.path !== '/' && pathname.startsWith(item.path)) ?? cryptoNavItems[0]
}

export function isCryptoNavItemActive(pathname: string, item: CryptoNavItem) {
  return item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
}

export function cryptoNavLinkTitle(item: CryptoNavItem, isActive: boolean) {
  return `${isActive ? '当前生态模块' : '切换生态模块'}：${item.label}`
}
