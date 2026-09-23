import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '../../lib/cn.ts'

export const buttonVariants = cva(
  'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2.5 text-xs',
        lg: 'h-10 px-4',
        icon: 'size-9 p-0',
      },
      variant: {
        default: 'border-transparent bg-[var(--accent)] text-black hover:bg-[var(--accent-strong)]',
        secondary: 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--border-strong)]',
        outline: 'border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]',
        ghost: 'border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
        danger: 'border-transparent bg-[var(--danger)] text-white hover:brightness-110',
      },
    },
    defaultVariants: { size: 'default', variant: 'default' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({ asChild, className, size, variant, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ className, size, variant }))} {...props} />
}
