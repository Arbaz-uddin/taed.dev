'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSelector } from '@/components/language-selector'
import { useLanguage } from '@/lib/language-context'
import { UserMenu } from '@/components/user-menu'
import { Menu, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useLanguage()

  const navLinks = [
    { href: '/', label: 'Features' },
    { href: '/library', label: 'API Library' },
    { href: '/app', label: t.nav.dashboard },
    { href: '/contact', label: 'Enterprise' },
  ]

  // Prefetch all nav routes on mount for instant navigation
  useEffect(() => {
    navLinks.forEach(link => {
      router.prefetch(link.href)
    })
    // Also prefetch auth routes
    router.prefetch('/auth/login')
    router.prefetch('/auth/sign-up')
  }, [router])

  // Prefetch on hover for even faster navigation
  const handleMouseEnter = useCallback((href: string) => {
    router.prefetch(href)
  }, [router])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo-dark.png"
            alt="TAED"
            width={120}
            height={40}
            className="hidden h-8 sm:h-10 dark:block"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
          <Image
            src="/logo-light.png"
            alt="TAED"
            width={120}
            height={40}
            className="h-8 sm:h-10 dark:hidden"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onMouseEnter={() => handleMouseEnter(link.href)}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Controls & CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSelector />
          <ThemeToggle />
          <div className="ml-2">
            <UserMenu loginLabel={t.nav.login} getStartedLabel={t.nav.getStarted} />
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSelector />
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors hover:bg-secondary ${
                  pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t border-border">
              <UserMenu loginLabel={t.nav.login} getStartedLabel={t.nav.getStarted} />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
