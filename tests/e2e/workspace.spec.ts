import { expect, test } from '@playwright/test'

const address = '0x1111111111111111111111111111111111111111'
const observedAt = new Date().toISOString()

test.beforeEach(async ({ page }) => {
  await page.route('**/tapeout-api/pod/pod-mainnet.json', (route) => route.fulfill({ json: {
    chainId: 56,
    explorer: 'https://bscscan.com',
    rpc: '/rpc',
    contracts: { factory: address },
    cpus: { TapeOut: { address, multiplier: 2, fromBlock: 100 } },
    circuits: [{ circuitId: 7, owner: address, cpu: 'TapeOut', circuits: address, taskId: 1, mining: true }],
  } }))
  await page.route('**/tapeout-api/pod/pod-stats.json', (route) => route.fulfill({ json: {
    generatedAt: observedAt,
    block: 200,
    chainId: 56,
    minerCount: 4,
    verifMinerCount: 3,
    totalMined: '1000',
    taskCount: 1,
    currentRate: '20',
    events: Array.from({ length: 5 }, (_, index) => ({ block: 196 + index, circuitId: index + 1, author: address, cpu: 'TapeOut', circuits: address, gates: 4, nState: 0 })),
  } }))
  await page.route('**/tapeout-api/pod/pod-taskbank.json', (route) => route.fulfill({ json: { meta: { onchain: 1, total: 1, comb: 1, seq: 0 }, tasks: [{ id: 1, name: 'AND', kind: 'comb', onchain: true, refGates: 4, refDepth: 2, runGas: 56000 }] } }))
  await page.route('**/tapeout-api/pod/pod-miners.json', (route) => route.fulfill({ json: { block: 200, count: 1, owners: { [address]: [{ cpu: 'TapeOut', circuits: address, circuitId: 7, taskId: 1, block: 200 }] } } }))
  await page.route('https://api.ignix.bot/**', async (route) => {
    const url = route.request().url()
    const data = url.endsWith('/v1/campaigns/current')
      ? { campaign: { id: 'index-1' } }
      : url.includes('/leaderboards/mcap')
        ? { snapshot: { createdAt: observedAt }, rows: [{ rank: 1, subject: address, tokenType: 'tapeout', metricUsd: 100, liquidityUsd: 50, graduated: false, token: { name: 'TapeOut One', symbol: 'T1' } }] }
        : { launches: [] }
    await route.fulfill({ json: { code: 200, data } })
  })
  await page.route('https://rpc.xlayer.tech/**', async (route) => {
    const method = route.request().postDataJSON().method
    await route.fulfill({ json: { jsonrpc: '2.0', id: 1, result: method === 'eth_chainId' ? '0xc4' : '0x100' } })
  })
})

test('all product sections render their own work surface', async ({ page }) => {
  const routes = [
    ['/', '发现总览'],
    ['/radar', '生态雷达'],
    ['/market', '项目与资产'],
    ['/anomaly', '生态异动'],
    ['/alpha', '生态 Alpha'],
    ['/data', '数据同步'],
    ['/notifications', '通知收件箱'],
    ['/account', '我的空间'],
  ]
  for (const [path, title] of routes) {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText(title)
  }
  await expect(page.getByRole('navigation', { name: 'Crypto 主导航' }).getByText('项目与资产')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Crypto 主导航' }).getByText('网格')).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Crypto 主导航' }).getByText('订单')).toHaveCount(0)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /TapeOut 与 X Layer 生态/)
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /hackathon|参赛/i)
})

test('watchlist survives route navigation in the browser workspace', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '关注' }).first().click()
  await page.goto('/account')
  await expect(page.getByText('processor:TapeOut')).toBeVisible()
})

test('workspace fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/radar')
  await expect(page.locator('h1')).toHaveText('生态雷达')
  await expect(page.getByText('TapeOut', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('navigation', { name: '移动主导航' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
