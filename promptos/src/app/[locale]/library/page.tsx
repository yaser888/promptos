'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Search, Copy, Check, Heart, Share2, SlidersHorizontal, Grid3X3, List, ChevronDown, Clock, TrendingUp, CopyCheck } from 'lucide-react'
import { Button, Input, Badge, Card } from '@/components/ui'

const MOCK_PROMPTS = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  title: [
    'Advanced Email Marketing Copy Generator',
    'Socratic Tutor for Complex Topics',
    'Code Review Expert Assistant',
    'Creative Story World Builder',
    'Data Analysis Report Generator',
    'SEO Content Strategy Planner',
    'API Documentation Writer',
    'UX Research Interview Script',
    'Machine Learning Model Explainer',
    'Customer Support Response Template',
    'Social Media Content Calendar',
    'Technical Architecture Documenter',
    'Brand Voice Consistency Checker',
    'A/B Testing Hypothesis Generator',
    'Product Requirements Document Writer',
    'Grant Proposal Writing Assistant',
    'Meeting Notes Summarizer',
    'Competitive Analysis Framework',
    'User Story Mapping Guide',
    'Database Schema Designer',
    'API Integration Tester',
    'Accessibility Audit Checklist',
    'Performance Review Template',
    'Sprint Retrospective Facilitator',
  ][i],
  description: 'A comprehensive prompt designed to generate high-quality outputs across multiple use cases.',
  category: ['Writing', 'Education', 'Development', 'Creative', 'Data', 'Marketing', 'Development', 'Design', 'AI', 'Support', 'Marketing', 'Development', 'Branding', 'Marketing', 'Product', 'Writing', 'Productivity', 'Business', 'Product', 'Development', 'Development', 'Design', 'HR', 'Management'][i],
  platform: ['ChatGPT', 'Claude', 'Gemini', 'ChatGPT', 'Claude', 'ChatGPT', 'Gemini', 'Claude', 'ChatGPT', 'Grok', 'ChatGPT', 'Claude', 'Gemini', 'ChatGPT', 'Grok', 'Claude', 'ChatGPT', 'Gemini', 'Claude', 'ChatGPT', 'Gemini', 'Claude', 'ChatGPT', 'Grok'][i],
  copies: Math.floor(Math.random() * 5000),
  favorites: Math.floor(Math.random() * 1000),
  tags: ['prompt-engineering', 'ai', 'template', 'advanced'],
}))

const CATEGORIES = [
  'All',
  'Writing',
  'Education',
  'Development',
  'Creative',
  'Data',
  'Marketing',
  'Design',
  'Product',
  'Business',
  'Productivity',
  'Management',
  'Support',
  'Branding',
  'HR',
  'AI',
]

const PLATFORM_FILTERS = [
  'All',
  'ChatGPT',
  'Claude',
  'Gemini',
  'Grok',
  'Perplexity',
  'Midjourney',
]

export default function LibraryPage() {
  const t = useTranslations()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedPlatform, setSelectedPlatform] = useState('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('popular')
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const filteredPrompts = MOCK_PROMPTS.filter((prompt) => {
    const matchesSearch = prompt.title.toLowerCase().includes(search.toLowerCase()) ||
      prompt.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory
    const matchesPlatform = selectedPlatform === 'All' || prompt.platform === selectedPlatform
    return matchesSearch && matchesCategory && matchesPlatform
  })

  const handleCopy = (id: number) => {
    navigator.clipboard.writeText(`Prompt ${id}: ${MOCK_PROMPTS[id - 1].title}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/3 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {t('library.title')}
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            {t('library.subtitle')}
          </p>
        </motion.div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('library.search')}
                className="w-full pl-12 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 text-sm appearance-none cursor-pointer pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="popular">{t('library.popular')}</option>
                  <option value="newest">{t('library.newest')}</option>
                  <option value="copied">{t('library.mostCopied')}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
              <div className="flex bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {PLATFORM_FILTERS.map((pf) => (
              <button
                key={pf}
                onClick={() => setSelectedPlatform(pf)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedPlatform === pf
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {pf}
              </button>
            ))}
          </div>

          {filteredPrompts.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 text-lg">{t('library.noResults')}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPrompts.map((prompt) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (prompt.id % 12) * 0.03 }}
                >
                  <Card variant="glass" hover className="h-full flex flex-col group cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="primary" size="sm">{prompt.platform}</Badge>
                      <Badge size="sm">{prompt.category}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                      {prompt.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mb-4 line-clamp-2 flex-1">
                      {prompt.description}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <CopyCheck className="w-3.5 h-3.5" />
                          {prompt.copies}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" />
                          {prompt.favorites}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(prompt.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-all"
                        >
                          {copiedId === prompt.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all">
                          <Heart className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPrompts.map((prompt) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card variant="glass" hover className="flex items-center gap-4 py-4 cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {prompt.title}
                        </h3>
                        <Badge variant="primary" size="sm">{prompt.platform}</Badge>
                        <Badge size="sm">{prompt.category}</Badge>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{prompt.description}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 shrink-0">
                      <span className="flex items-center gap-1"><CopyCheck className="w-3.5 h-3.5" />{prompt.copies}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{prompt.favorites}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => handleCopy(prompt.id)} className="p-2 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-all">
                        {copiedId === prompt.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all">
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
