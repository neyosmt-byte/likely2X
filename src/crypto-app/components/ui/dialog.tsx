import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '../../lib/cn.ts'

export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  closeLabel?: string
}

export function DialogContent({ children, className, closeLabel = '关闭', ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <DialogPrimitive.Content className={cn('fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-24px)] w-[min(680px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-lg border border-[var(--border-strong)] bg-[var(--panel)] p-4 shadow-2xl outline-none', className)} {...props}>
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
