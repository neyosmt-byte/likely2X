import { forwardRef, type InputHTMLAttributes } from 'react'

import { cn } from '../../lib/cn.ts'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--info)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--info)_18%,transparent)]', className)} {...props} />
))
Input.displayName = 'Input'
