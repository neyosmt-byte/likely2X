import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ComponentProps } from 'react'

import { cn } from '../../lib/cn.ts'

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content sideOffset={sideOffset} className={cn('z-[80] rounded-md border border-[var(--border-strong)] bg-[var(--surface-3)] px-2 py-1 text-xs text-[var(--text)] shadow-lg', className)} {...props} />
    </TooltipPrimitive.Portal>
  )
}
