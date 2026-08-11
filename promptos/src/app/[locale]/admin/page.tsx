'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  Users, FileText, CreditCard, TrendingUp, Activity, Settings,
  Database, Download, Upload, Search, Shield, BarChart3, RefreshCw,
  GitBranch, Link, Plus, MoreVertical, Check, X
} from 'lucide-react'
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui'

const ADMIN_STATS = [
  { label: 'totalUsers', value: '12,847', icon: Users, change: '+156 today', color: 'text-blue-400' },
  { label: 'totalPrompts', value: '48,291', icon: FileText, change: '+892 this week', color: 'text-emerald-400' },
  { label: 'activeSubscriptions', value: '3,421', icon: CreditCard, change: '27% conversion', color: 'text-amber-400' },
  { label: 'revenue', value: '$84,291', icon: TrendingUp, change: '+12.5% vs last month', color: 'text-emerald-400' },
]

const RECENT_USERS = [
  { name: 'Alex Johnson', email: 'alex@example.com', plan: 'Pro', status: 'Active', date: '2 min ago' },
  { name: 'Sarah Williams', email: 'sarah@example.com', plan: 'Free', status: 'Active', date: '15 min ago' },
  { name: 'Michael Brown', email: 'michael@example.com', plan: 'Team', status: 'Active', date: '1 hour ago' },
  { name: 'Emily Davis', email: 'emily@example.com', plan: 'Pro', status: 'Trialing', date: '3 hours ago' },
  { name: 'James Wilson', email: 'james@example.com', plan: 'Free', status: 'Inactive', date: '1 day ago' },
]

const SOURCES = [
  { name: 'GitHub - prompt-engineer', type: 'GitHub', status: 'Active', lastSync: '2 hours ago', items: 1247 },
  { name: 'Community CSV Import', type: 'CSV', status: 'Active', lastSync: '1 day ago', items: 3456 },
  { name: 'Awesome Prompts JSON', type: 'JSON', status: 'Active', lastSync: '3 days ago', items: 892 },
  { name: 'Documentation MD Files', type: 'Markdown', status: 'Inactive', lastSync: '1 week ago', items: 234 },
]

export default function AdminPage() {
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')

  const tabs = [
    { id: 'overview', label: 'overview', icon: BarChart3 },
    { id: 'users', label: 'users', icon: Users },
    { id: 'prompts', label: 'prompts', icon: FileText },
    { id: 'subscriptions', label: 'subscriptions', icon: CreditCard },
    { id: 'sources', label: 'sources', icon: Database },
    { id: 'settings', label: 'settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            {t('admin.title')}
          </h1>
          <p className="text-zinc-400">Manage your platform, users, and content</p>
        </motion.div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(`admin.${tab.label}`)}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {ADMIN_STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card variant="glass" hover>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-zinc-800/50 rounded-xl flex items-center justify-center">
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <span className="text-xs text-zinc-600">{stat.change}</span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                    <p className="text-sm text-zinc-500">{t(`admin.${stat.label}`)}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Revenue by Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { plan: 'Pro', revenue: 45210, count: 1876, color: 'bg-emerald-500' },
                      { plan: 'Team', revenue: 28940, count: 879, color: 'bg-blue-500' },
                      { plan: 'Enterprise', revenue: 10141, count: 45, color: 'bg-amber-500' },
                    ].map((item) => (
                      <div key={item.plan} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-300">{item.plan}</span>
                          <span className="text-zinc-400">${item.revenue.toLocaleString()} ({item.count} subs)</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(item.revenue / 45210) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { action: 'New user registered', user: 'Alex Johnson', time: '2 min ago' },
                      { action: 'Prompt published', user: 'Sarah Miller', time: '15 min ago' },
                      { action: 'Subscription upgraded', user: 'Michael Brown', time: '1 hour ago' },
                      { action: 'Bulk import completed', user: 'Admin', time: '2 hours ago' },
                      { action: 'New source connected', user: 'Admin', time: '3 hours ago' },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm text-zinc-300">{activity.action}</p>
                          <p className="text-xs text-zinc-600">{activity.user}</p>
                        </div>
                        <span className="text-xs text-zinc-500">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <Card variant="glass">
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />}>
                  Export
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-zinc-500 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-zinc-500 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-zinc-500 font-medium">Plan</th>
                    <th className="text-left py-3 px-4 text-zinc-500 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-zinc-500 font-medium">Joined</th>
                    <th className="text-right py-3 px-4 text-zinc-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_USERS.map((user, i) => (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 px-4 text-zinc-200 font-medium">{user.name}</td>
                      <td className="py-3 px-4 text-zinc-400">{user.email}</td>
                      <td className="py-3 px-4">
                        <Badge variant={user.plan === 'Free' ? 'default' : 'primary'} size="sm">
                          {user.plan}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.status === 'Active' ? 'success' : user.status === 'Trialing' ? 'warning' : 'danger'} size="sm">
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-zinc-500">{user.date}</td>
                      <td className="py-3 px-4 text-right">
                        <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'sources' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">{t('admin.sources')}</h2>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />}>
                  Add Source
                </Button>
                <Button size="sm" icon={<Upload className="w-4 h-4" />}>
                  {t('admin.imports')}
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {SOURCES.map((source, i) => (
                <Card key={i} variant="glass" hover>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-800/50 rounded-xl flex items-center justify-center">
                        {source.type === 'GitHub' ? <GitBranch className="w-5 h-5 text-zinc-400" /> :
                         source.type === 'CSV' ? <Upload className="w-5 h-5 text-zinc-400" /> :
                         source.type === 'JSON' ? <FileText className="w-5 h-5 text-zinc-400" /> :
                         <Database className="w-5 h-5 text-zinc-400" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{source.name}</h3>
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                          <span>{source.type}</span>
                          <span>{source.items} items</span>
                          <span>Sync: {source.lastSync}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={source.status === 'Active' ? 'success' : 'danger'} size="sm">
                        {source.status}
                      </Badge>
                      <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                        <Link className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {(activeTab === 'prompts' || activeTab === 'subscriptions' || activeTab === 'settings') && (
          <Card variant="glass" className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-lg">
              {t(`admin.${activeTab}`)} management panel coming soon
            </p>
            <p className="text-sm text-zinc-600 mt-2">
              Full CRUD and management interface will be implemented in the next phase
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
