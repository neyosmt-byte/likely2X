import { useCryptoTheme } from '../../app/theme.tsx'
import { cn } from '../../lib/cn.ts'

type BrandLogoProps = {
  className?: string
  variant?: 'icon' | 'wordmark'
}

export function BrandLogo({ className, variant = 'wordmark' }: BrandLogoProps) {
  const { theme } = useCryptoTheme()
  const version = 'likely-green-brand-20260729'
  const src = variant === 'icon'
    ? `/likely_icon.png?v=${version}`
    : theme === 'light'
      ? `/Likely_logo_light.png?v=${version}`
      : `/Likely_logo.png?v=${version}`

  return (
    <img
      alt="Likely"
      className={cn(variant === 'icon' ? 'size-8 object-contain' : 'h-7 w-auto object-contain', className)}
      draggable={false}
      src={src}
    />
  )
}
