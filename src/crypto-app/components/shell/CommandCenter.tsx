import { Link } from 'react-router-dom'

import { Command, CommandGroup, CommandInput, CommandItem, CommandList, Dialog, DialogContent, DialogTitle } from '../ui/index.ts'
import { visibleCryptoNavItems } from './nav.ts'

type CommandCenterProps = { onOpenChange: (open: boolean) => void; open: boolean }

const shortcuts = [
  { label: '生态雷达', detail: 'Processor、Circuit、参与地址、Proof-of-Design', href: '/radar' },
  { label: '生态 Alpha', detail: '解释性排序、项目事实、Watchlist', href: '/alpha' },
  { label: '项目与资产', detail: 'IGNIX TapeOut 资产和协议指标', href: '/market' },
  { label: '生态异动', detail: 'Circuit 窗口、容量与题库变化', href: '/anomaly' },
  { label: '数据源健康', detail: 'TapeOut、IGNIX、X Layer 读数', href: '/data' },
]

export function CommandCenter({ onOpenChange, open }: CommandCenterProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent closeLabel="关闭命令中心" className="p-0">
      <DialogTitle className="px-4 pt-4 text-sm font-semibold">TapeOut 命令中心</DialogTitle>
      <Command label="搜索 Processor、Circuit、项目">
        <CommandInput placeholder="搜索 Processor、Circuit、项目" />
        <CommandList>
          <CommandGroup heading="模块">{visibleCryptoNavItems().map((item) => <CommandItem key={item.path} value={item.label} asChild><Link to={item.path} onClick={() => onOpenChange(false)}><item.icon size={16} />{item.label}</Link></CommandItem>)}</CommandGroup>
          <CommandGroup heading="研究入口">{shortcuts.map((item) => <CommandItem key={item.href} value={`${item.label} ${item.detail}`} asChild><Link to={item.href} onClick={() => onOpenChange(false)}><span className="min-w-0"><span className="block truncate text-sm text-[var(--text)]">{item.label}</span><span className="block truncate text-[11px] text-[var(--text-muted)]">{item.detail}</span></span></Link></CommandItem>)}</CommandGroup>
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>
}
