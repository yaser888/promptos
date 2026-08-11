import type { GoalCategory, GoalQuestion, QuestionSection, QuestionSet } from "./types";

interface QuestionTemplate {
  id: string;
  section: QuestionSection;
  type: "text" | "select" | "multiSelect";
  prompt: string;
  options?: string[];
  placeholder?: string;
  required: boolean;
  categories: GoalCategory[];
}

const PLATFORM_OPTIONS = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Midjourney",
  "DALL-E",
  "Stable Diffusion",
  "Canva",
  "Figma",
  "Cursor",
  "Copilot",
  "Perplexity",
] as const;

const TONE_OPTIONS = [
  "Professional",
  "Friendly",
  "Creative",
  "Authoritative",
  "Casual",
  "Inspiring",
  "Technical",
  "Persuasive",
] as const;

const LANGUAGE_OPTIONS = [
  "English",
  "العربية",
  "Français",
  "Español",
  "Deutsch",
  "Türkçe",
  "Русский",
  "日本語",
  "한국어",
  "中文",
] as const;

const OUTPUT_FORMAT_OPTIONS = [
  "Step-by-step guide",
  "Markdown document",
  "Bullet points",
  "Table",
  "Plain text",
  "JSON",
  "HTML",
] as const;

const LENGTH_OPTIONS = ["Short", "Medium", "Detailed"] as const;

const GOAL_METRIC_OPTIONS = [
  "Awareness",
  "Leads",
  "Sales",
  "Engagement",
  "Education",
  "Efficiency",
] as const;

const contentTypes: Record<GoalCategory, string[]> = {
  marketing: ["Marketing plan", "Ad copy", "Social media plan", "Email campaign", "Landing page copy", "Sales pitch"],
  food: ["Menu description", "Marketing plan", "Social media posts", "Email announcement", "Customer response templates"],
  writing: ["Blog post", "Article", "Essay", "Story", "Script", "Poem"],
  coding: ["Code with explanation", "Code review", "API design", "Debugging help", "Architecture plan"],
  education: ["Lesson plan", "Explainer", "Quiz / exercises", "Study guide", "Course outline"],
  creative: ["Concept description", "Image prompt", "Storyboard", "Video script", "Caption set"],
  business: ["Pitch deck outline", "Business plan section", "Executive summary", "Email to investors", "Financial summary"],
  social: ["Post captions", "Video script", "Community reply templates", "Ad copy"],
  general: ["Step-by-step plan", "Template", "Guide / how-to", "Checklist"],
};

const TEMPLATES: QuestionTemplate[] = [
  {
    id: "businessType",
    section: "context",
    type: "text",
    prompt: "What type of business, project, or topic is this about?",
    required: true,
    categories: ["marketing", "food", "social", "business"],
  },
  {
    id: "country",
    section: "context",
    type: "text",
    prompt: "Which country or market are you targeting?",
    required: false,
    categories: ["marketing", "food", "business"],
  },
  {
    id: "audience",
    section: "audience",
    type: "text",
    prompt: "Who is this for? Describe your target audience.",
    required: true,
    categories: ["marketing", "food", "writing", "social", "business", "education", "general"],
  },
  {
    id: "context",
    section: "context",
    type: "text",
    prompt: "Any extra context or background I should know?",
    placeholder: "e.g. current situation, competitors, existing assets",
    required: false,
    categories: ["marketing", "food", "coding", "business", "general"],
  },
  {
    id: "budget",
    section: "constraints",
    type: "text",
    prompt: "What budget do you have in mind? Write “None” if it is not relevant.",
    required: false,
    categories: ["marketing", "food", "business", "creative"],
  },
  {
    id: "deadline",
    section: "constraints",
    type: "text",
    prompt: "What is the deadline, if any?",
    required: false,
    categories: ["marketing", "food", "coding", "creative", "business"],
  },
  {
    id: "platform",
    section: "constraints",
    type: "multiSelect",
    prompt: "Which platform or AI tool will you use this with?",
    options: [...PLATFORM_OPTIONS, "Other"],
    required: false,
    categories: ["marketing", "food", "writing", "coding", "creative", "social", "business", "general"],
  },
  {
    id: "tone",
    section: "constraints",
    type: "select",
    prompt: "Which tone should the output use?",
    options: [...TONE_OPTIONS],
    required: true,
    categories: ["marketing", "food", "writing", "creative", "social", "business", "general"],
  },
  {
    id: "language",
    section: "constraints",
    type: "select",
    prompt: "Which language should the output be in?",
    options: [...LANGUAGE_OPTIONS, "Other"],
    required: true,
    categories: ["marketing", "food", "writing", "coding", "education", "creative", "social", "business", "general"],
  },
  {
    id: "constraints",
    section: "constraints",
    type: "text",
    prompt: "Anything you want me to strictly avoid or follow?",
    placeholder: "e.g. no jargon, must mention the offer, brand voice guidelines",
    required: false,
    categories: ["marketing", "food", "writing", "coding", "education", "creative", "social", "business", "general"],
  },
  {
    id: "goalMetric",
    section: "requirements",
    type: "select",
    prompt: "What is the primary goal of this output?",
    options: [...GOAL_METRIC_OPTIONS],
    required: false,
    categories: ["marketing", "food", "social", "business"],
  },
  {
    id: "contentType",
    section: "requirements",
    type: "select",
    prompt: "What kind of content do you need?",
    required: true,
    categories: ["marketing", "food", "writing", "creative", "social", "general"],
  },
  {
    id: "stack",
    section: "requirements",
    type: "text",
    prompt: "Which programming language or framework should I use?",
    placeholder: "e.g. Python, React, Node.js",
    required: false,
    categories: ["coding"],
  },
  {
    id: "genre",
    section: "requirements",
    type: "select",
    prompt: "Which format works best for you?",
    options: ["Blog post", "Article", "Essay", "Story", "Script", "Poem", "Course lesson"],
    required: true,
    categories: ["writing", "education"],
  },
  {
    id: "topicLevel",
    section: "requirements",
    type: "select",
    prompt: "What is the audience's experience level?",
    options: ["Beginner", "Intermediate", "Advanced"],
    required: false,
    categories: ["education"],
  },
  {
    id: "style",
    section: "requirements",
    type: "select",
    prompt: "Which visual style do you prefer?",
    options: ["Minimalist", "Realistic", "Cartoonish", "Vintage", "Futuristic", "Corporate"],
    required: false,
    categories: ["creative"],
  },
  {
    id: "include",
    section: "requirements",
    type: "text",
    prompt: "Anything specific that must be included?",
    placeholder: "e.g. pricing table, menu items, keywords",
    required: false,
    categories: ["marketing", "food", "writing", "coding", "education", "creative", "social", "business", "general"],
  },
  {
    id: "outputFormat",
    section: "output",
    type: "select",
    prompt: "How should the final output be structured?",
    options: [...OUTPUT_FORMAT_OPTIONS],
    required: true,
    categories: ["marketing", "food", "writing", "coding", "education", "creative", "social", "business", "general"],
  },
  {
    id: "length",
    section: "output",
    type: "select",
    prompt: "How long should the output be?",
    options: [...LENGTH_OPTIONS],
    required: false,
    categories: ["writing", "education", "creative", "general"],
  },
  {
    id: "example",
    section: "output",
    type: "text",
    prompt: "Share an example you like (optional).",
    required: false,
    categories: ["writing", "creative"],
  },
];

const MAX_QUESTIONS = 8;

const CATEGORY_PRIORITY: GoalCategory[] = [
  "marketing",
  "social",
  "coding",
  "writing",
  "education",
  "creative",
  "business",
  "food",
];

const CATEGORY_META: Record<GoalCategory, { label: string; keywords: RegExp }> = {
  marketing: {
    label: "Marketing",
    keywords:
      /marketing|campaign|promot(?:e|ion)|advertise|ad\b|ads\b|seo|brand(?:ing)?|launch|lead\b|sale?s\b|funnel|content calendar|\bأعلان\b|\bإعلان|إعلانات|تسويق|حملة|إطلاق|ترويج|علامة تجارية|زيادة المبيعات|customers|customer acquisition/i,
  },
  food: {
    label: "Food & restaurants",
    keywords: /restaurant|cafe\b|coffee shop|bakery|food\b|menu\b|kitchen|dish\b|مطعم|مقهى|مخبز|قائمة طعام|طعام|قهوة|طبق/i,
  },
  writing: {
    label: "Writing & content",
    keywords: /write\b|article|blog|essay|story\b|poem|script|book\b|novel|edit\b|proofread|caption|article|copywriting|كتابة|مقال|قصة|رواية|مدونة|سيناريو|نص|تحرير|تدقيق/i,
  },
  coding: {
    label: "Coding & development",
    keywords: /code\b|coding|app\b|application|website|web app|software|api\b|script\b|program(?:m)?ing|function|debug|refactor|database|python|javascript|typescript|react\b|node|كود|برمجة|تطبيق|موقع|برنامج|سكربت|واجهة|قاعدة بيانات/i,
  },
  education: {
    label: "Education & learning",
    keywords: /teach|learn|course|lesson|tutor|curriculum|study|explain|tutorial|drill|quiz|تعليم|دورة|درس|شرح|منهج|تعلّم|تعلم|تدريب|امتحان/i,
  },
  creative: {
    label: "Creative & design",
    keywords: /design|logo|poster|image|illustration|photo|video\b|storyboard|animat|paint|draw|تصميم|شعار|صورة|ملصق|فيديو|رسم|إبداعي|أيقونة/i,
  },
  business: {
    label: "Business & strategy",
    keywords: /business|startup|company|investor|pitch\b|plan\b|revenue|profit|cost|hiring|strategy|عمل|شركة|مشروع|استثمار|مستثمر|خطة عمل|أرباح|إيرادات|توظيف/i,
  },
  social: {
    label: "Social media",
    keywords: /instagram|facebook|tiktok|twitter|linkedin|youtube|reel|threads|sns|social media|انستقرام|انستغرام|تيك توك|فيسبوك|تويتر|يونيوب|سناب|سوشال/i,
  },
  general: { label: "General", keywords: /./ },
};

const COUNTRY_PATTERNS: Array<{ value: string; regex: RegExp }> = [
  { value: "Saudi Arabia", regex: /السعودية|الرياض|جدة|الدمام|ksa|saudi/i },
  { value: "Egypt", regex: /مصر|القاهرة|egypt/i },
  { value: "UAE", regex: /الإمارات|دبي|أبوظبي|uae|dubai|emirates/i },
  { value: "Kuwait", regex: /الكويت|kuwait/i },
  { value: "Qatar", regex: /قطر|qatar/i },
  { value: "USA", regex: /usa|united states|america\b|us\b/i },
  { value: "UK", regex: /\buk\b|united kingdom|britain|london/i },
  { value: "Germany", regex: /germany|ألمانيا/i },
  { value: "France", regex: /france|فرنسا/i },
];

const BUSINESS_TYPE_PATTERNS: Array<{ value: string; regex: RegExp }> = [
  { value: "restaurant / café", regex: /مطعم|مقهى|restaurant|cafe\b|coffee shop/i },
  { value: "online store", regex: /متجر|متجري|online store|e-?commerce|shop\b|store\b/i },
  { value: "service business", regex: /خدماتي|service business|consultancy|agency|استشارات/i },
  { value: "software / app", regex: /تطبيق|موقع|برنامج|app\b|software|website|saas/i },
  { value: "personal brand", regex: /علامة شخصية|personal brand|influencer|مؤثر/i },
];

const PLATFORM_PATTERNS: Array<{ value: string; regex: RegExp }> = [
  { value: "Instagram", regex: /instagram|انستقرام|انستغرام/i },
  { value: "Facebook", regex: /facebook|فيسبوك/i },
  { value: "TikTok", regex: /tiktok|تيك توك|tiktok/i },
  { value: "X / Twitter", regex: /twitter|\btwitter\b|تويتر/i },
  { value: "LinkedIn", regex: /linkedin|لينكدإن|لينكدين/i },
  { value: "YouTube", regex: /youtube|يوتيوب/i },
  { value: "ChatGPT", regex: /chatgpt|شات جي بي تي/i },
  { value: "Claude", regex: /claude|كلود/i },
  { value: "Gemini", regex: /gemini|جيميني/i },
];

function detectTone(text: string): string | undefined {
  if (/professional|احترافي|رسمي/i.test(text)) return "Professional";
  if (/friendly|ودي|لطيف/i.test(text)) return "Friendly";
  if (/creative|إبداعي|مبتكر/i.test(text)) return "Creative";
  if (/casual|عادي|خفيف/i.test(text)) return "Casual";
  if (/fun|ممتع|مرح/i.test(text)) return "Friendly";
  return undefined;
}

function detectBudget(text: string): boolean {
  return /\$\s?\d+|\d+\s*(dollars?|usd|sar|egp|aed|kwd|qar|eur|ريال|جنيه|دولار|درهم|يورو|دينار)|الميزانية|ميزانية\b|\bbudget\b/i.test(
    text
  );
}

function matchCategory(text: string): GoalCategory[] {
  const normalized = ` ${text.trim()} `;
  const scores = new Map<GoalCategory, number>();
  for (const category of Object.keys(CATEGORY_META) as GoalCategory[]) {
    if (category === "general") continue;
    const re = new RegExp(CATEGORY_META[category].keywords.source, "gi");
    const matches = normalized.match(re);
    if (matches && matches.length > 0) {
      scores.set(category, matches.length);
    }
  }
  const ranked = [...scores.entries()].sort(
    (a, b) => b[1] - a[1] || CATEGORY_PRIORITY.indexOf(a[0]) - CATEGORY_PRIORITY.indexOf(b[0])
  );
  if (ranked.length === 0) return ["general"];
  const top = ranked[0][1];
  const second = ranked[1]?.[1] ?? 0;
  return (second >= top - 1 ? ranked.filter(([, score]) => score >= top - 1) : ranked.slice(0, 1)).map(
    ([c]) => c
  );
}

function restateSummary(goal: string, categories: GoalCategory[], detectedPlatforms: string[], detectedCountry?: string): string {
  const parts: string[] = [];
  const category = categories[0] ?? "general";
  parts.push(CATEGORY_META[category].label);
  if (categories.includes("food") && /مطعم|مقهى|restaurant|cafe/i.test(goal)) parts.push("for a restaurant / café");
  if (categories.includes("coding") && /python|javascript|typescript|react|node/i.test(goal)) {
    const match = goal.match(/python|javascript|typescript|react|node/i);
    if (match) parts.push(`in ${match[0]}`);
  }
  if (detectedPlatforms.length > 0) parts.push(`on ${detectedPlatforms.join(" / ")}`);
  if (detectedCountry) parts.push(`for ${detectedCountry}`);
  return `${parts.join(" ")}.`;
}

export function analyzeGoal(goal: string): QuestionSet {
  const text = goal.trim();
  const categories = matchCategory(text);
  const detectedPlatforms: string[] = [];
  for (const { value, regex } of PLATFORM_PATTERNS) {
    if (regex.test(text) && !detectedPlatforms.includes(value)) detectedPlatforms.push(value);
  }
  let detectedCountry: string | undefined;
  for (const { value, regex } of COUNTRY_PATTERNS) {
    if (regex.test(text)) {
      detectedCountry = value;
      break;
    }
  }
  let detectedBusinessType: string | undefined;
  for (const { value, regex } of BUSINESS_TYPE_PATTERNS) {
    if (regex.test(text)) {
      detectedBusinessType = value;
      break;
    }
  }

  const hasBudget = detectBudget(text);
  const detectedTone = detectTone(text);

  const questions: GoalQuestion[] = [];
  for (const template of TEMPLATES) {
    if (template.id === "platform" && detectedPlatforms.length > 0) continue;
    if (template.id === "country" && detectedCountry) continue;
    if (template.id === "businessType" && detectedBusinessType) continue;
    if (template.id === "budget" && hasBudget) continue;
    if (template.id === "tone" && detectedTone) continue;
    if (!template.categories.some((c) => categories.includes(c))) continue;
    questions.push({
      id: template.id,
      section: template.section,
      type: template.type,
      prompt: template.prompt,
      options:
        template.type === "select" || template.type === "multiSelect"
          ? template.options ?? (template.id === "contentType" ? contentTypes[categories[0]] : undefined)
          : undefined,
      placeholder: template.placeholder,
      required: template.required,
    });
  }

  const CORE_FIRST = ["audience", "tone", "language", "outputFormat"];
  const ordered = [
    ...questions.filter((q) => CORE_FIRST.includes(q.id)),
    ...questions.filter((q) => !CORE_FIRST.includes(q.id)),
  ].slice(0, MAX_QUESTIONS);

  return {
    goal,
    summary: restateSummary(text, categories, detectedPlatforms, detectedCountry),
    insights: {
      category: categories[0] ?? "general",
      categoryLabel: CATEGORY_META[categories[0] ?? "general"].label,
      detectedPlatforms,
      detectedCountry,
      detectedBusinessType,
    },
    questions: ordered,
  };
}