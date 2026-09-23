import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { CryptoShell } from '../components/shell/CryptoShell.tsx'

const TapeoutDiscoveryPage = lazy(() => import('../../tapeout/pages.tsx').then((module) => ({ default: module.TapeoutDiscoveryPage })))
const TapeoutRadarPage = lazy(() => import('../../tapeout/pages.tsx').then((module) => ({ default: module.TapeoutRadarPage })))
const TapeoutAlphaPage = lazy(() => import('../../tapeout/pages.tsx').then((module) => ({ default: module.TapeoutAlphaPage })))
const TapeoutMarketPage = lazy(() => import('../../tapeout/pages.tsx').then((module) => ({ default: module.TapeoutMarketPage })))
const TapeoutAnomalyPage = lazy(() => import('../../tapeout/pages.tsx').then((module) => ({ default: module.TapeoutAnomalyPage })))
const TapeoutDataPage = lazy(() => import('../../tapeout/pages.tsx').then((module) => ({ default: module.TapeoutDataPage })))
const TapeoutAccountPage = lazy(() => import('../../tapeout/pages.tsx').then((module) => ({ default: module.TapeoutAccountPage })))
const TapeoutNotificationsPage = lazy(() => import('../../tapeout/pages.tsx').then((module) => ({ default: module.TapeoutNotificationsPage })))

function RouteLoadingState() {
  return (
    <div role="status" aria-label="页面加载中" className="grid min-h-52 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] text-sm text-[var(--text-muted)]">
      加载中
    </div>
  )
}

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoadingState />}>{children}</Suspense>
}

function NotFoundRoute() {
  return <section aria-labelledby="not-found-title"><h1 id="not-found-title">Not Found</h1><p>此路径不属于 Likely Crypto。</p></section>
}

function PreservedRedirect({ from, to }: { from?: string; to: string }) {
  const location = useLocation()
  const suffix = from ? location.pathname.slice(from.length) : ''
  const pathname = to === '/' ? '/' : `${to}${suffix}`
  return <Navigate replace to={`${pathname}${location.search}${location.hash}`} />
}

function ProductRouteAnalytics() {
  return null
}

export function CryptoRouter() {
  return (
    <><ProductRouteAnalytics /><Routes>
      <Route element={<CryptoShell />}>
        <Route path="/" element={<LazyRoute><TapeoutDiscoveryPage /></LazyRoute>} />
        <Route path="/market" element={<LazyRoute><TapeoutMarketPage /></LazyRoute>} />
        <Route path="/data" element={<LazyRoute><TapeoutDataPage /></LazyRoute>} />
        <Route path="/anomaly/*" element={<LazyRoute><TapeoutAnomalyPage /></LazyRoute>} />
        <Route path="/radar/:contract" element={<LazyRoute><TapeoutRadarPage /></LazyRoute>} />
        <Route path="/radar" element={<LazyRoute><TapeoutRadarPage /></LazyRoute>} />
        <Route path="/alpha/wallet-radar/*" element={<PreservedRedirect from="/alpha/wallet-radar" to="/radar" />} />
        <Route path="/alpha/*" element={<LazyRoute><TapeoutAlphaPage /></LazyRoute>} />
        <Route path="/account" element={<LazyRoute><TapeoutAccountPage /></LazyRoute>} />
        <Route path="/notifications/:notificationId" element={<LazyRoute><TapeoutNotificationsPage /></LazyRoute>} />
        <Route path="/notifications" element={<LazyRoute><TapeoutNotificationsPage /></LazyRoute>} />
      </Route>
      <Route path="/crypto/anomaly/*" element={<PreservedRedirect from="/crypto/anomaly" to="/anomaly" />} />
      <Route path="/crypto/alpha/wallet-radar/*" element={<PreservedRedirect from="/crypto/alpha/wallet-radar" to="/radar" />} />
      <Route path="/crypto/alpha/*" element={<PreservedRedirect from="/crypto/alpha" to="/alpha" />} />
      <Route path="/crypto/overview" element={<PreservedRedirect to="/" />} />
      <Route path="/crypto" element={<PreservedRedirect to="/" />} />
      <Route path="/crypto/*" element={<PreservedRedirect to="/" />} />
      <Route path="/grid/*" element={<Navigate to="/" replace />} />
      <Route path="/orders/*" element={<Navigate to="/" replace />} />
      <Route path="/a/*" element={<NotFoundRoute />} />
      <Route path="*" element={<PreservedRedirect to="/" />} />
    </Routes></>
  )
}
