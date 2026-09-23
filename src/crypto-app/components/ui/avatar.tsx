import * as AvatarPrimitive from '@radix-ui/react-avatar'
import type { ComponentProps } from 'react'

import { cn } from '../../lib/cn.ts'

export const Avatar = ({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Root>) => <AvatarPrimitive.Root className={cn('relative flex size-9 shrink-0 overflow-hidden rounded-full border border-[var(--border-strong)]', className)} {...props} />
export const AvatarImage = ({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Image>) => <AvatarPrimitive.Image className={cn('size-full object-cover', className)} {...props} />
export const AvatarFallback = ({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Fallback>) => <AvatarPrimitive.Fallback className={cn('flex size-full items-center justify-center bg-[var(--surface-3)] font-mono text-xs font-bold text-[var(--text)]', className)} {...props} />
