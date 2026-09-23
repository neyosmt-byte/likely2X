import type { ReactNode } from 'react'

import { cn } from '../../lib/cn.ts'
import { Button } from './button.tsx'

export type SegmentedControlOption<TValue extends string> = {
  disabled?: boolean
  label: ReactNode
  title?: string
  value: TValue
}

export type SegmentedControlProps<TValue extends string> = {
  ariaLabel: string
  className?: string
  onValueChange: (value: TValue) => void
  options: Array<SegmentedControlOption<TValue>>
  size?: 'default' | 'sm'
  value: TValue
}

export function SegmentedControl<TValue extends string>({
  ariaLabel,
  className,
  onValueChange,
  options,
  size = 'sm',
  value,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('inline-flex max-w-full gap-1 overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value

        return (
          <Button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={option.disabled}
            size={size}
            title={option.title}
            variant={active ? 'default' : 'ghost'}
            className={cn('shrink-0 px-3', active ? 'text-black' : 'text-[var(--text-muted)]')}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
