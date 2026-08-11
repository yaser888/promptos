'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Zap,
  BarChart,
  Library,
  Code,
  ShoppingCart,
  Cloud,
  Download,
  ChevronRight,
  Star,
  Check,
  ArrowRight,
  Quote,
  Users,
  MessageSquare,
  Shield,
  Globe,
} from 'lucide-react'
import { Button, Input, Select, Badge, Card } from '@/components/ui'
import { PLATFORMS, TONES, LANGUAGES, COMPLEXITIES, LENGTHS, OUTPUT_FORMATS, FEATURES, FAQS, SUBSCRIPTION_PLANS } from '@/lib/constants'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export default function HomePage() {
  const t = useTranslations()
  const [idea, setIdea] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('chatgpt')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [selectedComplexity, setSelectedComplexity] = useState('intermediate')
  const [selectedLength, setSelectedLength] = useState('medium')
  const [selectedFormat, setSelectedFormat] = useState('structured')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!idea.trim()) return
    setIsGenerating(true)
    // Simulated generation - will be replaced with actual AI
    setTimeout(() => {
      setGeneratedPrompt(`You are an expert ${selectedPlatform} prompt engineer. Your task is to help the user with: ${idea}

Tone: ${selectedTone}
Complexity: ${selectedComplexity}
Output Length: ${selectedLength}

Follow these guidelines:
1. Be specific and detailed in your instructions
2. Include clear context and constraints
3. Define the expected output format
4. Use chain-of-thought reasoning where applicable

Your response should be structured as follows:
- Context: Set the stage for the AI
- Task: Define the specific task
- Instructions: Step-by-step guidance
- Constraints: Boundaries and limitations
- Format: Expected output structure
- Example: A sample of the desired output`)
      setIsGenerating(false)
    }, 2000)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-black pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-400/5 rounded-full blur-[96px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-4xl mx-auto"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <Badge variant="primary" size="md" className="mb-4">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                v2.0 - Now with AI Prompt Optimizer
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6"
            >
              <span className="text-white">The Operating System</span>
              <br />
              <span className="text-gradient">for AI Prompts</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Create, optimize, and manage prompts for all AI platforms.
              From ChatGPT to Midjourney, PromptOS is your command center.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/generator">
                <Button size="xl" icon={<Sparkles className="w-5 h-5" />}>
                  Start Creating
                </Button>
              </Link>
              <Link href="/library">
                <Button variant="outline" size="xl" icon={<Library className="w-5 h-5" />}>
                  Explore Library
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500"
            >
              {PLATFORMS.slice(0, 8).map((platform) => (
                <span key={platform.id} className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
                  {platform.name}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Prompt Generator Section */}
      <section className="py-24 relative" id="generator">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t('generator.title')}
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              {t('generator.subtitle')}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <Card variant="glass" className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {t('generator.inputLabel')}
                  </label>
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder={t('generator.inputPlaceholder')}
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">{t('generator.platform')}</label>
                    <select
                      value={selectedPlatform}
                      onChange={(e) => setSelectedPlatform(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">{t('generator.tone')}</label>
                    <select
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {TONES.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">{t('generator.language')}</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">{t('generator.complexity')}</label>
                    <select
                      value={selectedComplexity}
                      onChange={(e) => setSelectedComplexity(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {COMPLEXITIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">{t('generator.length')}</label>
                    <select
                      value={selectedLength}
                      onChange={(e) => setSelectedLength(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {LENGTHS.map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">{t('generator.outputFormat')}</label>
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value)}
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
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card variant="glass" className="min-h-[400px] flex flex-col">
                {generatedPrompt ? (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-emerald-400">{t('generator.result')}</h3>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={handleCopy}>
                          {copied ? t('generator.copied') : t('generator.copy')}
                        </Button>
                        <Button size="sm" variant="ghost">
                          {t('generator.save')}
                        </Button>
                      </div>
                    </div>
                    <pre className="flex-1 p-4 bg-zinc-900/50 rounded-xl text-sm text-zinc-300 overflow-auto whitespace-pre-wrap font-mono">
                      {generatedPrompt}
                    </pre>
                    <div className="flex gap-2 mt-4">
                      <Button variant="secondary" size="sm" onClick={handleGenerate}>
                        {t('generator.regenerate')}
                      </Button>
                      <Button variant="secondary" size="sm">
                        {t('generator.optimize')}
                      </Button>
                      <Button variant="secondary" size="sm">
                        {t('generator.analyze')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                      <p className="text-zinc-500">Your generated prompt will appear here</p>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative border-t border-zinc-800/50" id="features">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/3 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t('features.title')}
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="glass" hover className="h-full group cursor-default">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                    {index === 0 && <Sparkles className="w-6 h-6 text-emerald-400" />}
                    {index === 1 && <Zap className="w-6 h-6 text-emerald-400" />}
                    {index === 2 && <BarChart className="w-6 h-6 text-emerald-400" />}
                    {index === 3 && <Library className="w-6 h-6 text-emerald-400" />}
                    {index === 4 && <Code className="w-6 h-6 text-emerald-400" />}
                    {index === 5 && <ShoppingCart className="w-6 h-6 text-emerald-400" />}
                    {index === 6 && <Cloud className="w-6 h-6 text-emerald-400" />}
                    {index === 7 && <Download className="w-6 h-6 text-emerald-400" />}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 relative border-t border-zinc-800/50" id="pricing">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-6">
            {SUBSCRIPTION_PLANS.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge variant="primary">
                      <Star className="w-3 h-3 mr-1" />
                      {t('pricing.popular')}
                    </Badge>
                  </div>
                )}
                <Card
                  variant={plan.highlighted ? 'glass' : 'default'}
                  className={`h-full flex flex-col ${plan.popular ? 'gradient-border' : ''}`}
                >
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {t(`pricing.${plan.id}`)}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">
                        {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-zinc-500 text-sm">/{t('pricing.monthly')}</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-zinc-400">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {plan.id === 'enterprise' ? (
                    <Button variant="outline" fullWidth size="lg">
                      {t('pricing.contactSales')}
                    </Button>
                  ) : (
                    <Button
                      variant={plan.popular ? 'primary' : 'secondary'}
                      fullWidth
                      size="lg"
                    >
                      {t('pricing.getStarted')}
                    </Button>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 relative border-t border-zinc-800/50" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t('faq.title')}
            </h2>
            <p className="text-lg text-zinc-400">
              {t('faq.subtitle')}
            </p>
          </motion.div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <details className="group">
                  <summary className="flex items-center justify-between p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors [&::-webkit-details-marker]:hidden">
                    <span className="text-white font-medium">{faq.question}</span>
                    <ChevronRight className="w-5 h-5 text-zinc-500 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-5 pb-5 pt-3 text-zinc-400 text-sm leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative border-t border-zinc-800/50">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Transform Your AI Workflow?
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10">
              Join thousands of AI creators who use PromptOS to create better prompts, faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="xl" icon={<Sparkles className="w-5 h-5" />}>
                  Get Started Free
                </Button>
              </Link>
              <Link href="/library">
                <Button variant="outline" size="xl" icon={<ArrowRight className="w-5 h-5" />}>
                  Browse Library
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
