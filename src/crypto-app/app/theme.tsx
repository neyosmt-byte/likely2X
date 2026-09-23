import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

export type CryptoTheme = 'dark' | 'light'

type CryptoThemeContextValue = {
  setTheme: (theme: CryptoTheme) => void
  theme: CryptoTheme
  toggleTheme: () => void
}

export const CRYPTO_THEME_STORAGE_KEY = 'likely-crypto:theme'
const CryptoThemeContext = createContext<CryptoThemeContextValue | null>(null)

function isTheme(value: string | null): value is CryptoTheme {
  return value === 'dark' || value === 'light'
}

function initialTheme(): CryptoTheme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(CRYPTO_THEME_STORAGE_KEY)
  return isTheme(stored) ? stored : 'dark'
}

export function CryptoThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<CryptoTheme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem(CRYPTO_THEME_STORAGE_KEY, theme)
  }, [theme])

  const value = useMemo<CryptoThemeContextValue>(() => ({
    setTheme,
    theme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  }), [theme])

  return <CryptoThemeContext.Provider value={value}>{children}</CryptoThemeContext.Provider>
}

export function useCryptoTheme() {
  const context = useContext(CryptoThemeContext)
  if (!context) throw new Error('useCryptoTheme must be used within CryptoThemeProvider')
  return context
}

export function useOptionalCryptoTheme() {
  return useContext(CryptoThemeContext)
}
