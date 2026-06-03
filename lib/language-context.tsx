'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Import all translations
import en from '@/messages/en.json'
import fr from '@/messages/fr.json'
import de from '@/messages/de.json'
import es from '@/messages/es.json'

export type Locale = 'en' | 'fr' | 'de' | 'es'

const messages: Record<Locale, typeof en> = { en, fr, de, es }

export const languages: { code: Locale; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
]

type LanguageContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: typeof en
}

// Default context value for SSR
const defaultContext: LanguageContextType = {
  locale: 'en',
  setLocale: () => {},
  t: en,
}

const LanguageContext = createContext<LanguageContextType>(defaultContext)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('taed-locale') as Locale | null
    if (saved && messages[saved]) {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('taed-locale', newLocale)
  }

  const t = messages[locale]

  const value = {
    locale,
    setLocale,
    t,
  }

  // During SSR or before mount, provide default English translations
  // to avoid hydration mismatch
  if (!mounted) {
    return (
      <LanguageContext.Provider value={defaultContext}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

// Helper hook for getting translations with a default fallback
export function useTranslations() {
  const { t } = useLanguage()
  return t
}
