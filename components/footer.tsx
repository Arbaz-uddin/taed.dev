'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/lib/language-context'
import { UserMenu } from '@/components/user-menu'

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/">
              <Image
                src="/logo-dark.png"
                alt="TAED"
                width={120}
                height={40}
                className="hidden mb-4 dark:block"
              />
              <Image
                src="/logo-light.png"
                alt="TAED"
                width={120}
                height={40}
                className="mb-4 dark:hidden"
              />
            </Link>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              The Vision Layer for Modern Apps. Chain visual logic, define JSON schemas, and deploy production-grade vision engines.
            </p>
            <div className="mt-4">
              <UserMenu loginLabel={t.nav.login} getStartedLabel={t.nav.getStarted} />
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4">{t.footer.product}</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/app" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.nav.dashboard}
                </Link>
              </li>
              <li>
                <Link href="/#features" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.features}
                </Link>
              </li>
              <li>
                <Link href="/#languages" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.documentation}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4">{t.footer.company}</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/contact" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.contact}
                </Link>
              </li>
              <li>
                <Link href="/#about" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.about}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold mb-3 sm:mb-4">{t.footer.legal}</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/privacy" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 border-t border-border pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-muted-foreground text-center md:text-left">
            &copy; {new Date().getFullYear()} TAED. {t.footer.copyright}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Built for high-velocity engineering teams
          </p>
        </div>
      </div>
    </footer>
  )
}
