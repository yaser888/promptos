export const PLATFORMS = [
  { id: 'chatgpt', name: 'ChatGPT', icon: 'message-square' },
  { id: 'claude', name: 'Claude', icon: 'bot' },
  { id: 'gemini', name: 'Gemini', icon: 'sparkles' },
  { id: 'grok', name: 'Grok', icon: 'zap' },
  { id: 'perplexity', name: 'Perplexity', icon: 'search' },
  { id: 'cursor', name: 'Cursor', icon: 'code' },
  { id: 'github-copilot', name: 'GitHub Copilot', icon: 'github' },
  { id: 'midjourney', name: 'Midjourney', icon: 'image' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: 'wand' },
  { id: 'flux', name: 'Flux', icon: 'flash' },
  { id: 'leonardo', name: 'Leonardo AI', icon: 'brush' },
  { id: 'runway', name: 'Runway', icon: 'video' },
  { id: 'sora', name: 'Sora', icon: 'film' },
] as const

export const TONES = [
  { id: 'professional', name: 'Professional' },
  { id: 'casual', name: 'Casual' },
  { id: 'academic', name: 'Academic' },
  { id: 'creative', name: 'Creative' },
  { id: 'technical', name: 'Technical' },
  { id: 'simple', name: 'Simple' },
  { id: 'detailed', name: 'Detailed' },
  { id: 'persuasive', name: 'Persuasive' },
] as const

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
] as const

export const COMPLEXITIES = [
  { id: 'beginner', name: 'Beginner', description: 'Simple and straightforward' },
  { id: 'intermediate', name: 'Intermediate', description: 'Balanced complexity' },
  { id: 'advanced', name: 'Advanced', description: 'Complex with multiple constraints' },
  { id: 'expert', name: 'Expert', description: 'Highly sophisticated with chain-of-thought' },
] as const

export const LENGTHS = [
  { id: 'short', name: 'Short', description: '1-2 sentences' },
  { id: 'medium', name: 'Medium', description: '1 paragraph' },
  { id: 'long', name: 'Long', description: '2-3 paragraphs' },
  { id: 'detailed', name: 'Detailed', description: 'Multiple paragraphs with examples' },
] as const

export const OUTPUT_FORMATS = [
  { id: 'raw', name: 'Raw Prompt' },
  { id: 'structured', name: 'Structured' },
  { id: 'template', name: 'Template with Variables' },
  { id: 'markdown', name: 'Markdown' },
  { id: 'json', name: 'JSON' },
] as const

export const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month' as const,
    features: [
      '5 prompts per day',
      'Basic prompt library access',
      'Save up to 50 prompts',
      'Copy prompts',
      'Share prompts',
      '2 languages supported',
      'Basic sync',
    ],
    popular: false,
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 10,
    currency: 'USD',
    interval: 'month' as const,
    features: [
      'Unlimited prompts',
      'All prompt tools',
      'All templates',
      'All languages',
      'Full sync',
      'Export all formats',
      'Version history',
      'AI Prompt Optimizer',
      'AI Prompt Analyzer',
      'Priority support',
    ],
    popular: true,
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 25,
    currency: 'USD',
    interval: 'month' as const,
    features: [
      'All Pro features',
      'Team workspace',
      'Project sharing',
      'User permissions',
      'Workspace management',
      'Team analytics',
      'Activity log',
      'Team support',
    ],
    popular: false,
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    currency: 'USD',
    interval: 'month' as const,
    features: [
      'All Team features',
      'Custom API',
      'Private deployment',
      'SSO',
      'Dedicated support',
      'Account manager',
      'Advanced security',
      'SLA',
    ],
    popular: false,
    highlighted: false,
  },
] as const

export const FEATURES = [
  {
    id: 'generator',
    title: 'AI Prompt Generator',
    description: 'Transform simple ideas into powerful, production-ready prompts with AI assistance.',
    icon: 'sparkles',
  },
  {
    id: 'optimizer',
    title: 'Prompt Optimizer',
    description: 'Enhance your prompts for better AI responses. Get suggestions for clarity and effectiveness.',
    icon: 'zap',
  },
  {
    id: 'analyzer',
    title: 'Prompt Analyzer',
    description: 'Analyze prompt quality with detailed scores and actionable improvement suggestions.',
    icon: 'bar-chart',
  },
  {
    id: 'library',
    title: 'Prompt Library',
    description: 'Access thousands of curated prompts organized by category, platform, and use case.',
    icon: 'library',
  },
  {
    id: 'editor',
    title: 'Advanced Editor',
    description: 'Professional prompt editor with syntax highlighting, variables, templates, and version control.',
    icon: 'code',
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    description: 'Buy, sell, and discover premium prompts created by the community.',
    icon: 'shopping-cart',
  },
  {
    id: 'sync',
    title: 'Cloud Sync',
    description: 'Sync your prompts across all devices with real-time cloud synchronization.',
    icon: 'cloud',
  },
  {
    id: 'export',
    title: 'Multi-format Export',
    description: 'Export your prompts in Markdown, JSON, TXT, and more formats.',
    icon: 'download',
  },
] as const

export const FAQS = [
  {
    question: 'What is PromptOS?',
    answer: 'PromptOS is a comprehensive operating system for AI prompts. It helps you create, optimize, manage, and share prompts for all major AI platforms.',
  },
  {
    question: 'Is PromptOS free?',
    answer: 'Yes! PromptOS offers a generous free plan that includes 5 prompts per day, basic library access, and core features. Upgrade to Pro for unlimited access.',
  },
  {
    question: 'Which AI platforms are supported?',
    answer: 'PromptOS supports ChatGPT, Claude, Gemini, Grok, Perplexity, Cursor, GitHub Copilot, Midjourney, Stable Diffusion, Flux, Leonardo AI, Runway, Sora, and more.',
  },
  {
    question: 'Can I sell my prompts?',
    answer: 'Absolutely! The PromptOS Marketplace allows you to list and sell your prompts to thousands of users worldwide.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. We use enterprise-grade encryption, secure authentication, and follow best practices for data protection. Your prompts are private by default.',
  },
  {
    question: 'Can I collaborate with my team?',
    answer: 'Yes! The Team plan includes shared workspaces, project sharing, user permissions, and team analytics.',
  },
] as const

export const NAV_LINKS = [
  { href: '/generator', label: 'Generator', icon: 'sparkles' },
  { href: '/library', label: 'Library', icon: 'library' },
  { href: '/marketplace', label: 'Marketplace', icon: 'shopping-cart' },
  { href: '/pricing', label: 'Pricing', icon: 'credit-card' },
] as const
