import { forwardRef, type TextareaHTMLAttributes } from 'react'

import { cn } from '../../lib/cn.ts'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-24 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--info)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--info)_18%,transparent)] disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
