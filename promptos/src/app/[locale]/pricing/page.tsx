'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Check, Sparkles, Star, ArrowRight, HelpCircle } from 'lucide-react'
import { Button, Badge, Card } from '@/components/ui'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: [
      '5 prompts per day',
      'Basic prompt library access',
      'Save up to 50 prompts',
      'Copy prompts',
      'Share prompts',
      '2 languages supported',
      'Basic sync',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 10,
    description: 'Best for power users',
    features: [
      'Unlimited prompts',
      'All prompt tools',
      'All templates',
      'All languages',
      'Full sync across devices',
      'Export all formats (MD, JSON, TXT)',
      'Version history',
      'AI Prompt Optimizer',
      'AI Prompt Analyzer',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 25,
    description: 'For teams and collaboration',
    perUser: true,
    features: [
      'Everything in Pro',
      'Team workspace',
      'Project sharing',
      'User permissions & roles',
      'Workspace management',
      'Team analytics dashboard',
      'Activity log',
      'Team support priority',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    description: 'For organizations',
    features: [
      'Everything in Team',
      'Custom API access',
      'Private deployment',
      'SSO / SAML',
      'Dedicated support',
      'Account manager',
      'Advanced security & compliance',
      'SLA guarantee',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
    custom: true,
  },
]

const FAQ_ITEMS = [
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, you can cancel your subscription at any time. You will continue to have access until the end of your billing period.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes, all paid plans come with a 14-day free trial. No credit card required.',
  },
  {
    q: 'Can I switch plans?',
    a: 'You can upgrade or downgrade your plan at any time. Changes take effect immediately.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards, PayPal, and other payment providers depending on your region.',
  },
]

export default function PricingPage() {
  const t = useTranslations()
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/3 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge variant="primary" size="md" className="mb-4">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            Simple, transparent pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            {t('pricing.subtitle')}
          </p>

          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!annual ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${annual ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-white' : 'text-zinc-500'}`}>
              Annual
              <Badge variant="success" size="sm" className="ml-2">Save 20%</Badge>
            </span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6 mb-16">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge variant="primary">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <Card
                variant={plan.popular ? 'glass' : 'default'}
                className={`h-full flex flex-col ${plan.popular ? 'gradient-border' : ''}`}
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-zinc-500 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    {plan.custom ? (
                      <span className="text-3xl font-bold text-white">Custom</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-white">
                          ${annual ? (plan.price * 12 * 0.8) : plan.price}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-zinc-500 text-sm">
                            /{plan.perUser ? 'user/' : ''}{annual ? 'year' : 'mo'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {plan.price === 0 && !plan.custom && (
                    <p className="text-xs text-zinc-600 mt-1">Free forever</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-zinc-400">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? 'primary' : plan.custom ? 'outline' : 'secondary'}
                  fullWidth
                  size="lg"
                >
                  {plan.cta}
                  {!plan.custom && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors [&::-webkit-details-marker]:hidden">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-zinc-500" />
                    <span className="text-white font-medium">{item.q}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-12 pb-4 pt-2 text-zinc-400 text-sm">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
