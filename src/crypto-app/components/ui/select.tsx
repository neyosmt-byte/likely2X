import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '../../lib/cn.ts'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({ children, className, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger className={cn('flex h-9 w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--info)]', className)} {...props}>
      {children}
      <SelectPrimitive.Icon><ChevronDown size={14} /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({ children, className, ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className={cn('z-[80] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] p-1 shadow-2xl', className)} {...props}>
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({ children, className, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn('relative flex min-h-9 cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm text-[var(--text-2)] outline-none focus:bg-[var(--surface-3)] focus:text-[var(--text)]', className)} {...props}>
      <span className="absolute left-2"><SelectPrimitive.ItemIndicator><Check size={14} /></SelectPrimitive.ItemIndicator></span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}
