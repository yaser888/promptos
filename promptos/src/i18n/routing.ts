import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ar', 'tr', 'fr', 'de', 'es', 'ru', 'ja', 'ko', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})
