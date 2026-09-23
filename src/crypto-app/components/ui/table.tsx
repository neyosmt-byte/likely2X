import { forwardRef, type HTMLAttributes, type TableHTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react'

import { cn } from '../../lib/cn.ts'

export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(({ className, ...props }, ref) => <div className="min-w-0 max-w-full overflow-auto [contain:layout_inline-size]"><table ref={ref} className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} /></div>)
Table.displayName = 'Table'
export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => <thead ref={ref} className={cn('border-b border-[var(--border)]', className)} {...props} />)
TableHeader.displayName = 'TableHeader'
export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(({ className, ...props }, ref) => <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />)
TableBody.displayName = 'TableBody'
export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => <tr ref={ref} className={cn('group/table-row border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]', className)} {...props} />)
TableRow.displayName = 'TableRow'

type Pin = 'left' | 'right'
type PinnedHeadProps = ThHTMLAttributes<HTMLTableCellElement> & { pin?: Pin }
type PinnedCellProps = TdHTMLAttributes<HTMLTableCellElement> & { pin?: Pin }

const pinnedBase = 'sticky z-20 min-w-[160px] bg-[var(--surface-1)] group-hover/table-row:bg-[var(--surface-2)]'

export const TableHead = forwardRef<HTMLTableCellElement, PinnedHeadProps>(({ className, pin, ...props }, ref) => <th ref={ref} className={cn('h-10 px-3 text-left text-xs font-semibold uppercase text-[var(--text-muted)]', pin && pinnedBase, pin && 'z-30 group-hover/table-row:bg-[var(--surface-1)]', pin === 'left' && 'left-0 shadow-[6px_0_8px_-8px_rgba(0,0,0,0.8)]', pin === 'right' && 'right-0 text-right shadow-[-6px_0_8px_-8px_rgba(0,0,0,0.8)]', className)} {...props} />)
TableHead.displayName = 'TableHead'
export const TableCell = forwardRef<HTMLTableCellElement, PinnedCellProps>(({ className, pin, ...props }, ref) => <td ref={ref} className={cn('px-3 py-2.5 align-middle text-[var(--text-2)]', pin && pinnedBase, pin === 'left' && 'left-0 shadow-[6px_0_8px_-8px_rgba(0,0,0,0.8)]', pin === 'right' && 'right-0 text-right shadow-[-6px_0_8px_-8px_rgba(0,0,0,0.8)]', className)} {...props} />)
TableCell.displayName = 'TableCell'
