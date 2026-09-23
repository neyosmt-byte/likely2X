import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import type { ComponentProps } from 'react'

import { cn } from '../../lib/cn.ts'

export function ScrollArea({ children, className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root className={cn('relative overflow-hidden', className)} {...props}>
      <ScrollAreaPrimitive.Viewport className="size-full">{children}</ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar orientation="vertical" className="flex w-2.5 touch-none select-none p-0.5">
        <ScrollAreaPrimitive.Thumb className="flex-1 rounded-full bg-[var(--border-strong)]" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  )
}
