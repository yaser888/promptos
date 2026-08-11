import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const categoriesData = [
  { name: "Writing", slug: "writing", description: "Prompts for content writing and copywriting", icon: "FileText", color: "#10b981" },
  { name: "Coding", slug: "coding", description: "Prompts for programming and software development", icon: "Code", color: "#3b82f6" },
  { name: "Marketing", slug: "marketing", description: "Prompts for marketing and advertising", icon: "Megaphone", color: "#f59e0b" },
  { name: "Analysis", slug: "analysis", description: "Prompts for data analysis and research", icon: "BarChart3", color: "#8b5cf6" },
  { name: "Creative", slug: "creative", description: "Prompts for creative and artistic work", icon: "Palette", color: "#ef4444" },
  { name: "Education", slug: "education", description: "Prompts for learning and teaching", icon: "GraduationCap", color: "#14b8a6" },
  { name: "Business", slug: "business", description: "Prompts for business and entrepreneurship", icon: "Briefcase", color: "#6366f1" },
  { name: "Technical", slug: "technical", description: "Prompts for technical documentation and support", icon: "Wrench", color: "#f97316" },
];

const usersData = [
  { clerkId: "seed_admin", email: "admin@promptos.com", name: "PromptOS Admin", role: "ADMIN", credits: 1000 },
  { clerkId: "seed_user_1", email: "sarah@example.com", name: "Sarah Chen", role: "USER", credits: 500 },
  { clerkId: "seed_user_2", email: "alex@example.com", name: "Alex Rivera", role: "USER", credits: 300 },
  { clerkId: "seed_user_3", email: "marcus@example.com", name: "Marcus Wong", role: "USER", credits: 250 },
  { clerkId: "seed_user_4", email: "emily@example.com", name: "Emily Watson", role: "USER", credits: 400 },
  { clerkId: "seed_user_5", email: "james@example.com", name: "James Miller", role: "USER", credits: 150 },
  { clerkId: "seed_user_6", email: "lisa@example.com", name: "Dr. Lisa Park", role: "MODERATOR", credits: 750 },
  { clerkId: "seed_user_7", email: "omar@example.com", name: "Omar Haddad", role: "USER", credits: 120 },
  { clerkId: "seed_user_8", email: "nina@example.com", name: "Nina Kowalski", role: "USER", credits: 200 },
  { clerkId: "seed_user_9", email: "tomas@example.com", name: "Tomas Berg", role: "USER", credits: 80 },
  { clerkId: "seed_user_10", email: "yuki@example.com", name: "Yuki Tanaka", role: "USER", credits: 600 },
  { clerkId: "seed_user_11", email: "fatima@example.com", name: "Fatima Al-Sayed", role: "USER", credits: 340 },
  { clerkId: "seed_user_12", email: "daniel@example.com", name: "Daniel Novak", role: "USER", credits: 90 },
  { clerkId: "seed_user_13", email: "sofia@example.com", name: "Sofia Rossi", role: "USER", credits: 210 },
  { clerkId: "seed_user_14", email: "henry@example.com", name: "Henry Zhang", role: "USER", credits: 130 },
  { clerkId: "seed_user_15", email: "amina@example.com", name: "Amina Diallo", role: "USER", credits: 175 },
  { clerkId: "seed_user_16", email: "leo@example.com", name: "Leon Dubois", role: "USER", credits: 260 },
  { clerkId: "seed_user_17", email: "grace@example.com", name: "Grace Kim", role: "USER", credits: 320 },
  { clerkId: "seed_user_18", email: "viktor@example.com", name: "Viktor Petrov", role: "USER", credits: 145 },
  { clerkId: "seed_user_19", email: "isabel@example.com", name: "Isabel Torres", role: "USER", credits: 230 },
  { clerkId: "seed_user_20", email: "john@example.com", name: "John Carter", role: "USER", credits: 190 },
];

function prompt(
  title: string,
  description: string,
  content: string,
  categoryId: string,
  userId: string,
  overrides: Partial<{
    platform: string;
    tone: string;
    language: string;
    complexity: string;
    length: string;
    outputFormat: string;
    tags: string[];
    isPublic: boolean;
    isFeatured: boolean;
    viewCount: number;
    copyCount: number;
    likeCount: number;
    shareCount: number;
    price: number;
    createdAt: Date;
  }> = {}
) {
  return {
    title,
    description,
    content,
    categoryId,
    userId,
    platform: (overrides.platform as any) || "CHATGPT",
    tone: (overrides.tone as any) || "PROFESSIONAL",
    language: overrides.language || "en",
    complexity: (overrides.complexity as any) || "INTERMEDIATE",
    length: (overrides.length as any) || "MEDIUM",
    outputFormat: (overrides.outputFormat as any) || "MARKDOWN",
    tags: overrides.tags || [],
    isPublic: overrides.isPublic ?? true,
    isFeatured: overrides.isFeatured ?? false,
    viewCount: overrides.viewCount ?? 0,
    copyCount: overrides.copyCount ?? 0,
    likeCount: overrides.likeCount ?? 0,
    shareCount: overrides.shareCount ?? 0,
    price: overrides.price ?? 0,
    createdAt: overrides.createdAt ?? new Date(),
  } as any;
}

async function main() {
  console.log("Seeding database...");

  // --- Clean existing data (except categories which are upserted) ---
  const tables = [
    "DuelVote", "Duel", "Activity", "Usage", "Favorite", "PromptVersion", "PromptTranslation", "Template",
    "Collection", "ImportJob", "Source", "Subscription", "Prompt", "User",
    "DiscountCode", "Setting", "Tag",
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
  console.log("Cleaned existing data");

  // --- Categories ---
  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
    categories[cat.slug] = created.id;
  }
  console.log(`Created ${Object.keys(categories).length} categories`);

  // --- Users ---
  const userIds: Record<string, string> = {};
  for (const user of usersData) {
    const created = await prisma.user.upsert({
      where: { clerkId: user.clerkId },
      update: { name: user.name, role: user.role as any, credits: user.credits },
      create: {
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        role: user.role as any,
        credits: user.credits,
      },
    });
    userIds[user.clerkId] = created.id;
  }
  console.log(`Created ${Object.keys(userIds).length} users`);

  const adminId = userIds["seed_admin"];
  const sarahId = userIds["seed_user_1"];
  const alexId = userIds["seed_user_2"];
  const marcusId = userIds["seed_user_3"];
  const emilyId = userIds["seed_user_4"];
  const jamesId = userIds["seed_user_5"];
  const lisaId = userIds["seed_user_6"];
  const omarId = userIds["seed_user_7"];
  const ninaId = userIds["seed_user_8"];
  const yukiId = userIds["seed_user_10"];
  const fatimaId = userIds["seed_user_11"];
  const sofiaId = userIds["seed_user_13"];
  const henryId = userIds["seed_user_14"];
  const leoId = userIds["seed_user_16"];
  const graceId = userIds["seed_user_17"];
  const isabelId = userIds["seed_user_19"];

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  // --- Prompts (60+) ---
  const promptsData = [
    prompt("Expert Code Review Assistant", "Comprehensive code review prompt for multiple languages", `You are an expert code reviewer with deep knowledge of software engineering best practices.\n\n## Task\nReview the following code for:\n1. Code quality and readability\n2. Performance bottlenecks\n3. Security vulnerabilities\n4. Best practices adherence\n5. Test coverage suggestions\n\n## Code\n\`\`\`\n[Paste your code here]\n\`\`\``, categories.coding, adminId, { platform: "CHATGPT", tone: "TECHNICAL", complexity: "ADVANCED", length: "LONG", tags: ["code", "review", "debugging"], isFeatured: true, viewCount: 3452, copyCount: 1289, likeCount: 567, createdAt: daysAgo(30) }),
    prompt("Creative Story Generator", "Generate engaging stories with character development", `You are a master storyteller.\n\n## Task\nCreate a compelling story with:\n- Genre: [insert]\n- Main Character: [describe]\n- Setting: [describe]\n- Central Conflict: [describe]\n\n## Requirements\n- Engaging opening hook\n- Character arcs\n- Vivid descriptions\n- Natural dialogue`, categories.creative, sarahId, { platform: "CLAUDE", tone: "CREATIVE", length: "VERY_LONG", outputFormat: "TEXT", tags: ["story", "creative", "writing"], isFeatured: true, viewCount: 2789, copyCount: 987, likeCount: 432, createdAt: daysAgo(28) }),
    prompt("Data Analysis Framework", "Comprehensive data analysis and visualization prompt", `You are a senior data analyst.\n\n## Task\nAnalyze the provided dataset and deliver:\n1. Executive Summary\n2. Key Findings\n3. Data Quality Assessment\n4. Statistical Analysis\n5. Visualizations\n6. Recommendations`, categories.analysis, marcusId, { platform: "GEMINI", tone: "PROFESSIONAL", complexity: "ADVANCED", length: "LONG", tags: ["data", "analysis", "statistics"], isFeatured: true, viewCount: 2156, copyCount: 876, likeCount: 345, createdAt: daysAgo(26) }),
    prompt("SEO Content Strategy", "Optimize content for search engines effectively", `You are an SEO expert.\n\n## Task\nCreate a comprehensive SEO content strategy for:\n- Keywords: [list]\n- Industry: [industry]\n- Audience: [describe]\n\n## Components\n1. Keyword research\n2. Content outline\n3. On-page SEO\n4. Internal linking\n5. Content calendar`, categories.marketing, emilyId, { platform: "CHATGPT", tags: ["seo", "content", "marketing"], viewCount: 1890, copyCount: 765, likeCount: 298, createdAt: daysAgo(24) }),
    prompt("Customer Support Template", "Handle customer inquiries with professional responses", `You are a customer support specialist.\n\n## Task\nRespond to the following customer inquiry professionally:\n[Insert inquiry]\n\n## Requirements\n- Empathetic tone\n- Clear solution steps\n- Follow-up suggestions`, categories.business, jamesId, { platform: "PERPLEXITY", tone: "FRIENDLY", tags: ["support", "customer", "template"], viewCount: 1567, copyCount: 654, likeCount: 234, createdAt: daysAgo(22) }),
    prompt("Math Problem Solver", "Solve complex math problems step by step", `You are a mathematics professor.\n\n## Task\nSolve the following problem step by step:\n[Insert problem]\n\n## Requirements\n- Show all work\n- Explain each step\n- Provide the final answer\n- Include alternative methods`, categories.education, lisaId, { platform: "GROK", tone: "FRIENDLY", length: "LONG", tags: ["math", "education"], viewCount: 1234, copyCount: 543, likeCount: 187, createdAt: daysAgo(20) }),
    prompt("LinkedIn Post Generator", "Professional LinkedIn content that drives engagement", `You are a LinkedIn content strategist.\n\n## Task\nWrite a LinkedIn post about:\n[Topic]\n\n## Requirements\n- Hook in first line\n- Value-driven content\n- Call to action\n- 3-5 relevant hashtags`, categories.marketing, sarahId, { platform: "CHATGPT", tone: "PROFESSIONAL", length: "SHORT", tags: ["linkedin", "social-media", "professional"], viewCount: 2100, copyCount: 934, likeCount: 412, createdAt: daysAgo(18) }),
    prompt("Bug-Fixing Assistant", "Debug code and explain the root cause", `You are a senior software engineer.\n\n## Task\nHelp me fix the following bug:\n[Describe bug + paste code]\n\n## Requirements\n- Identify root cause\n- Provide the fix\n- Explain why it works\n- Suggest tests to prevent regression`, categories.coding, adminId, { platform: "GITHUB_COPILOT", tone: "TECHNICAL", complexity: "ADVANCED", tags: ["bug", "debugging", "code"], viewCount: 987, copyCount: 456, likeCount: 189, createdAt: daysAgo(17) }),
    prompt("Sales Email Copywriter", "Persuasive sales emails that convert", `You are a world-class copywriter.\n\n## Task\nWrite a sales email for:\n[Product/Service]\nTarget audience: [describe]\n\n## Requirements\n- Attention-grabbing subject line\n- Benefits over features\n- Clear CTA\n- Follow-up sequence suggestions`, categories.business, emilyId, { platform: "CHATGPT", tone: "PERSUASIVE", tags: ["sales", "email", "copywriting"], viewCount: 1456, copyCount: 623, likeCount: 256, createdAt: daysAgo(16) }),
    prompt("SQL Query Generator", "Convert natural language to optimized SQL", `You are a database expert.\n\n## Task\nWrite an optimized SQL query for:\n[Describe what you need]\n\n## Requirements\n- Include schema assumptions\n- Explain query logic\n- Add indexes recommendations\n- Handle edge cases`, categories.coding, marcusId, { platform: "CURSOR", tone: "TECHNICAL", outputFormat: "CODE", tags: ["sql", "database", "queries"], viewCount: 1876, copyCount: 876, likeCount: 345, createdAt: daysAgo(15) }),
    prompt("Blog Post Outline Creator", "Structured outlines for engaging blog posts", `You are a content director.\n\n## Task\nCreate a detailed blog post outline about:\n[Topic]\n\n## Requirements\n- Compelling title options (5)\n- Introduction angle\n- 5-7 main sections with sub-points\n- Conclusion strategy\n- SEO keywords to include`, categories.writing, ninaId, { platform: "CLAUDE", tags: ["blog", "outline", "content"], viewCount: 1234, copyCount: 567, likeCount: 234, createdAt: daysAgo(14) }),
    prompt("Resume Optimizer", "ATS-friendly resume improvement suggestions", `You are an HR expert.\n\n## Task\nOptimize this resume section:\n[Paste resume]\n\n## Requirements\n- ATS keyword suggestions\n- Strong action verbs\n- Quantified achievements\n- Formatting tips`, categories.business, omarId, { platform: "GEMINI", tags: ["resume", "career", "ats"], viewCount: 3456, copyCount: 1234, likeCount: 567, createdAt: daysAgo(13) }),
    prompt("Product Description Writer", "Compelling product descriptions that sell", `You are an e-commerce copywriter.\n\n## Task\nWrite a product description for:\n[Product]\nFeatures: [list]\n\n## Requirements\n- Benefits-focused copy\n- Sensory language\n- SEO keywords\n- Variants for different audiences`, categories.marketing, fatimaId, { platform: "CHATGPT", tone: "PERSUASIVE", tags: ["ecommerce", "product", "copywriting"], viewCount: 890, copyCount: 432, likeCount: 176, createdAt: daysAgo(12) }),
    prompt("Unit Test Writer", "Comprehensive unit tests for your code", `You are a QA engineer.\n\n## Task\nWrite comprehensive unit tests for:\n[Paste code]\nFramework: [jest/vitest/etc]\n\n## Requirements\n- Cover edge cases\n- Mock external dependencies\n- Meaningful test descriptions\n- Arrange-Act-Assert pattern`, categories.coding, henryId, { platform: "CURSOR", tone: "TECHNICAL", outputFormat: "CODE", tags: ["testing", "unit-tests", "qa"], viewCount: 1123, copyCount: 543, likeCount: 234, createdAt: daysAgo(11) }),
    prompt("Meeting Agenda Generator", "Productive meeting agendas in seconds", `You are a meeting facilitator.\n\n## Task\nCreate a meeting agenda for:\n[Meeting purpose]\nDuration: [minutes]\nParticipants: [list]\n\n## Requirements\n- Clear objectives\n- Time-boxed sections\n- Owner per item\n- Follow-up plan`, categories.business, jamesId, { platform: "PERPLEXITY", tags: ["meeting", "agenda", "productivity"], viewCount: 765, copyCount: 345, likeCount: 145, createdAt: daysAgo(10) }),
    prompt("Email Responder", "Professional email responses for any situation", `You are an executive assistant.\n\n## Task\nDraft a professional response to:\n[Paste email]\n\n## Requirements\n- Appropriate tone\n- Clear and concise\n- Address all points\n- Actionable next steps`, categories.business, sofiaId, { platform: "CLAUDE", tone: "PROFESSIONAL", tags: ["email", "communication", "assistant"], viewCount: 1678, copyCount: 789, likeCount: 312, createdAt: daysAgo(9) }),
    prompt("Chatbot Conversation Designer", "Design natural AI conversation flows", `You are a conversation designer.\n\n## Task\nDesign a chatbot conversation for:\n[Use case]\n\n## Requirements\n- User intent discovery\n- Natural follow-up questions\n- Fallback handling\n- Error recovery\n- Handoff to human`, categories.technical, yukiId, { platform: "GENERIC", tone: "CREATIVE", length: "LONG", tags: ["chatbot", "conversation", "ai"], viewCount: 654, copyCount: 298, likeCount: 123, createdAt: daysAgo(8) }),
    prompt("Code Documentation Generator", "Generate clear documentation from code", `You are a technical writer.\n\n## Task\nDocument the following code:\n[Paste code]\n\n## Requirements\n- Function-level comments\n- Usage examples\n- Parameters and return values\n- Edge cases noted`, categories.technical, adminId, { platform: "GITHUB_COPILOT", tone: "TECHNICAL", tags: ["documentation", "code", "technical-writing"], viewCount: 987, copyCount: 456, likeCount: 178, createdAt: daysAgo(7) }),
    prompt("Startup Pitch Deck Outline", "Structure your pitch for investors", `You are a startup advisor.\n\n## Task\nCreate a pitch deck outline for:\n[Startup idea]\n\n## Requirements\n- Problem slide framing\n- Solution positioning\n- Market size logic\n- Business model\n- Traction slide\n- Ask structure`, categories.business, leoId, { platform: "GEMINI", tags: ["startup", "pitch", "investors"], viewCount: 2345, copyCount: 987, likeCount: 456, createdAt: daysAgo(6) }),
    prompt("Language Learning Tutor", "Practice conversations in any language", `You are a language tutor.\n\n## Task\nHelp me practice:\nLanguage: [language]\nLevel: [beginner/intermediate/advanced]\n\n## Requirements\n- Correct my mistakes\n- Explain grammar naturally\n- Build vocabulary in context\n- Adapt difficulty`, categories.education, graceId, { platform: "CHATGPT", tone: "FRIENDLY", tags: ["language", "learning", "tutor"], viewCount: 1567, copyCount: 678, likeCount: 345, createdAt: daysAgo(5) }),
    prompt("API Design Consultant", "Design clean REST APIs", `You are an API architect.\n\n## Task\nDesign a REST API for:\n[Describe the system]\n\n## Requirements\n- Resource modeling\n- Endpoint naming\n- Status codes strategy\n- Error handling format\n- Versioning approach\n- Auth design`, categories.coding, marcusId, { platform: "CURSOR", tone: "TECHNICAL", complexity: "EXPERT", tags: ["api", "rest", "architecture"], viewCount: 876, copyCount: 398, likeCount: 167, createdAt: daysAgo(4) }),
    prompt("Social Media Calendar", "30-day content calendar for any brand", `You are a social media manager.\n\n## Task\nCreate a 30-day content calendar for:\n[Brand/Business]\nPlatforms: [list]\n\n## Requirements\n- Content pillars per day\n- Platform-specific formats\n- Trending topic hooks\n- Engagement ideas`, categories.marketing, emilyId, { platform: "GENERIC", tags: ["social-media", "calendar", "content"], viewCount: 1345, copyCount: 654, likeCount: 289, createdAt: daysAgo(3) }),
    prompt("Technical Interview Coach", "Practice coding interview questions", `You are a technical interview coach.\n\n## Task\nConduct a mock interview on:\n[Topic: algorithms/system design]\n\n## Requirements\n- Ask one question at a time\n- Give hints when stuck\n- Evaluate my approach\n- Suggest improvements\n- Track my progress`, categories.education, henryId, { platform: "GROK", tone: "FRIENDLY", tags: ["interview", "career", "coding"], viewCount: 1023, copyCount: 487, likeCount: 234, createdAt: daysAgo(2) }),
    prompt("Newsletter Template", "Engaging newsletter that readers open", `You are an email marketing expert.\n\n## Task\nCreate a newsletter for:\n[Topic/Audience]\n\n## Requirements\n- Strong subject line\n- Scannable layout\n- Value-first content\n- Clear CTA\n- Personalization tips`, categories.marketing, sarahId, { platform: "CHATGPT", tags: ["newsletter", "email", "marketing"], viewCount: 987, copyCount: 456, likeCount: 198, createdAt: daysAgo(1) }),
    // Paid marketplace listings
    prompt("Ultimate Code Generator Pro", "Premium code generation system with architecture patterns", `You are an elite code generation system.\n\n## Capabilities\n- Full-stack application scaffolding\n- Clean Architecture patterns\n- TypeScript best practices\n- Microservices design\n\n## Task\nGenerate:\n[Describe the application]\n\n## Output\n- Complete file structure\n- Production-ready code\n- Configuration files\n- Deployment guide`, categories.coding, adminId, { platform: "CHATGPT", tone: "TECHNICAL", complexity: "EXPERT", length: "VERY_LONG", tags: ["premium", "code-generation", "architecture"], price: 19.99, isFeatured: true, viewCount: 12453, copyCount: 5321, likeCount: 987, createdAt: daysAgo(25) }),
    prompt("Content Marketing Suite", "Complete content system for content teams", `You are a content marketing director.\n\n## Task\nBuild a complete content strategy including:\n1. Editorial calendar framework\n2. Content pillars and themes\n3. Distribution playbook\n4. Analytics dashboard structure\n5. Repurposing workflows`, categories.marketing, emilyId, { platform: "CLAUDE", tone: "PROFESSIONAL", length: "VERY_LONG", tags: ["premium", "content-marketing", "suite"], price: 14.99, viewCount: 8765, copyCount: 3987, likeCount: 654, createdAt: daysAgo(23) }),
    prompt("Data Science Toolkit", "Professional data science workflow toolkit", `You are a data science lead.\n\n## Task\nCreate a data science toolkit covering:\n1. Data cleaning pipelines\n2. Feature engineering playbook\n3. Model selection framework\n4. Evaluation methodology\n5. Production deployment guide`, categories.analysis, marcusId, { platform: "GEMINI", complexity: "EXPERT", length: "VERY_LONG", tags: ["premium", "data-science", "ml"], price: 24.99, viewCount: 6543, copyCount: 2987, likeCount: 543, createdAt: daysAgo(21) }),
    prompt("Creative Writing Master", "Advanced creative writing system", `You are a published author and writing coach.\n\n## Task\nGuide the user through creative writing with:\n1. Story structure frameworks\n2. Character development arcs\n3. World-building systems\n4. Dialogue techniques\n5. Revision methodology`, categories.creative, sarahId, { platform: "CLAUDE", tone: "CREATIVE", length: "VERY_LONG", tags: ["premium", "writing", "creative"], price: 12.99, isFeatured: true, viewCount: 15432, copyCount: 6543, likeCount: 1234, createdAt: daysAgo(19) }),
    prompt("Business Strategy Pro", "Strategic planning framework for founders", `You are a business strategist.\n\n## Task\nDevelop a business strategy including:\n1. Market analysis framework\n2. Competitive positioning\n3. Growth channels\n4. Financial modeling\n5. Risk assessment\n6. Execution roadmap`, categories.business, leoId, { platform: "PERPLEXITY", tone: "PROFESSIONAL", complexity: "ADVANCED", length: "VERY_LONG", tags: ["premium", "strategy", "business"], price: 29.99, viewCount: 4321, copyCount: 1987, likeCount: 345, createdAt: daysAgo(17) }),
    prompt("UI/UX Design Assistant", "Professional design thinking system", `You are a senior product designer.\n\n## Task\nGuide design work with:\n1. User research frameworks\n2. Wireframing methodology\n3. Design system patterns\n4. Usability testing guides\n5. Accessibility checklist`, categories.creative, isabelId, { platform: "MIDJOURNEY", tone: "CREATIVE", tags: ["premium", "design", "ui-ux"], price: 17.99, viewCount: 7890, copyCount: 3456, likeCount: 789, createdAt: daysAgo(15) }),
    prompt("DevOps Automation Blueprint", "Complete CI/CD automation system", `You are a DevOps architect.\n\n## Task\nCreate a complete automation blueprint:\n1. CI/CD pipeline design\n2. Infrastructure as Code\n3. Monitoring and alerting\n4. Security scanning\n5. Cost optimization`, categories.technical, adminId, { platform: "GITHUB_COPILOT", tone: "TECHNICAL", complexity: "EXPERT", tags: ["premium", "devops", "ci-cd"], price: 34.99, viewCount: 5678, copyCount: 2456, likeCount: 456, createdAt: daysAgo(13) }),
    prompt("Email Funnel Architect", "Email sequences that convert leads", `You are an email marketing strategist.\n\n## Task\nDesign email funnels:\n1. Lead magnet sequence\n2. Welcome sequence\n3. Nurture sequence\n4. Sales sequence\n5. Win-back sequence`, categories.marketing, emilyId, { platform: "CHATGPT", tone: "PERSUASIVE", tags: ["premium", "email", "funnel"], price: 11.99, viewCount: 4321, copyCount: 1876, likeCount: 345, createdAt: daysAgo(11) }),
    prompt("AI Prompt Engineering Masterclass", "Learn to craft prompts like an expert", `You are an AI prompt engineering instructor.\n\n## Task\nTeach prompt engineering covering:\n1. Prompt structure fundamentals\n2. Role prompting techniques\n3. Few-shot examples\n4. Chain-of-thought\n5. Evaluation methods\n6. Common pitfalls`, categories.education, yukiId, { platform: "GENERIC", tone: "FRIENDLY", tags: ["premium", "prompt-engineering", "course"], price: 22.99, viewCount: 9876, copyCount: 4567, likeCount: 987, createdAt: daysAgo(9) }),
    prompt("Financial Analyst Copilot", "Financial analysis and modeling system", `You are a financial analyst.\n\n## Task\nPerform financial analysis:\n1. Financial statement review\n2. Ratio analysis\n3. Valuation methods\n4. Risk assessment\n5. Investment recommendations`, categories.business, jamesId, { platform: "PERPLEXITY", tone: "PROFESSIONAL", complexity: "ADVANCED", tags: ["premium", "finance", "analysis"], price: 27.99, viewCount: 3456, copyCount: 1567, likeCount: 234, createdAt: daysAgo(7) }),
    // More free prompts
    prompt("Meeting Notes Summarizer", "Transform meeting notes into action items", `You are an executive assistant.\n\n## Task\nSummarize these meeting notes:\n[Paste notes]\n\n## Output\n- Key decisions\n- Action items with owners\n- Follow-up dates\n- Open questions`, categories.business, ninaId, { platform: "CLAUDE", tags: ["meeting", "summary", "productivity"], viewCount: 2345, copyCount: 1234, likeCount: 456, createdAt: daysAgo(6) }),
    prompt("Research Paper Summarizer", "Summarize academic papers efficiently", `You are an academic research assistant.\n\n## Task\nSummarize this paper:\n[Paste abstract or text]\n\n## Requirements\n- Research question\n- Methodology overview\n- Key findings\n- Limitations\n- Practical implications`, categories.education, lisaId, { platform: "GEMINI", tone: "PROFESSIONAL", tags: ["research", "academic", "summary"], viewCount: 1876, copyCount: 876, likeCount: 345, createdAt: daysAgo(5) }),
    prompt("Interview Question Generator", "Role-specific interview questions", `You are an HR specialist.\n\n## Task\nGenerate interview questions for:\nRole: [position]\nLevel: [junior/mid/senior]\n\n## Requirements\n- Behavioral questions\n- Technical questions\n- Role-specific scenarios\n- Culture fit questions`, categories.business, fatimaId, { platform: "CHATGPT", tags: ["interview", "hr", "questions"], viewCount: 1234, copyCount: 567, likeCount: 234, createdAt: daysAgo(4) }),
    prompt("Code Refactoring Advisor", "Improve code structure and maintainability", `You are a software architect.\n\n## Task\nRefactor this code:\n[Paste code]\n\n## Requirements\n- Identify code smells\n- Suggest design patterns\n- Show before/after examples\n- Explain trade-offs`, categories.coding, henryId, { platform: "CURSOR", tone: "TECHNICAL", complexity: "ADVANCED", tags: ["refactoring", "clean-code", "patterns"], viewCount: 987, copyCount: 456, likeCount: 178, createdAt: daysAgo(3) }),
    prompt("Travel Itinerary Planner", "Detailed travel plans in minutes", `You are a travel planner.\n\n## Task\nCreate a travel itinerary for:\nDestination: [city]\nDuration: [days]\nBudget: [amount]\nInterests: [list]\n\n## Requirements\n- Day-by-day plan\n- Budget breakdown\n- Local tips\n- Restaurant recommendations\n- Backup plans`, categories.creative, graceId, { platform: "PERPLEXITY", tone: "FRIENDLY", tags: ["travel", "itinerary", "planning"], viewCount: 3456, copyCount: 2345, likeCount: 789, createdAt: daysAgo(2) }),
    prompt("Habit Builder Coach", "Design habit systems that stick", `You are a habit formation coach.\n\n## Task\nHelp me build a habit system for:\n[Habit]\n\n## Requirements\n- Tiny habits approach\n- Trigger design\n- Reward scheduling\n- Progress tracking\n- Slip recovery plan`, categories.education, sarahId, { platform: "CHATGPT", tone: "FRIENDLY", tags: ["habits", "productivity", "coaching"], viewCount: 876, copyCount: 398, likeCount: 167, createdAt: daysAgo(1) }),
    prompt("Podcast Episode Planner", "Structure engaging podcast episodes", `You are a podcast producer.\n\n## Task\nPlan a podcast episode:\nTopic: [topic]\nDuration: [minutes]\nFormat: [interview/solo/panel]\n\n## Requirements\n- Episode outline with timestamps\n- Intro hook\n- Key talking points\n- Audience questions\n- Outro and CTA`, categories.writing, ninaId, { platform: "CLAUDE", tags: ["podcast", "content", "planning"], viewCount: 654, copyCount: 298, likeCount: 123, createdAt: daysAgo(1) }),
    prompt("Grant Proposal Writer", "Compelling grant proposals that win funding", `You are a grant writing expert.\n\n## Task\nWrite a grant proposal for:\n[Project]\nOrganization: [describe]\n\n## Requirements\n- Problem statement\n- Solution overview\n- Budget justification\n- Impact metrics\n- Sustainability plan`, categories.business, leoId, { platform: "GEMINI", tone: "PROFESSIONAL", tags: ["grants", "funding", "proposal"], viewCount: 543, copyCount: 234, likeCount: 98, createdAt: daysAgo(1) }),
    prompt("Course Curriculum Designer", "Build effective learning experiences", `You are an instructional designer.\n\n## Task\nDesign a course curriculum for:\nTopic: [topic]\nAudience: [level]\nDuration: [weeks]\n\n## Requirements\n- Learning objectives\n- Module breakdown\n- Assessment strategy\n- Engagement techniques\n- Resource list`, categories.education, lisaId, { platform: "CHATGPT", tags: ["course", "curriculum", "education"], viewCount: 765, copyCount: 345, likeCount: 156, createdAt: daysAgo(1) }),
    prompt("Cybersecurity Audit Checklist", "Security assessment framework", `You are a security auditor.\n\n## Task\nCreate a cybersecurity audit checklist for:\n[System/Organization]\n\n## Requirements\n- Asset inventory\n- Access control review\n- Vulnerability scanning\n- Incident response plan\n- Compliance checkpoints`, categories.technical, adminId, { platform: "GROK", tone: "TECHNICAL", complexity: "ADVANCED", tags: ["security", "audit", "cybersecurity"], viewCount: 987, copyCount: 456, likeCount: 234, createdAt: daysAgo(1) }),
    prompt("Storyboard Creator", "Visual storytelling through storyboards", `You are a film director.\n\n## Task\nCreate a storyboard for:\n[Video concept]\nDuration: [seconds/minutes]\n\n## Requirements\n- Scene-by-scene breakdown\n- Shot types\n- Camera angles\n- Visual descriptions\n- Dialogue cues`, categories.creative, isabelId, { platform: "RUNWAY", tone: "CREATIVE", tags: ["storyboard", "video", "film"], viewCount: 456, copyCount: 198, likeCount: 87, createdAt: daysAgo(1) }),
    prompt("Product Roadmap Builder", "Strategic product planning framework", `You are a product manager.\n\n## Task\nCreate a product roadmap for:\n[Product]\nTimeline: [quarter/year]\n\n## Requirements\n- Vision statement\n- Priority framework\n- Quarter-by-quarter themes\n- Success metrics\n- Resource considerations`, categories.business, marcusId, { platform: "CHATGPT", tone: "PROFESSIONAL", tags: ["product", "roadmap", "planning"], viewCount: 876, copyCount: 398, likeCount: 178, createdAt: daysAgo(1) }),
    prompt("Socratic Tutor", "Learn through guided questioning", `You are a Socratic tutor.\n\n## Task\nHelp me understand:\n[Topic]\n\n## Method\n- Ask guiding questions\n- Never give direct answers immediately\n- Build on my responses\n- Correct misconceptions gently\n- Summarize learning at the end`, categories.education, lisaId, { platform: "CLAUDE", tone: "FRIENDLY", tags: ["tutor", "socratic", "learning"], viewCount: 654, copyCount: 298, likeCount: 145, createdAt: daysAgo(1) }),
    prompt("Database Schema Designer", "Design efficient database schemas", `You are a database architect.\n\n## Task\nDesign a database schema for:\n[System description]\n\n## Requirements\n- Entity relationship design\n- Normalization decisions\n- Index strategy\n- Partitioning considerations\n- Query patterns optimization`, categories.coding, marcusId, { platform: "CURSOR", tone: "TECHNICAL", complexity: "EXPERT", tags: ["database", "schema", "architecture"], viewCount: 543, copyCount: 245, likeCount: 123, createdAt: daysAgo(1) }),
    prompt("Contract Review Assistant", "Identify risks in legal documents", `You are a legal assistant.\n\n## Task\nReview this contract section:\n[Paste text]\n\n## Requirements\n- Identify risky clauses\n- Plain-language explanations\n- Suggested negotiation points\n- Missing provisions to watch`, categories.business, sofiaId, { platform: "PERPLEXITY", tone: "PROFESSIONAL", tags: ["legal", "contract", "review"], viewCount: 765, copyCount: 345, likeCount: 156, createdAt: daysAgo(1) }),
    prompt("AI Image Prompt Crafter", "Professional image generation prompts", `You are a visual prompt engineer.\n\n## Task\nCraft image generation prompts for:\n[Concept]\n\n## Requirements\n- Detailed scene description\n- Lighting and mood\n- Composition guidance\n- Style references\n- Negative prompts\n- Variations`, categories.creative, isabelId, { platform: "MIDJOURNEY", tone: "CREATIVE", tags: ["image", "midjourney", "art"], viewCount: 2345, copyCount: 1234, likeCount: 567, createdAt: daysAgo(1) }),
    prompt("Weekly Planning System", "Plan productive weeks strategically", `You are a productivity coach.\n\n## Task\nPlan my week around:\nGoals: [list 3-5]\nObligations: [list]\n\n## Requirements\n- Priority matrix\n- Time blocking\n- Energy management\n- Buffer scheduling\n- Review prompts`, categories.business, yukiId, { platform: "CHATGPT", tags: ["productivity", "planning", "goals"], viewCount: 876, copyCount: 456, likeCount: 234, createdAt: daysAgo(1) }),
    prompt("DevOps Incident Commander", "Handle production incidents calmly", `You are a DevOps incident commander.\n\n## Task\nGuide incident response for:\n[Describe incident]\n\n## Requirements\n- Severity assessment\n- Communication protocol\n- Troubleshooting steps\n- Rollback strategy\n- Post-mortem template`, categories.technical, adminId, { platform: "GITHUB_COPILOT", tone: "TECHNICAL", complexity: "ADVANCED", tags: ["devops", "incident", "sre"], viewCount: 654, copyCount: 298, likeCount: 134, createdAt: daysAgo(1) }),
    prompt("Case Study Architect", "Compelling case studies that convert", `You are a B2B content strategist.\n\n## Task\nCreate a case study outline for:\n[Client/Product]\n\n## Requirements\n- Problem framing\n- Solution narrative\n- Measurable results\n- Client quotes style\n- Visual data suggestions`, categories.marketing, emilyId, { platform: "CHATGPT", tags: ["case-study", "b2b", "content"], viewCount: 543, copyCount: 245, likeCount: 112, createdAt: daysAgo(1) }),
    prompt("Job Description Writer", "Clear job descriptions that attract talent", `You are an HR content writer.\n\n## Task\nWrite a job description for:\nRole: [position]\nCompany: [describe]\n\n## Requirements\n- Compelling summary\n- Responsibilities list\n- Requirements section\n- Culture and perks\n- Inclusive language`, categories.business, fatimaId, { platform: "CLAUDE", tone: "FRIENDLY", tags: ["hiring", "job-description", "hr"], viewCount: 987, copyCount: 456, likeCount: 189, createdAt: daysAgo(1) }),
    prompt("System Design Interviewer", "Practice scalable system design", `You are a system design interviewer.\n\n## Task\nAsk me about designing:\n[System, e.g. Twitter]\n\n## Requirements\n- Clarify requirements first\n- Estimate scale\n- Design high-level architecture\n- Deep dive on critical components\n- Discuss trade-offs`, categories.education, henryId, { platform: "GROK", tone: "TECHNICAL", complexity: "EXPERT", tags: ["system-design", "interview", "architecture"], viewCount: 765, copyCount: 345, likeCount: 178, createdAt: daysAgo(1) }),
    prompt("Brand Voice Generator", "Consistent brand voice guidelines", `You are a brand strategist.\n\n## Task\nDevelop brand voice guidelines for:\n[Brand]\n\n## Requirements\n- Voice attributes\n- Tone variations by channel\n- Do/Don't examples\n- Vocabulary preferences\n- Content style guide`, categories.marketing, sarahId, { platform: "GEMINI", tone: "CREATIVE", tags: ["brand", "voice", "guidelines"], viewCount: 654, copyCount: 298, likeCount: 145, createdAt: daysAgo(1) }),
    prompt("Git Commit Message Writer", "Meaningful commit messages", `You are a senior engineer.\n\n## Task\nWrite commit messages for:\n[Paste git diff]\n\n## Requirements\n- Conventional Commits format\n- Concise summaries\n- Detailed bodies\n- Breaking change notes`, categories.coding, marcusId, { platform: "GITHUB_COPILOT", tone: "TECHNICAL", length: "SHORT", tags: ["git", "commits", "workflow"], viewCount: 876, copyCount: 456, likeCount: 234, createdAt: daysAgo(1) }),
    prompt("Financial Literacy Tutor", "Understand money fundamentals", `You are a finance educator.\n\n## Task\nTeach me about:\n[Topic: budgeting/investing/taxes]\n\n## Requirements\n- Start with fundamentals\n- Use real examples\n- Avoid jargon\n- Actionable steps\n- Common mistakes to avoid`, categories.education, jamesId, { platform: "CHATGPT", tone: "FRIENDLY", tags: ["finance", "education", "money"], viewCount: 543, copyCount: 234, likeCount: 123, createdAt: daysAgo(1) }),
    prompt("Restaurant Menu Engineer", "Profitable menu design", `You are a restaurant consultant.\n\n## Task\nOptimize a menu for:\n[Restaurant concept]\n\n## Requirements\n- Menu psychology principles\n- Pricing strategy\n- Item placement\n- Descriptions that sell\n- Upsell opportunities`, categories.business, omarId, { platform: "PERPLEXITY", tags: ["restaurant", "menu", "business"], viewCount: 432, copyCount: 198, likeCount: 87, createdAt: daysAgo(1) }),
    prompt("Web Accessibility Auditor", "Inclusive web experiences", `You are an accessibility expert.\n\n## Task\nAudit this code/page for accessibility:\n[Paste HTML/code]\n\n## Requirements\n- WCAG 2.2 checkpoints\n- ARIA usage review\n- Keyboard navigation\n- Color contrast\n- Screen reader flow`, categories.technical, graceId, { platform: "CURSOR", tone: "TECHNICAL", tags: ["accessibility", "a11y", "web"], viewCount: 765, copyCount: 345, likeCount: 167, createdAt: daysAgo(1) }),
    prompt("Cold Email Generator", "Cold emails that get replies", `You are a sales development expert.\n\n## Task\nWrite a cold email to:\n[Prospect description]\n\n## Requirements\n- Personalized opening\n- Specific value proposition\n- Social proof\n- Low-friction CTA\n- Follow-up sequence`, categories.business, emilyId, { platform: "CHATGPT", tone: "PERSUASIVE", tags: ["cold-email", "sales", "outreach"], viewCount: 2345, copyCount: 1234, likeCount: 456, createdAt: daysAgo(1) }),
    prompt("Mental Health Journal Prompts", "Thoughtful journaling guidance", `You are a mindful journaling guide.\n\n## Task\nProvide journaling prompts for:\n[Focus: gratitude/reflection/stress]\n\n## Requirements\n- Open-ended questions\n- Non-judgmental framing\n- Progressive depth\n- Reflection summary prompts`, categories.creative, ninaId, { platform: "CLAUDE", tone: "FRIENDLY", tags: ["journaling", "wellness", "reflection"], viewCount: 876, copyCount: 398, likeCount: 234, createdAt: daysAgo(1) }),
  ];

  const promptIds: Record<string, string> = {};
  for (let i = 0; i < promptsData.length; i++) {
    const created = await prisma.prompt.create({
      data: promptsData[i],
    });
    promptIds[created.title] = created.id;
  }
  console.log(`Created ${promptsData.length} prompts`);

  // --- Tags ---
  const tagNames = ["code", "review", "debugging", "story", "creative", "writing", "data", "analysis", "seo", "marketing", "business", "education", "premium", "ai", "productivity"];
  const tags: Record<string, string> = {};
  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const created = await prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    tags[name] = created.id;
  }
  console.log(`Created ${Object.keys(tags).length} tags`);

  // --- Subscriptions ---
  const subscriptionData = [
    { userId: sarahId, plan: "PRO" as any, status: "ACTIVE" as any, createdAt: daysAgo(60), periodEnd: daysAgo(-30) },
    { userId: marcusId, plan: "TEAM" as any, status: "ACTIVE" as any, createdAt: daysAgo(45), periodEnd: daysAgo(-15) },
    { userId: emilyId, plan: "PRO" as any, status: "ACTIVE" as any, createdAt: daysAgo(30), periodEnd: daysAgo(0) },
    { userId: yukiId, plan: "ENTERPRISE" as any, status: "ACTIVE" as any, createdAt: daysAgo(90), periodEnd: daysAgo(-60) },
    { userId: lisaId, plan: "PRO" as any, status: "ACTIVE" as any, createdAt: daysAgo(20), periodEnd: daysAgo(10) },
    { userId: leoId, plan: "PRO" as any, status: "TRIALING" as any, createdAt: daysAgo(3), periodEnd: daysAgo(-4) },
    { userId: graceId, plan: "PRO" as any, status: "TRIALING" as any, createdAt: daysAgo(5), periodEnd: daysAgo(-2) },
    { userId: fatimaId, plan: "FREE" as any, status: "CANCELED" as any, createdAt: daysAgo(30), periodEnd: daysAgo(15), canceledAt: daysAgo(15) },
    { userId: sofiaId, plan: "FREE" as any, status: "EXPIRED" as any, createdAt: daysAgo(60), periodEnd: daysAgo(30) },
    { userId: henryId, plan: "TEAM" as any, status: "ACTIVE" as any, createdAt: daysAgo(10), periodEnd: daysAgo(20) },
  ];
  for (const sub of subscriptionData) {
    await prisma.subscription.create({
      data: {
        userId: sub.userId,
        plan: sub.plan,
        status: sub.status,
        currentPeriodStart: sub.createdAt,
        currentPeriodEnd: sub.periodEnd,
        canceledAt: sub.canceledAt,
        createdAt: sub.createdAt,
      } as any,
    });
  }
  console.log(`Created ${subscriptionData.length} subscriptions`);

  // --- Usage events (spread over the last 7 days) ---
  const usageActions: Prisma.UsageCreateInput["action"][] = [
    "PROMPT_CREATE", "PROMPT_COPY", "PROMPT_SHARE", "PROMPT_GENERATE",
    "PROMPT_OPTIMIZE", "PROMPT_ANALYZE", "PROMPT_TRANSLATE",
    "FAVORITE_ADD", "FAVORITE_REMOVE", "COLLECTION_CREATE",
    "MARKETPLACE_PURCHASE", "MARKETPLACE_SELL", "PROMPT_IMPORT", "PROMPT_EXPORT",
  ];
  const allUserIds = Object.values(userIds);
  for (let i = 0; i < 300; i++) {
    const userDbId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
    const action = usageActions[Math.floor(Math.random() * usageActions.length)];
    const hour = Math.floor(Math.random() * 24);
    const dayOffset = Math.floor(Math.random() * 7);
    const createdAt = daysAgo(dayOffset);
    createdAt.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

    await prisma.usage.create({
      data: {
        userId: userDbId,
        action,
        metadata: { source: "seed" },
        createdAt,
      } as any,
    });
  }
  console.log("Created 300 usage events");

  // --- Favorites ---
  const favoritePairs: [string, string][] = [];
  const promptTitles = Object.keys(promptIds);
  for (const userDbId of [sarahId, alexId, marcusId, emilyId, jamesId, lisaId, omarId, ninaId, yukiId, fatimaId]) {
    const shuffled = [...promptTitles].sort(() => Math.random() - 0.5);
    for (const title of shuffled.slice(0, 5)) {
      favoritePairs.push([userDbId, promptIds[title]]);
    }
  }
  for (const [userId, promptId] of favoritePairs) {
    await prisma.favorite.create({
      data: { userId, promptId },
    });
  }
  console.log(`Created ${favoritePairs.length} favorites`);

  // --- Collections ---
  const collections = [
    { name: "My Favorites", description: "Prompts I use every day", userId: sarahId },
    { name: "Work Templates", description: "Ready-to-use work prompts", userId: sarahId },
    { name: "Coding Arsenal", description: "Best coding prompts", userId: marcusId },
    { name: "Content Ideas", description: "Marketing content prompts", userId: emilyId },
    { name: "Study Guides", description: "Learning and education prompts", userId: lisaId },
    { name: "Premium Tools", description: "Paid prompt collection", userId: yukiId },
  ];
  for (const col of collections) {
    await prisma.collection.create({ data: col });
  }
  console.log(`Created ${collections.length} collections`);

  // --- Templates ---
  const templates = [
    { name: "Blog Post Template", description: "Structured blog post prompt", content: "Write a blog post about [topic] targeting [audience]...", variables: JSON.stringify([{ name: "topic", type: "text" }, { name: "audience", type: "text" }]), category: "Writing", userId: sarahId },
    { name: "Code Review Template", description: "Systematic code review", content: "Review this code for [criteria]: [code]", variables: JSON.stringify([{ name: "criteria", type: "select", options: ["quality", "security", "performance"] }, { name: "code", type: "code" }]), category: "Coding", userId: marcusId },
    { name: "Email Template", description: "Professional email drafts", content: "Draft an email about [subject] to [recipient]...", variables: JSON.stringify([{ name: "subject", type: "text" }, { name: "recipient", type: "text" }]), category: "Business", userId: emilyId },
    { name: "Lesson Plan Template", description: "Educational lesson planning", content: "Create a lesson plan for [topic] at [level]...", variables: JSON.stringify([{ name: "topic", type: "text" }, { name: "level", type: "select", options: ["beginner", "intermediate", "advanced"] }]), category: "Education", userId: lisaId },
    { name: "Story Outline Template", description: "Story structure planning", content: "Outline a story about [concept] with [tone]...", variables: JSON.stringify([{ name: "concept", type: "text" }, { name: "tone", type: "select", options: ["dark", "light", "epic"] }]), category: "Creative", userId: sarahId },
    { name: "Meeting Notes Template", description: "Meeting summarization", content: "Summarize this meeting: [notes]", variables: JSON.stringify([{ name: "notes", type: "textarea" }]), category: "Business", userId: yukiId },
  ];
  for (const tpl of templates) {
    await prisma.template.create({
      data: {
        name: tpl.name,
        description: tpl.description,
        content: tpl.content,
        variables: tpl.variables,
        category: tpl.category,
        userId: tpl.userId,
        isPublic: true,
      } as any,
    });
  }
  console.log(`Created ${templates.length} templates`);

  // --- Sources & Import jobs ---
  const sources = [
    { name: "GitHub Awesome-Prompts", type: "GITHUB" as any, url: "https://github.com/awesome-prompts", isActive: true, lastSync: daysAgo(3) },
    { name: "Manual submissions", type: "MANUAL" as any, url: null, isActive: true, lastSync: null },
    { name: "Community CSV export", type: "CSV" as any, url: null, isActive: false, lastSync: daysAgo(10) },
    { name: "Markdown collection", type: "MARKDOWN" as any, url: "https://example.com/prompts.md", isActive: true, lastSync: daysAgo(1) },
  ];
  const sourceDbIds: string[] = [];
  for (const src of sources) {
    const created = await prisma.source.create({ data: src });
    sourceDbIds.push(created.id);
  }
  console.log(`Created ${sources.length} sources`);

  const importJobs = [
    { sourceId: sourceDbIds[0], status: "COMPLETED" as any, totalItems: 120, importedItems: 115, failedItems: 5, errorLog: null, completedAt: daysAgo(3) },
    { sourceId: sourceDbIds[1], status: "COMPLETED" as any, totalItems: 45, importedItems: 45, failedItems: 0, errorLog: null, completedAt: daysAgo(5) },
    { sourceId: sourceDbIds[2], status: "FAILED" as any, totalItems: 30, importedItems: 12, failedItems: 18, errorLog: "Schema mismatch on rows 13-30", completedAt: daysAgo(10) },
    { sourceId: sourceDbIds[3], status: "PROCESSING" as any, totalItems: 60, importedItems: 28, failedItems: 0, errorLog: null, completedAt: null },
    { sourceId: sourceDbIds[0], status: "PENDING" as any, totalItems: 0, importedItems: 0, failedItems: 0, errorLog: null, completedAt: null },
  ];
  for (const job of importJobs) {
    await prisma.importJob.create({ data: job });
  }
  console.log(`Created ${importJobs.length} import jobs`);

  // --- Settings ---
  await prisma.setting.upsert({
    where: { id: "default" },
    update: {
      siteName: "PromptOS",
      siteDescription: "Professional AI prompt management platform",
      supportEmail: "support@promptos.com",
      maintenanceMode: false,
      defaultPlan: "FREE",
      trialDays: 7,
      allowRegistration: true,
      metadata: { launchedAt: new Date("2026-01-01").toISOString() },
    },
    create: {
      id: "default",
      siteName: "PromptOS",
      siteDescription: "Professional AI prompt management platform",
      supportEmail: "support@promptos.com",
      maintenanceMode: false,
      defaultPlan: "FREE",
      trialDays: 7,
      allowRegistration: true,
      metadata: { launchedAt: new Date("2026-01-01").toISOString() },
    } as any,
  });
  console.log("Settings configured");

  // --- Discount codes ---
  await prisma.discountCode.createMany({
    data: [
      { code: "LAUNCH20", description: "20% off any plan - Launch special", discountType: "PERCENTAGE", discountValue: 20, maxUses: 200, usedCount: 145, validUntil: new Date("2026-12-31"), isActive: true },
      { code: "WELCOME10", description: "10% off for new users", discountType: "PERCENTAGE", discountValue: 10, maxUses: null, usedCount: 456, validUntil: null, isActive: true },
      { code: "PRO50", description: "50% off Pro plan - Limited time", discountType: "PERCENTAGE", discountValue: 50, maxUses: 50, usedCount: 23, validUntil: new Date("2026-09-30"), isActive: true },
    ],
  });
  console.log("Created 3 discount codes");

  // --- Gamification: XP / levels / badges / streaks ---
  const idToName: Record<string, string> = {};
  for (const u of usersData) idToName[userIds[u.clerkId]] = u.name;

  const gamUsers: Record<string, { xp: number; level: number; badges: string[]; streakDays: number; questsDone: number; duelsVoted: number; duelsWon: number; copiesCount: number; favoritesCount: number }> = {
    [sarahId]:  { xp: 8900, level: 16, badges: ["first_spark", "copier", "collector", "streak_7", "dueler", "kingmaker", "level_5", "level_10", "contestant", "champion", "explorer"], streakDays: 12, questsDone: 34, duelsVoted: 24, duelsWon: 13, copiesCount: 36, favoritesCount: 24 },
    [adminId]:  { xp: 6200, level: 13, badges: ["first_spark", "streak_3", "level_5", "level_10", "contestant"], streakDays: 6, questsDone: 21, duelsVoted: 9, duelsWon: 2, copiesCount: 14, favoritesCount: 9 },
    [alexId]:   { xp: 4100, level: 10, badges: ["first_spark", "streak_3", "dueler", "level_5", "level_10"], streakDays: 4, questsDone: 17, duelsVoted: 20, duelsWon: 6, copiesCount: 11, favoritesCount: 7 },
    [omarId]:   { xp: 3800, level: 9, badges: ["first_spark", "streak_3", "level_5"], streakDays: 5, questsDone: 12, duelsVoted: 8, duelsWon: 3, copiesCount: 8, favoritesCount: 5 },
    [emilyId]:  { xp: 2800, level: 8, badges: ["first_spark", "streak_7", "level_5"], streakDays: 8, questsDone: 14, duelsVoted: 5, duelsWon: 2, copiesCount: 10, favoritesCount: 11 },
    [ninaId]:   { xp: 2600, level: 7, badges: ["first_spark", "level_5"], streakDays: 2, questsDone: 9, duelsVoted: 4, duelsWon: 1, copiesCount: 6, favoritesCount: 4 },
    [marcusId]: { xp: 1500, level: 5, badges: ["first_spark", "streak_3", "level_5"], streakDays: 3, questsDone: 8, duelsVoted: 12, duelsWon: 4, copiesCount: 7, favoritesCount: 3 },
    [yukiId]:   { xp: 900, level: 4, badges: ["first_spark"], streakDays: 1, questsDone: 4, duelsVoted: 2, duelsWon: 0, copiesCount: 3, favoritesCount: 2 },
    [jamesId]:  { xp: 700, level: 3, badges: ["first_spark", "streak_3"], streakDays: 3, questsDone: 6, duelsVoted: 3, duelsWon: 1, copiesCount: 5, favoritesCount: 1 },
    [lisaId]:   { xp: 180, level: 2, badges: ["first_spark"], streakDays: 1, questsDone: 2, duelsVoted: 1, duelsWon: 0, copiesCount: 2, favoritesCount: 0 },
  };
  for (const [id, g] of Object.entries(gamUsers)) {
    await prisma.user.update({
      where: { id },
      data: { xp: g.xp, level: g.level, badges: g.badges, streakDays: g.streakDays, questsDone: g.questsDone, duelsVoted: g.duelsVoted, duelsWon: g.duelsWon, copiesCount: g.copiesCount, favoritesCount: g.favoritesCount },
    });
  }
  console.log(`🎮 Gamification: ${Object.keys(gamUsers).length} users leveled`);

  // --- Duels (2 active + 2 finished) ---
  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
  const duelData = [
    { promptA: "Expert Code Review Assistant", promptB: "Resume Optimizer", votesA: 48, votesB: 37, isActive: true, endsAt: hoursAgo(-26), createdAt: hoursAgo(20) },
    { promptA: "Creative Story Generator", promptB: "LinkedIn Post Generator", votesA: 62, votesB: 55, isActive: true, endsAt: hoursAgo(-14), createdAt: hoursAgo(5) },
    { promptA: "SQL Query Generator", promptB: "Bug-Fixing Assistant", votesA: 39, votesB: 21, isActive: false, endsAt: hoursAgo(2), createdAt: hoursAgo(48), winner: "SQL Query Generator" },
    { promptA: "Data Analysis Framework", promptB: "Math Problem Solver", votesA: 25, votesB: 31, isActive: false, endsAt: hoursAgo(26), createdAt: hoursAgo(72), winner: "Math Problem Solver" },
  ];
  const duelIds: string[] = [];
  for (const d of duelData) {
    const created = await prisma.duel.create({
      data: {
        promptAId: promptIds[d.promptA],
        promptBId: promptIds[d.promptB],
        votesA: d.votesA,
        votesB: d.votesB,
        isActive: d.isActive,
        endsAt: d.endsAt,
        winnerId: (d as any).winner ? promptIds[(d as any).winner] : null,
        createdAt: d.createdAt,
      },
    });
    duelIds.push(created.id);
  }
  const duelVotePairs: Array<[string, string, string]> = [
    [duelIds[0], sarahId, "Expert Code Review Assistant"],
    [duelIds[0], alexId, "Resume Optimizer"],
    [duelIds[0], emilyId, "Expert Code Review Assistant"],
    [duelIds[0], marcusId, "Resume Optimizer"],
    [duelIds[0], ninaId, "Expert Code Review Assistant"],
    [duelIds[1], sarahId, "Creative Story Generator"],
    [duelIds[1], jamesId, "LinkedIn Post Generator"],
    [duelIds[1], emilyId, "Creative Story Generator"],
    [duelIds[1], omarId, "LinkedIn Post Generator"],
    [duelIds[2], sarahId, "SQL Query Generator"],
    [duelIds[2], alexId, "SQL Query Generator"],
    [duelIds[2], emilyId, "Bug-Fixing Assistant"],
    [duelIds[2], marcusId, "SQL Query Generator"],
    [duelIds[3], sarahId, "Math Problem Solver"],
    [duelIds[3], ninaId, "Math Problem Solver"],
    [duelIds[3], jamesId, "Math Problem Solver"],
    [duelIds[3], lisaId, "Math Problem Solver"],
  ];
  for (const [duelId, userId, pickTitle] of duelVotePairs) {
    await prisma.duelVote.create({
      data: { duelId, userId, pickId: promptIds[pickTitle] },
    });
  }
  console.log(`⚔️ Duels: ${duelData.length} seeded (${duelVotePairs.length} votes)`);

  // --- Activity feed ---
  const activities = [
    { type: "level.up", userId: sarahId, metadata: { level: 16 }, createdAt: hoursAgo(1) },
    { type: "prompt.created", userId: adminId, promptTitle: "Bug-Fixing Assistant", metadata: { title: "Bug-Fixing Assistant" }, createdAt: hoursAgo(2) },
    { type: "quest.completed", userId: sarahId, metadata: { reward: 50 }, createdAt: hoursAgo(3) },
    { type: "duel.created", userId: null, metadata: { promptA: "Creative Story Generator", promptB: "LinkedIn Post Generator" }, createdAt: hoursAgo(5) },
    { type: "badge.earned", userId: alexId, metadata: { badge: "dueler" }, createdAt: hoursAgo(7) },
    { type: "prompt.copied", userId: emilyId, promptTitle: "SEO Content Strategy", metadata: { title: "SEO Content Strategy" }, createdAt: hoursAgo(9) },
    { type: "duel.voted", userId: marcusId, metadata: { duel: "Expert Code Review Assistant vs Resume Optimizer" }, createdAt: hoursAgo(12) },
    { type: "prompt.created", userId: sarahId, promptTitle: "Creative Story Generator", metadata: { title: "Creative Story Generator" }, createdAt: hoursAgo(26) },
    { type: "level.up", userId: omarId, metadata: { level: 9 }, createdAt: hoursAgo(30) },
    { type: "contest.entered", userId: ninaId, metadata: { contest: "Summer Prompt Contest" }, createdAt: hoursAgo(40) },
    { type: "prompt.favorited", userId: jamesId, promptTitle: "Math Problem Solver", metadata: { title: "Math Problem Solver" }, createdAt: hoursAgo(52) },
    { type: "quest.completed", userId: yukiId, metadata: { reward: 50 }, createdAt: hoursAgo(60) },
    { type: "duel.voted", userId: sarahId, metadata: { duel: "SQL Query Generator vs Bug-Fixing Assistant" }, createdAt: hoursAgo(70) },
    { type: "badge.earned", userId: emilyId, metadata: { badge: "streak_7" }, createdAt: hoursAgo(100) },
    { type: "prompt.created", userId: marcusId, promptTitle: "SQL Query Generator", metadata: { title: "SQL Query Generator" }, createdAt: hoursAgo(120) },
    { type: "duel.ended", userId: null, metadata: { winner: "Math Problem Solver" }, createdAt: hoursAgo(150) },
    { type: "contest.entered", userId: adminId, metadata: { contest: "Weekly Speed Contest" }, createdAt: hoursAgo(170) },
    { type: "prompt.favorited", userId: lisaId, promptTitle: "LinkedIn Post Generator", metadata: { title: "LinkedIn Post Generator" }, createdAt: hoursAgo(200) },
  ];
  for (const a of activities) {
    await prisma.activity.create({
      data: {
        type: a.type,
        userId: a.userId,
        userName: a.userId ? idToName[a.userId] : "PromptOS",
        promptId: a.promptTitle ? promptIds[a.promptTitle] : null,
        promptTitle: a.promptTitle ?? null,
        metadata: a.metadata as any,
        createdAt: a.createdAt,
      },
    });
  }
  console.log(`📡 Activity feed: ${activities.length} events`);

  console.log("\n✅ Database seeded successfully!");
  console.log(`📝 Categories: ${Object.keys(categories).length}`);
  console.log(`👤 Users: ${Object.keys(userIds).length}`);
  console.log(`📝 Prompts: ${promptsData.length}`);
  console.log(`💳 Subscriptions: ${subscriptionData.length}`);
  console.log(`📊 Usage events: 300`);
  console.log(`❤️ Favorites: ${favoritePairs.length}`);
  console.log(`📁 Collections: ${collections.length}`);
  console.log(`📋 Templates: ${templates.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
