import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '../../lib/cn.ts'

export function Command({ className, label = '搜索币种和功能', ...props }: ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive label={label} className={cn('flex max-h-[min(620px,78vh)] w-full flex-col overflow-hidden bg-[var(--panel)] text-[var(--text)]', className)} {...props} />
}

export function CommandInput({ className, placeholder, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex h-14 items-center gap-3 border-b border-[var(--border)] px-4">
      <Search size={17} className="shrink-0 text-[var(--text-muted)]" />
      <CommandPrimitive.Input aria-label={props['aria-label'] ?? placeholder} placeholder={placeholder} className={cn('h-full w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-[var(--text-muted)]', className)} {...props} />
    </div>
  )
}

export const CommandList = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) => <CommandPrimitive.List className={cn('overflow-y-auto p-2', className)} {...props} />
export const CommandEmpty = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) => <CommandPrimitive.Empty className={cn('px-3 py-10 text-center text-sm text-[var(--text-muted)]', className)} {...props} />
export const CommandGroup = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) => <CommandPrimitive.Group className={cn('p-1 text-xs text-[var(--text-muted)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-semibold', className)} {...props} />
export const CommandItem = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) => <CommandPrimitive.Item className={cn('flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 text-sm text-[var(--text-2)] outline-none data-[selected=true]:bg-[var(--surface-3)] data-[selected=true]:text-[var(--text)]', className)} {...props} />
export const CommandSeparator = ({ className, ...props }: ComponentProps<typeof CommandPrimitive.Separator>) => <CommandPrimitive.Separator className={cn('my-1 h-px bg-[var(--border)]', className)} {...props} />
