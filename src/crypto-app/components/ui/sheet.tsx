import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '../../lib/cn.ts'

export function Sheet(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root modal={false} {...props} />
}
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close
export const SheetTitle = DialogPrimitive.Title
export const SheetDescription = DialogPrimitive.Description

type SheetContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  closeLabel?: string
}

export function SheetContent({ children, className, closeLabel = '关闭', ...props }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/65" />
      <DialogPrimitive.Content className={cn('fixed inset-y-0 right-0 z-50 w-[calc(100vw-18px)] max-w-[520px] overflow-y-auto border-l border-[var(--border-strong)] bg-[var(--panel)] p-4 shadow-2xl outline-none', className)} {...props}>
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          aria-label={closeLabel}
          title={closeLabel}
        >
          <X size={16} aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
