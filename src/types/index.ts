export interface Prompt {
  id: string;
  title: string;
  content: string;
  description: string | null;
  platform: PromptPlatform;
  tone: PromptTone;
  language: string;
  complexity: PromptComplexity;
  length: PromptLength;
  outputFormat: PromptOutputFormat;
  tags: string[];
  categoryId: string | null;
  category: Category | null;
  userId: string;
  user: User;
  collectionId: string | null;
  collection: Collection | null;
  isPublic: boolean;
  isFeatured: boolean;
  viewCount: number;
  copyCount: number;
  likeCount: number;
  shareCount: number;
  price: number | null;
  version: number;
  versions: PromptVersion[];
  translations: PromptTranslation[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  content: string;
  version: number;
  changelog: string | null;
  createdAt: string;
}

export interface PromptTranslation {
  id: string;
  promptId: string;
  language: string;
  content: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  parent: Category | null;
  children: Category[];
  prompts: Prompt[];
  _count: { prompts: number };
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  _count: { prompts: number };
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  userId: string;
  user: User;
  prompts: Prompt[];
  _count: { prompts: number };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  avatar: string | null;
  role: UserRole;
  credits: number;
  prompts: Prompt[];
  collections: Collection[];
  favorites: Favorite[];
  subscription: Subscription | null;
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  promptId: string;
  prompt: Prompt;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  content: string;
  variables: TemplateVariable[];
  category: string;
  isPublic: boolean;
  userId: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  type: "text" | "number" | "select" | "boolean";
  defaultValue: string;
  options?: string[];
  required: boolean;
  description: string;
}

export interface Subscription {
  id: string;
  userId: string;
  user: User;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlan = "FREE" | "PRO" | "TEAM" | "ENTERPRISE";
export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "EXPIRED" | "TRIALING" | "PAST_DUE";
export type UserRole = "USER" | "ADMIN" | "MODERATOR";

export type PromptPlatform =
  | "CHATGPT"
  | "CLAUDE"
  | "GEMINI"
  | "GROK"
  | "PERPLEXITY"
  | "CURSOR"
  | "GITHUB_COPILOT"
  | "MIDJOURNEY"
  | "STABLE_DIFFUSION"
  | "FLUX"
  | "LEONARDO"
  | "RUNWAY"
  | "SORA"
  | "GENERIC";

export type PromptTone =
  | "PROFESSIONAL"
  | "CASUAL"
  | "FRIENDLY"
  | "FORMAL"
  | "CREATIVE"
  | "TECHNICAL"
  | "HUMOROUS"
  | "PERSUASIVE"
  | "NEUTRAL"
  | "CUSTOM";

export type PromptComplexity = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type PromptLength = "SHORT" | "MEDIUM" | "LONG" | "VERY_LONG";

export type PromptOutputFormat =
  | "MARKDOWN"
  | "JSON"
  | "TEXT"
  | "HTML"
  | "CSV"
  | "CODE"
  | "TABLE"
  | "LIST"
  | "YAML"
  | "XML";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string | null;
  isActive: boolean;
  lastSync: string | null;
  _count: { prompts: number };
  createdAt: string;
  updatedAt: string;
}

export type SourceType =
  | "GITHUB"
  | "CSV"
  | "MARKDOWN"
  | "JSON"
  | "MANUAL"
  | "API";

export interface ImportJob {
  id: string;
  sourceId: string;
  source: Source;
  status: ImportStatus;
  totalItems: number;
  importedItems: number;
  failedItems: number;
  errorLog: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

export type ImportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Usage {
  id: string;
  userId: string;
  action: UsageAction;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type UsageAction =
  | "PROMPT_CREATE"
  | "PROMPT_COPY"
  | "PROMPT_SHARE"
  | "PROMPT_EXPORT"
  | "PROMPT_IMPORT"
  | "PROMPT_GENERATE"
  | "PROMPT_OPTIMIZE"
  | "PROMPT_ANALYZE"
  | "PROMPT_TRANSLATE"
  | "FAVORITE_ADD"
  | "FAVORITE_REMOVE"
  | "COLLECTION_CREATE"
  | "MARKETPLACE_PURCHASE"
  | "MARKETPLACE_SELL";

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type Direction = "ltr" | "rtl";

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  dir: Direction;
  flag: string;
}

export interface PricingPlan {
  id: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
  badge?: string;
}
