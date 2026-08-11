export interface HomeStat {
  label: string;
  valueKey: string;
  suffix: string;
}

export interface HomeFeature {
  icon: string;
  title: string;
  description: string;
}

export interface HomeStep {
  title: string;
  description: string;
}

export interface HomeTestimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
}

export interface HomeFaq {
  question: string;
  answer: string;
}

export interface HomeContentData {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    cta: string;
    secondary: string;
    platforms: string[];
  };
  stats: HomeStat[];
  featuresTitle: string;
  featuresSubtitle: string;
  features: HomeFeature[];
  howTitle: string;
  howSubtitle: string;
  steps: HomeStep[];
  trustedTitle: string;
  companies: string[];
  testimonialsTitle: string;
  testimonialsSubtitle: string;
  testimonials: HomeTestimonial[];
  faqTitle: string;
  faqSubtitle: string;
  faqs: HomeFaq[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
  ctaSecondary: string;
  ctaBullets: string[];
  pricingTitle: string;
  pricingSubtitle: string;
}

export const HOME_DEFAULTS: HomeContentData = {
  hero: {
    badge: "Your AI Prompt Operating System",
    title: "The operating system for your AI prompts",
    subtitle:
      "Create, manage, optimize, and share prompts across all major AI platforms. Everything you need to unlock the full power of your favorite AI tools.",
    cta: "Get Started Free",
    secondary: "Browse Library",
    platforms: [
      "ChatGPT",
      "Claude",
      "Gemini",
      "Grok",
      "Perplexity",
      "Midjourney",
      "Stable Diffusion",
      "Cursor",
      "Copilot",
    ],
  },
  stats: [
    { label: "Prompts", valueKey: "totalPrompts", suffix: "+" },
    { label: "Users", valueKey: "totalUsers", suffix: "+" },
    { label: "Copies", valueKey: "totalCopies", suffix: "+" },
    { label: "Favorites", valueKey: "totalFavorites", suffix: "+" },
  ],
  featuresTitle: "Everything you need to master AI",
  featuresSubtitle:
    "Powerful tools and features to create, organize, and share better prompts.",
  features: [
    {
      icon: "layers",
      title: "Smart Library",
      description:
        "Organize thousands of prompts with categories, tags, collections, and advanced search.",
    },
    {
      icon: "sparkles",
      title: "AI Optimizer",
      description:
        "Automatically improve your prompts with AI-powered suggestions and best practices.",
    },
    {
      icon: "globe",
      title: "Multi-Language",
      description: "Create and translate prompts in 10+ languages with full RTL support.",
    },
    {
      icon: "share",
      title: "Team Collaboration",
      description:
        "Share workspaces, manage permissions, and collaborate on prompts in real-time.",
    },
    {
      icon: "zap",
      title: "Prompt Marketplace",
      description:
        "Buy and sell premium prompts with secure payments and buyer protection.",
    },
    {
      icon: "cloud",
      title: "Cloud Sync",
      description: "Access your prompts from anywhere with automatic cloud synchronization.",
    },
    {
      icon: "git",
      title: "GitHub Sync",
      description: "Sync your prompts with GitHub repositories for version control.",
    },
    {
      icon: "shield",
      title: "Enterprise Security",
      description: "SSO, role-based access, audit logs, and enterprise-grade security.",
    },
  ],
  howTitle: "How it works",
  howSubtitle: "Get started in minutes with a simple, powerful workflow.",
  steps: [
    {
      title: "Create",
      description: "Write your first prompt or pick a starting template from the library.",
    },
    {
      title: "Optimize",
      description: "Use the AI optimizer to refine tone, structure, and clarity.",
    },
    {
      title: "Organize",
      description: "Save to collections, tag them, and keep everything synced across devices.",
    },
    {
      title: "Share",
      description: "Publish to the marketplace, share with your team, or export anywhere.",
    },
  ],
  trustedTitle: "Trusted by prompt engineers worldwide",
  companies: [
    "TechCorp",
    "DataFlow",
    "AI Labs",
    "PromptScale",
    "CloudNine",
    "NexGen AI",
    "Synthwave",
    "Quantum",
  ],
  testimonialsTitle: "Loved by AI enthusiasts",
  testimonialsSubtitle: "Join thousands of happy users who master their AI tools.",
  testimonials: [
    {
      name: "Sarah Chen",
      role: "Lead AI Engineer",
      company: "TechCorp",
      avatar: "SC",
      content:
        "PromptOS completely changed how our team works with AI. The library and optimizer are indispensable.",
    },
    {
      name: "Marcus Rivera",
      role: "Product Manager",
      company: "DataFlow Inc",
      avatar: "MR",
      content:
        "The marketplace is brilliant. I sell my best prompts and earn from my expertise every month.",
    },
    {
      name: "Dr. Aisha Patel",
      role: "Research Director",
      company: "AI Labs",
      avatar: "AP",
      content:
        "Multi-language support with full RTL is a game changer for our international research group.",
    },
    {
      name: "James Wilson",
      role: "CTO",
      company: "PromptScale",
      avatar: "JW",
      content:
        "Enterprise-grade security and team collaboration made PromptOS an easy choice for us.",
    },
  ],
  faqTitle: "Frequently asked questions",
  faqSubtitle: "Everything you need to know about PromptOS.",
  faqs: [
    {
      question: "What is PromptOS?",
      answer:
        "PromptOS is a comprehensive operating system for AI prompts. It allows you to create, manage, optimize, and share prompts across all major AI platforms including ChatGPT, Claude, Gemini, and more.",
    },
    {
      question: "Is PromptOS free?",
      answer:
        "Yes! PromptOS offers a generous free plan that includes limited daily prompts, basic library access, and core features. Upgrade to Pro for unlimited access and advanced tools.",
    },
    {
      question: "Which AI platforms are supported?",
      answer:
        "PromptOS supports ChatGPT, Claude, Gemini, Grok, Perplexity, Cursor, GitHub Copilot, Midjourney, Stable Diffusion, Flux, Leonardo AI, Runway, Sora, and more being added regularly.",
    },
    {
      question: "Can I collaborate with my team?",
      answer:
        "Absolutely! The Team plan includes workspaces, project sharing, user permissions, team analytics, and activity logs for seamless collaboration.",
    },
    {
      question: "Can I sell my prompts?",
      answer:
        "Yes! The Prompt Marketplace allows you to list and sell your premium prompts. Set your own prices, track sales, and earn from your prompt engineering expertise.",
    },
  ],
  ctaTitle: "Ready to take control of your AI workflow?",
  ctaSubtitle:
    "Join thousands of prompt engineers creating better AI experiences every day.",
  ctaButton: "Get Started Free",
  ctaSecondary: "See Pricing",
  ctaBullets: ["Free forever plan", "No credit card required", "Cancel anytime"],
  pricingTitle: "Simple, transparent pricing",
  pricingSubtitle: "Choose the plan that fits your workflow. Upgrade or cancel anytime.",
};
