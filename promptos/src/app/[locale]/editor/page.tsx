'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  Save, Download, Code, Eye, History, Variable, Layout, Settings,
  FileText, FileJson, FileType, Undo, Redo, Play, Check, Clock, GitBranch
} from 'lucide-react'
import { Button, Badge, Card } from '@/components/ui'

const MOCK_VERSIONS = [
  { version: 3, date: '2 hours ago', changes: 'Added chain-of-thought reasoning' },
  { version: 2, date: '5 hours ago', changes: 'Improved constraints section' },
  { version: 1, date: '1 day ago', changes: 'Initial creation' },
]

export default function EditorPage() {
  const t = useTranslations()
  const [content, setContent] = useState(`You are an expert AI assistant specialized in prompt engineering.

## Context
You help users create effective, well-structured prompts for various AI platforms.

## Task
Analyze the user's request and generate an optimized prompt.

## Guidelines
1. Be specific and actionable
2. Include clear context
3. Define expected output format
4. Use structured sections

## Constraints
- Keep responses concise
- Focus on clarity
- Avoid ambiguity

## Output Format
Provide response in a structured markdown format with clear sections.`)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')
  const [showHistory, setShowHistory] = useState(false)
  const [saved, setSaved] = useState(false)
  const [title, setTitle] = useState('Advanced Email Marketing Copy Generator')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-bold text-white bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-zinc-600"
                placeholder="Untitled Prompt"
              />
              <Badge variant="primary" size="sm">
                <Code className="w-3 h-3 mr-1" />
                v3
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)} icon={<History className="w-4 h-4" />}>
                {t('editor.history')}
              </Button>
              <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />}>
                {t('editor.export')}
              </Button>
              <Button size="sm" onClick={handleSave} icon={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}>
                {saved ? t('editor.saved') : t('editor.save')}
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card variant="glass" className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'editor'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Code className="w-4 h-4 inline mr-1.5" />
                    {t('editor.title')}
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'preview'
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Eye className="w-4 h-4 inline mr-1.5" />
                    {t('editor.preview')}
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                    <Undo className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all">
                    <Redo className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-zinc-600 mx-2">Auto-saved</span>
                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                </div>
              </div>

              {activeTab === 'editor' ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[500px] p-4 bg-transparent text-sm text-zinc-100 font-mono leading-relaxed resize-none focus:outline-none placeholder:text-zinc-700"
                  placeholder="Start writing your prompt..."
                  spellCheck={false}
                />
              ) : (
                <div className="p-6 h-[500px] overflow-auto">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{content}</pre>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card variant="glass">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-500" />
                {t('editor.settings')}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Platform</label>
                  <select className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option>ChatGPT</option>
                    <option>Claude</option>
                    <option>Gemini</option>
                    <option>Grok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Category</label>
                  <select className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option>Writing</option>
                    <option>Development</option>
                    <option>Creative</option>
                    <option>Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Visibility</label>
                  <select className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                    <option>Public</option>
                    <option>Private</option>
                    <option>Unlisted</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card variant="glass">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <Variable className="w-4 h-4 text-zinc-500" />
                {t('editor.variables')}
              </h3>
              <div className="space-y-2">
                {['{topic}', '{audience}', '{tone}', '{length}'].map((v) => (
                  <div key={v} className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 rounded-lg">
                    <code className="text-sm text-emerald-400 font-mono">{v}</code>
                    <button className="text-xs text-zinc-500 hover:text-zinc-300">Insert</button>
                  </div>
                ))}
              </div>
            </Card>

            {showHistory && (
              <Card variant="glass">
                <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-zinc-500" />
                  {t('editor.history')}
                </h3>
                <div className="space-y-2">
                  {MOCK_VERSIONS.map((v) => (
                    <div key={v.version} className="px-3 py-2.5 bg-zinc-900/50 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-zinc-200">v{v.version}</span>
                        <span className="text-xs text-zinc-500">{v.date}</span>
                      </div>
                      <p className="text-xs text-zinc-500">{v.changes}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card variant="glass">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <Download className="w-4 h-4 text-zinc-500" />
                {t('editor.export')}
              </h3>
              <div className="space-y-2">
                <Button variant="secondary" fullWidth size="sm" icon={<FileText className="w-4 h-4" />}>
                  {t('editor.exportMarkdown')}
                </Button>
                <Button variant="secondary" fullWidth size="sm" icon={<FileJson className="w-4 h-4" />}>
                  {t('editor.exportJson')}
                </Button>
                <Button variant="secondary" fullWidth size="sm" icon={<FileType className="w-4 h-4" />}>
                  {t('editor.exportTxt')}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
