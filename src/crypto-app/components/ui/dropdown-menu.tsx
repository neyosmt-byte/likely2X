import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { ComponentProps } from 'react'

import { cn } from '../../lib/cn.ts'

export function DropdownMenu(props: ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root modal={false} {...props} />
}
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuSub = DropdownMenuPrimitive.Sub
export const DropdownMenuLabel = ({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Label>) => <DropdownMenuPrimitive.Label className={cn('px-2 py-1.5 text-xs font-semibold text-[var(--text-muted)]', className)} {...props} />
export const DropdownMenuSeparator = ({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Separator>) => <DropdownMenuPrimitive.Separator className={cn('my-1 h-px bg-[var(--border)]', className)} {...props} />
export const DropdownMenuItem = ({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Item>) => <DropdownMenuPrimitive.Item className={cn('flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-[var(--text-2)] outline-none focus:bg-[var(--surface-3)] focus:text-[var(--text)]', className)} {...props} />
export const DropdownMenuSubTrigger = ({ className, ...props }: ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) => <DropdownMenuPrimitive.SubTrigger className={cn('flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-[var(--text-2)] outline-none focus:bg-[var(--surface-3)] focus:text-[var(--text)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props} />

export function DropdownMenuContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content sideOffset={sideOffset} className={cn('z-[70] min-w-56 rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] p-1.5 shadow-2xl', className)} {...props} />
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuSubContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent sideOffset={sideOffset} className={cn('z-[70] min-w-56 rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] p-1.5 shadow-2xl', className)} {...props} />
    </DropdownMenuPrimitive.Portal>
  )
}
