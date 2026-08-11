'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Sparkles, Copy, Check, Save, Share, RefreshCw, Zap, BarChart, Settings } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { PLATFORMS, TONES, LANGUAGES, COMPLEXITIES, LENGTHS, OUTPUT_FORMATS } from '@/lib/constants'

export default function GeneratorPage() {
  const t = useTranslations()
  const [idea, setIdea] = useState('')
  const [platform, setPlatform] = useState('chatgpt')
  const [tone, setTone] = useState('professional')
  const [language, setLanguage] = useState('en')
  const [complexity, setComplexity] = useState('intermediate')
  const [length, setLength] = useState('medium')
  const [format, setFormat] = useState('structured')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!idea.trim()) return
    setIsGenerating(true)
    setTimeout(() => {
      setResult(`# ${platform.charAt(0).toUpperCase() + platform.slice(1)} Prompt

You are an expert AI prompt engineer. Your task is: ${idea}

## Context
Provide clear context for the AI to understand the task.

## Instructions
1. Follow these specific guidelines
2. Use a ${tone} tone throughout
3. Maintain ${complexity} complexity level

## Constraints
- Stay within the defined scope
- Follow the specified format
- Adhere to best practices

## Output Format
${format === 'structured' ? '- Structured sections\n- Clear headings\n- Bullet points for items' : 'Plain text response'}

## Example Output
[Your generated response will appear here based on the specified criteria]`)
      setIsGenerating(false)
    }, 1500)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            {t('generator.title')}
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            {t('generator.subtitle')}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="glass">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {t('generator.inputLabel')}
                  </label>
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder={t('generator.inputPlaceholder')}
                    rows={5}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                      {t('generator.platform')}
                    </label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                      {t('generator.tone')}
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {TONES.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                      {t('generator.language')}
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                      {t('generator.complexity')}
                    </label>
                    <select
                      value={complexity}
                      onChange={(e) => setComplexity(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {COMPLEXITIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                      {t('generator.length')}
                    </label>
                    <select
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {LENGTHS.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">
                      {t('generator.outputFormat')}
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {OUTPUT_FORMATS.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  fullWidth
                  size="lg"
                  onClick={handleGenerate}
                  loading={isGenerating}
                  disabled={!idea.trim()}
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  {isGenerating ? t('generator.generating') : t('generator.generate')}
                </Button>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="glass" className="min-h-[500px] flex flex-col">
              {result ? (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="text-lg font-semibold text-emerald-400">
                      {t('generator.result')}
                    </h3>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={handleCopy}>
                        {copied ? <><Check className="w-4 h-4 mr-1" />{t('generator.copied')}</> : <><Copy className="w-4 h-4 mr-1" />{t('generator.copy')}</>}
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Share className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 p-4 bg-zinc-900/50 rounded-xl overflow-auto">
                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono">{result}</pre>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="secondary" size="sm" onClick={handleGenerate} icon={<RefreshCw className="w-4 h-4" />}>
                      {t('generator.regenerate')}
                    </Button>
                    <Button variant="secondary" size="sm" icon={<Zap className="w-4 h-4" />}>
                      {t('generator.optimize')}
                    </Button>
                    <Button variant="secondary" size="sm" icon={<BarChart className="w-4 h-4" />}>
                      {t('generator.analyze')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500">Your generated prompt will appear here</p>
                    <p className="text-sm text-zinc-600 mt-2">Configure your options and click generate</p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
