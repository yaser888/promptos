'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Search, Star, ShoppingCart, Download, Copy, ChevronDown, Filter, TrendingUp, Clock, DollarSign } from 'lucide-react'
import { Button, Badge, Card } from '@/components/ui'

const MOCK_LISTINGS = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: [
    'Ultimate SEO Content System',
    'Advanced Code Generator Pro',
    'Creative Writing Master Suite',
    'Data Analysis Power Pack',
    'Email Marketing Engine',
    'API Builder Assistant',
    'UX Research Toolkit',
    'Brand Voice System',
    'Academic Research Helper',
    'Social Media Command Center',
    'Product Launch Kit',
    'Customer Support AI',
  ][i],
  description: 'Professional-grade prompt system for generating consistent, high-quality outputs.',
  author: ['Alex Chen', 'Sarah Miller', 'James Wilson', 'Maria Garcia', 'David Kim', 'Lisa Brown', 'Tom Anderson', 'Emma Davis', 'Ryan Taylor', 'Sophie Martin', 'Kevin Lee', 'Anna White'][i],
  rating: (4 + Math.random()).toFixed(1),
  reviews: Math.floor(Math.random() * 200) + 10,
  downloads: Math.floor(Math.random() * 5000) + 100,
  price: i < 3 ? 0 : [4.99, 9.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 7.99][i % 9],
  platform: ['ChatGPT', 'Claude', 'Gemini', 'ChatGPT', 'Grok', 'Claude', 'ChatGPT', 'Gemini', 'Claude', 'ChatGPT', 'Gemini', 'Grok'][i],
  tags: ['premium', 'top-rated', 'best-seller', 'new', 'featured', 'trending'],
}))

export default function MarketplacePage() {
  const t = useTranslations()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('trending')

  const filtered = MOCK_LISTINGS.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.author.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/3 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4"
        >
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
              {t('marketplace.title')}
            </h1>
            <p className="text-lg text-zinc-400">
              {t('marketplace.subtitle')}
            </p>
          </div>
          <Button size="lg" icon={<ShoppingCart className="w-5 h-5" />}>
            {t('marketplace.sell')}
          </Button>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('marketplace.search')}
              className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 text-sm appearance-none cursor-pointer pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="trending">Trending</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg">{t('marketplace.noResults')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (item.id % 12) * 0.05 }}
              >
                <Card variant="glass" hover className="h-full flex flex-col group cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="primary" size="sm">{item.platform}</Badge>
                    <div className="flex items-center gap-1 text-xs text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{item.rating}</span>
                      <span className="text-zinc-600">({item.reviews})</span>
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-500 mb-3 line-clamp-2 flex-1">
                    {item.description}
                  </p>
                  <p className="text-xs text-zinc-600 mb-4">
                    by <span className="text-zinc-400">{item.author}</span>
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        {item.downloads}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.price === 0 ? (
                        <Badge variant="success" size="sm">{t('marketplace.free')}</Badge>
                      ) : (
                        <span className="text-sm font-bold text-white">${item.price}</span>
                      )}
                      <button className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100">
                        <ShoppingCart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
