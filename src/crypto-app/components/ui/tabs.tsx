import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'

import { cn } from '../../lib/cn.ts'

export const Tabs = TabsPrimitive.Root
export const TabsList = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List className={cn('inline-flex min-h-9 items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-1', className)} {...props} />
)
export const TabsTrigger = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn('min-h-7 rounded px-3 text-xs font-semibold text-[var(--text-muted)] outline-none data-[state=active]:bg-[var(--surface-3)] data-[state=active]:text-[var(--text)]', className)}
    {...props}
  />
)
export const TabsContent = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) => <TabsPrimitive.Content className={cn('mt-3 outline-none', className)} {...props} />
