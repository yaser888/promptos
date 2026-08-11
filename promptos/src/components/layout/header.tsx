'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { NAV_LINKS } from '@/lib/constants'
import { Button } from '@/components/ui'
import { Menu, X, ChevronDown, Globe, Sparkles, LogIn, User } from 'lucide-react'

export function Header() {
  const t = useTranslations()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-black/80 backdrop-blur-xl border-b border-zinc-800/50'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center group-hover:bg-emerald-400 transition-colors">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">PromptOS</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-all"
              >
                <Globe className="w-5 h-5" />
              </button>
              {isLangOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsLangOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20">
                    {[
                      { code: 'en', label: 'English' },
                      { code: 'ar', label: 'العربية' },
                      { code: 'tr', label: 'Türkçe' },
                      { code: 'fr', label: 'Français' },
                      { code: 'de', label: 'Deutsch' },
                      { code: 'es', label: 'Español' },
                      { code: 'ru', label: 'Русский' },
                      { code: 'ja', label: '日本語' },
                      { code: 'ko', label: '한국어' },
                      { code: 'zh', label: '中文' },
                    ].map((lang) => (
                      <Link
                        key={lang.code}
                        href={`/${lang.code}`}
                        className="block px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                      >
                        {lang.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            <Link href="/sign-in">
              <Button variant="ghost" size="sm" icon={<LogIn className="w-4 h-4" />}>
                {t('nav.signIn')}
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" icon={<User className="w-4 h-4" />}>
                {t('nav.signUp')}
              </Button>
            </Link>
          </div>

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-all"
          >
            {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMobileOpen && (
        <div className="md:hidden border-t border-zinc-800/50 bg-black/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'block px-4 py-3 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
            <hr className="border-zinc-800 my-3" />
            <Link href="/sign-in" className="block px-4 py-3 text-sm text-zinc-400 hover:text-zinc-100">
              {t('nav.signIn')}
            </Link>
            <Link href="/sign-up">
              <Button fullWidth size="lg" className="mt-2">
                {t('nav.signUp')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
