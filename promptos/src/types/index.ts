export interface PromptGeneratorInput {
  idea: string
  platform: string
  tone: string
  language: string
  complexity: string
  length: string
  outputFormat: string
}

export interface PromptGeneratorResult {
  prompt: string
  title: string
  description: string
  platforms: string[]
  tags: string[]
  variables: PromptVariable[]
}

export interface PromptVariable {
  name: string
  type: 'text' | 'number' | 'select' | 'boolean'
  defaultValue?: string
  options?: string[]
  description?: string
}

export interface PromptVersion {
  id: string
  version: number
  content: string
  title?: string
  changes?: string
  createdAt: string
}

export interface PromptCollection {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  isPublic: boolean
  promptCount: number
  createdAt: string
}

export interface PromptAnalysis {
  clarity: number
  specificity: number
  context: number
  constraints: number
  format: number
  overall: number
  suggestions: string[]
  missingElements: string[]
}

export interface DashboardStats {
  totalPrompts: number
  totalFavorites: number
  totalViews: number
  totalCopies: number
  dailyUsage: number
  credits: number
  recentPrompts: number
  popularPrompt?: {
    id: string
    title: string
    views: number
  }
}

export interface MarketplaceItem {
  id: string
  title: string
  description: string
  price: number
  currency: string
  rating: number
  reviewCount: number
  downloadCount: number
  copyCount: number
  author: {
    name: string
    image?: string
  }
  platform: string
  tags: string[]
  createdAt: string
}

export interface AdminStats {
  totalUsers: number
  totalPrompts: number
  totalRevenue: number
  activeSubscriptions: number
  monthlyActiveUsers: number
  totalImports: number
  newUsersToday: number
  promptsCreatedToday: number
  revenueByPlan: {
    plan: string
    revenue: number
    count: number
  }[]
  recentActivity: {
    action: string
    user: string
    timestamp: string
  }[]
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  highlighted?: boolean
  popular?: boolean
}

export interface PaymentConfig {
  stripe: boolean
  paypal: boolean
  paddle: boolean
  lemonSqueezy: boolean
  wise: boolean
}

export interface FilterOptions {
  search: string
  category: string
  platform: string
  sortBy: 'newest' | 'popular' | 'rating' | 'price'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
