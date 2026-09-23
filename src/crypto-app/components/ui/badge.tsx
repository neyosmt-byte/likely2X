import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/cn.ts'

const badgeVariants = cva('inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-[11px] font-semibold uppercase leading-none', {
  variants: {
    tone: {
      neutral: 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]',
      positive: 'border-[color-mix(in_srgb,var(--positive)_40%,transparent)] bg-[color-mix(in_srgb,var(--positive)_12%,transparent)] text-[var(--positive)]',
      danger: 'border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]',
      warning: 'border-[color-mix(in_srgb,var(--warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]',
      info: 'border-[color-mix(in_srgb,var(--info)_40%,transparent)] bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info)]',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ className, tone }))} {...props} />
}
