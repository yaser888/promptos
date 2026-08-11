import { prisma } from "@/lib/prisma";
import { logInfo } from "@/lib/logger";
import type { HomeContentData } from "./home.types";
import { HOME_DEFAULTS } from "./home.types";

export type {
  HomeContentData,
  HomeStat,
  HomeFeature,
  HomeStep,
  HomeTestimonial,
  HomeFaq,
} from "./home.types";
export { HOME_DEFAULTS } from "./home.types";

const MAX_LEN = 5000;

function cleanText(v: unknown, max = MAX_LEN): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function cleanStringArray(v: unknown, maxItems = 50): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

/** Validates and normalizes incoming home content. Falls back to defaults for empty fields. */
export function validateHomeContent(input: unknown): HomeContentData | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const data: HomeContentData = JSON.parse(JSON.stringify(HOME_DEFAULTS));

  const hero = (raw.hero ?? {}) as Record<string, unknown>;
  data.hero.badge = cleanText(hero.badge, 200) || data.hero.badge;
  data.hero.title = cleanText(hero.title, 300) || data.hero.title;
  data.hero.subtitle = cleanText(hero.subtitle, 1000) || data.hero.subtitle;
  data.hero.cta = cleanText(hero.cta, 200) || data.hero.cta;
  data.hero.secondary = cleanText(hero.secondary, 200) || data.hero.secondary;
  data.hero.platforms = cleanStringArray(hero.platforms, 30);

  if (Array.isArray(raw.stats)) {
    data.stats = raw.stats
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .slice(0, 10)
      .map((s) => ({
        label: cleanText(s.label, 200),
        valueKey: cleanText(s.valueKey, 100),
        suffix: cleanText(s.suffix, 10),
      }))
      .filter((s) => s.label && s.valueKey);
  }

  data.featuresTitle = cleanText(raw.featuresTitle, 300);
  data.featuresSubtitle = cleanText(raw.featuresSubtitle, 1000);
  if (Array.isArray(raw.features)) {
    data.features = raw.features
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .slice(0, 50)
      .map((f) => ({
        icon: cleanText(f.icon, 50) || "sparkles",
        title: cleanText(f.title, 300),
        description: cleanText(f.description, 1000),
      }))
      .filter((f) => f.title);
  }

  data.howTitle = cleanText(raw.howTitle, 300);
  data.howSubtitle = cleanText(raw.howSubtitle, 1000);
  if (Array.isArray(raw.steps)) {
    data.steps = raw.steps
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .slice(0, 12)
      .map((s) => ({
        title: cleanText(s.title, 300),
        description: cleanText(s.description, 1000),
      }))
      .filter((s) => s.title);
  }

  data.trustedTitle = cleanText(raw.trustedTitle, 300);
  data.companies = cleanStringArray(raw.companies, 30);

  data.testimonialsTitle = cleanText(raw.testimonialsTitle, 300);
  data.testimonialsSubtitle = cleanText(raw.testimonialsSubtitle, 1000);
  if (Array.isArray(raw.testimonials)) {
    data.testimonials = raw.testimonials
      .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
      .slice(0, 30)
      .map((t) => ({
        name: cleanText(t.name, 200),
        role: cleanText(t.role, 200),
        company: cleanText(t.company, 200),
        avatar: cleanText(t.avatar, 10),
        content: cleanText(t.content, 2000),
      }))
      .filter((t) => t.name);
  }

  data.faqTitle = cleanText(raw.faqTitle, 300);
  data.faqSubtitle = cleanText(raw.faqSubtitle, 1000);
  if (Array.isArray(raw.faqs)) {
    data.faqs = raw.faqs
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .slice(0, 30)
      .map((f) => ({
        question: cleanText(f.question, 500),
        answer: cleanText(f.answer, 4000),
      }))
      .filter((f) => f.question);
  }

  data.ctaTitle = cleanText(raw.ctaTitle, 300);
  data.ctaSubtitle = cleanText(raw.ctaSubtitle, 1000);
  data.ctaButton = cleanText(raw.ctaButton, 200);
  data.ctaSecondary = cleanText(raw.ctaSecondary, 200);
  data.ctaBullets = cleanStringArray(raw.ctaBullets, 20);

  data.pricingTitle = cleanText(raw.pricingTitle, 300);
  data.pricingSubtitle = cleanText(raw.pricingSubtitle, 1000);

  return data;
}

export async function getHomeContent(): Promise<HomeContentData> {
  let row = await prisma.homeContent.findFirst();
  if (!row) {
    row = await prisma.homeContent.create({
      data: { data: HOME_DEFAULTS as object },
    });
    logInfo("home-content", "Initialized default home content");
  }
  return (row.data ?? HOME_DEFAULTS) as HomeContentData;
}

export async function saveHomeContent(data: HomeContentData): Promise<HomeContentData> {
  const validated = validateHomeContent(data) ?? HOME_DEFAULTS;
  await prisma.homeContent.upsert({
    where: { id: "default" },
    create: { id: "default", data: validated as object },
    update: { data: validated as object },
  });
  logInfo("home-content", "Home content updated");
  return validated;
}
