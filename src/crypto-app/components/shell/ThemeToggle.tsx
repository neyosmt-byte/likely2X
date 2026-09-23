import { Moon } from 'lucide-react'

import { useCryptoTheme } from '../../app/theme.tsx'
import { Button, type ButtonProps } from '../ui/index.ts'

type ThemeToggleProps = {
  className?: string
  showLabel?: boolean
}

const THEME_TOGGLE_LABEL = '深色模式'

function themeToggleTitle(isDark: boolean) {
  return isDark ? '深色模式已开启，点击切换为浅色模式' : '深色模式已关闭，点击切换为深色模式'
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useCryptoTheme()
  const isDark = theme === 'dark'
  const title = themeToggleTitle(isDark)
  const size: ButtonProps['size'] = showLabel ? undefined : 'icon'
  const variant: ButtonProps['variant'] = showLabel || isDark ? 'secondary' : 'ghost'

  return (
    <Button
      aria-label={THEME_TOGGLE_LABEL}
      aria-pressed={isDark}
      className={className}
      size={size}
      title={title}
      type="button"
      variant={variant}
      onClick={toggleTheme}
    >
      <Moon size={showLabel ? 15 : 17} aria-hidden="true" />
      {showLabel ? THEME_TOGGLE_LABEL : null}
    </Button>
  )
}
