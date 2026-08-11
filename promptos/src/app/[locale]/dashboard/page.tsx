'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  FileText, Heart, Eye, Copy, Zap, TrendingUp, Clock, Settings,
  FolderOpen, Sparkles, ChevronRight, Plus, BarChart3, Users
} from 'lucide-react'
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'

const STATS = [
  { label: 'totalPrompts', value: '47', icon: FileText, change: '+12 this week' },
  { label: 'totalViews', value: '12,847', icon: Eye, change: '+23% vs last month' },
  { label: 'totalCopies', value: '3,291', icon: Copy, change: '+18% vs last month' },
  { label: 'credits', value: '85', icon: Zap, change: 'Resets in 12h', color: 'text-amber-400' },
]

const RECENT_PROMPTS = [
  { title: 'Advanced Email Marketing Copy', platform: 'ChatGPT', updated: '2 hours ago', views: 342, copies: 89 },
  { title: 'Code Review Expert System', platform: 'Claude', updated: '5 hours ago', views: 156, copies: 45 },
  { title: 'Socratic Tutor Framework', platform: 'Gemini', updated: '1 day ago', views: 892, copies: 234 },
  { title: 'Creative Story World Builder', platform: 'ChatGPT', updated: '2 days ago', views: 445, copies: 123 },
  { title: 'Data Analysis Report Generator', platform: 'Grok', updated: '3 days ago', views: 678, copies: 167 },
]

export default function DashboardPage() {
  const t = useTranslations()

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {t('dashboard.title')}
            </h1>
            <p className="text-zinc-400">Welcome back, Alex 👋</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" icon={<Settings className="w-4 h-4" />}>
              {t('dashboard.settings')}
            </Button>
            <Button size="sm" icon={<Plus className="w-4 h-4" />}>
              New Prompt
            </Button>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card variant="glass" hover>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-zinc-800/50 rounded-xl flex items-center justify-center">
                    <stat.icon className={`w-5 h-5 ${stat.color || 'text-emerald-400'}`} />
                  </div>
                  <span className="text-xs text-zinc-600">{stat.change}</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-zinc-500">{t(`dashboard.${stat.label}`)}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card variant="glass">
              <CardHeader>
                <CardTitle>{t('dashboard.recentPrompts')}</CardTitle>
                <Button variant="ghost" size="sm">
                  {t('common.viewAll')}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {RECENT_PROMPTS.map((prompt, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-zinc-800/50 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                            {prompt.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-zinc-600">
                            <Badge size="sm">{prompt.platform}</Badge>
                            <span>{prompt.updated}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500 shrink-0">
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{prompt.views}</span>
                        <span className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" />{prompt.copies}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle>{t('dashboard.collections')}</CardTitle>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: 'Writing', count: 12, color: 'emerald' },
                    { name: 'Development', count: 8, color: 'blue' },
                    { name: 'Marketing', count: 6, color: 'amber' },
                    { name: 'Creative', count: 4, color: 'purple' },
                  ].map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className={`w-4 h-4 text-${col.color}-400`} />
                        <span className="text-sm text-zinc-300">{col.name}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{col.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card variant="glass" className="bg-gradient-to-br from-emerald-500/5 to-transparent">
              <CardContent className="text-center py-6">
                <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Go Pro</h3>
                <p className="text-sm text-zinc-400 mb-4">
                  {t('dashboard.upgradePrompt')}
                </p>
                <Button size="sm">
                  Upgrade Now
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
