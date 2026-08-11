import type { ExtensionManifest } from "@/core/registry/kernel";
import { prisma } from "@/lib/prisma";

export interface ExtensionHooksContext {
  extensionId: string;
  slug: string;
  name: string;
  version: string;
  config: Record<string, unknown>;
}

export interface HomeSectionData {
  extensionSlug: string;
  type: string;
  title: string;
  subtitle?: string;
  items: Record<string, unknown>[];
}

export interface CatalogExtension {
  manifest: ExtensionManifest;
  category: string;
  icon: string;
  configFields: {
    key: string;
    label: string;
    type: "text" | "textarea" | "number";
    placeholder?: string;
    required?: boolean;
    secret?: boolean;
    help?: string;
  }[];
  defaultConfig?: Record<string, unknown>;
  hooks: {
    head?: (ctx: ExtensionHooksContext) => Promise<string | null> | string | null;
    body?: (ctx: ExtensionHooksContext) => Promise<string | null> | string | null;
    homeSection?: (ctx: ExtensionHooksContext) => Promise<HomeSectionData | null>;
    daily?: (ctx: ExtensionHooksContext) => Promise<void>;
    onEvent?: (
      event: string,
      payload: Record<string, unknown>,
      ctx: ExtensionHooksContext
    ) => Promise<void>;
  };
}

const catalog: CatalogExtension[] = [
  {
    manifest: {
      name: "Google Analytics 4",
      slug: "google-analytics",
      version: "1.0.0",
      description:
        "Loads Google Analytics 4 on every page of your site. Paste your Measurement ID (G-XXXXXXX).",
      author: "PromptOS",
      license: "MIT",
      namespace: "system",
      permissions: ["system.read"],
      dependencies: [],
    },
    category: "Analytics",
    icon: "BarChart3",
    configFields: [
      {
        key: "measurementId",
        label: "Measurement ID",
        type: "text",
        placeholder: "G-XXXXXXXXXX",
        required: true,
      },
    ],
    hooks: {
      head: async (ctx) => {
        const id = String(ctx.config.measurementId ?? "");
        if (!/^G-[A-Z0-9]+$/i.test(id)) return null;
        return [
          `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
          `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});</script>`,
        ].join("\n");
      },
    },
  },
  {
    manifest: {
      name: "Telegram Notifications",
      slug: "telegram-notify",
      version: "1.0.0",
      description:
        "Sends you a Telegram message whenever a new prompt is published on your site. Requires a bot token and your chat ID.",
      author: "PromptOS",
      license: "MIT",
      namespace: "system",
      permissions: ["prompts.read"],
      dependencies: [],
    },
    category: "Notifications",
    icon: "Send",
    configFields: [
      {
        key: "botToken",
        label: "Bot Token",
        type: "text",
        placeholder: "123456:ABC-DEF...",
        required: true,
        secret: true,
      },
      {
        key: "chatId",
        label: "Chat ID",
        type: "text",
        placeholder: "-1001234567890",
        required: true,
        help: "Get it from @userinfobot on Telegram.",
      },
    ],
    hooks: {
      onEvent: async (event, payload, ctx) => {
        if (event !== "prompt.created") return;
        const token = String(ctx.config.botToken ?? "");
        const chatId = String(ctx.config.chatId ?? "");
        if (!token || !chatId) return;
        const title = String(payload.title ?? "New prompt");
        const promptId = String(payload.id ?? "");
        const text = `🚀 New prompt published: *${title}*\n\nhttps://${process.env.NEXT_PUBLIC_SITE_URL || "localhost:3000"}/prompts/${promptId}`;
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 10_000);
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
              signal: controller.signal,
            }
          );
          await prisma.extensionLog.create({
            data: {
              extensionId: ctx.extensionId,
              level: res.ok ? "info" : "warn",
              message: res.ok
                ? `Telegram message sent for "${title}"`
                : `Telegram responded ${res.status} — check bot token and chat id`,
            },
          });
        } catch (error) {
          await prisma.extensionLog.create({
            data: {
              extensionId: ctx.extensionId,
              level: "error",
              message: `Telegram send failed: ${String(error)}`,
            },
          });
        } finally {
          clearTimeout(t);
        }
      },
    },
  },
  {
    manifest: {
      name: "Webhook Notifier",
      slug: "webhook-notify",
      version: "1.0.0",
      description:
        "Posts a JSON payload to your webhook URL every time a prompt is created. Great for Discord/Slack bots, Zapier or Make.",
      author: "PromptOS",
      license: "MIT",
      namespace: "system",
      permissions: ["prompts.read"],
      dependencies: [],
    },
    category: "Notifications",
    icon: "Webhook",
    configFields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        type: "text",
        placeholder: "https://hooks.slack.com/services/...",
        required: true,
        help: "Receives POST {event, title, slug, author}.",
      },
    ],
    hooks: {
      onEvent: async (event, payload, ctx) => {
        if (event !== "prompt.created") return;
        const url = String(ctx.config.webhookUrl ?? "");
        if (!url) return;
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 20_000);
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event, ...payload }),
            signal: controller.signal,
          });
          await prisma.extensionLog.create({
            data: {
              extensionId: ctx.extensionId,
              level: res.ok ? "info" : "warn",
              message: res.ok
                ? `Webhook delivered (${res.status}) for "${String(payload.title ?? "")}"`
                : `Webhook responded ${res.status} for "${String(payload.title ?? "")}"`,
            },
          });
        } catch (error) {
          await prisma.extensionLog.create({
            data: {
              extensionId: ctx.extensionId,
              level: "error",
              message: `Webhook delivery failed: ${String(error)}`,
            },
          });
        } finally {
          clearTimeout(t);
        }
      },
    },
  },
  {
    manifest: {
      name: "SEO Booster",
      slug: "seo-booster",
      version: "1.0.0",
      description:
        "Injects structured data (JSON-LD Organization + WebSite) and OpenGraph defaults into every page — helps rich results on Google.",
      author: "PromptOS",
      license: "MIT",
      namespace: "system",
      permissions: ["system.read"],
      dependencies: [],
    },
    category: "SEO",
    icon: "Search",
    configFields: [
      {
        key: "twitterHandle",
        label: "Twitter / X Handle",
        type: "text",
        placeholder: "@promptos",
      },
      {
        key: "logoUrl",
        label: "Logo URL",
        type: "text",
        placeholder: "https://yoursite.com/logo.png",
      },
    ],
    hooks: {
      head: async (ctx) => {
        const settings = await prisma.setting.findFirst().catch(() => null);
        const siteName = settings?.siteName ?? "PromptOS";
        const description =
          settings?.siteDescription ?? "Professional AI prompt management platform";
        const url = process.env.NEXT_PUBLIC_SITE_URL || "https://localhost:3000";
        const logo = String(ctx.config.logoUrl ?? settings?.logoUrl ?? "");
        const orgJson = {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: siteName,
          url,
          ...(logo ? { logo } : {}),
        };
        const webJson = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteName,
          url,
          description,
        };
        return [
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:site" content="${String(ctx.config.twitterHandle ?? "")}" />`,
          `<meta property="og:site_name" content="${siteName}" />`,
          `<meta property="og:description" content="${description}" />`,
          `<script type="application/ld+json">${JSON.stringify(orgJson)}</script>`,
          `<script type="application/ld+json">${JSON.stringify(webJson)}</script>`,
        ].join("\n");
      },
    },
  },
  {
    manifest: {
      name: "Top Prompts Widget",
      slug: "top-prompts",
      version: "1.0.0",
      description:
        "Adds a 'Most loved prompts' section to your homepage showing your best prompts by likes — proven content gets more clicks.",
      author: "PromptOS",
      license: "MIT",
      namespace: "prompts",
      permissions: ["prompts.read"],
      dependencies: [],
    },
    category: "Content",
    icon: "Star",
    configFields: [
      {
        key: "limit",
        label: "Number of prompts",
        type: "number",
        placeholder: "6",
      },
    ],
    hooks: {
      homeSection: async (ctx) => {
        const limitRaw = Number(ctx.config.limit ?? 6);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 12) : 6;
        const prompts = await prisma.prompt
          .findMany({
            where: { isPublic: true, isDeleted: false },
            orderBy: { likeCount: "desc" },
            take: limit,
            select: {
              id: true,
              title: true,
              description: true,
              likeCount: true,
              copyCount: true,
              tags: true,
            },
          })
          .catch(() => []);
        if (prompts.length === 0) return null;
        return {
          extensionSlug: "top-prompts",
          type: "top-prompts",
          title: "Most Loved Prompts",
          subtitle: "The prompts our community copies the most",
          items: prompts as unknown as Record<string, unknown>[],
        };
      },
    },
  },
  {
    manifest: {
      name: "Newsletter Subscribe",
      slug: "newsletter-banner",
      version: "1.0.0",
      description:
        "Adds a newsletter signup banner to your homepage. Subscriber emails are stored in your settings and can be exported from the admin panel.",
      author: "PromptOS",
      license: "MIT",
      namespace: "system",
      permissions: ["settings.read"],
      dependencies: [],
    },
    category: "Growth",
    icon: "Mail",
    configFields: [],
    hooks: {
      homeSection: async () => ({
        extensionSlug: "newsletter-banner",
        type: "newsletter",
        title: "Stay in the loop",
        subtitle: "Get the best new prompts in your inbox — once a week, no spam.",
        items: [],
      }),
    },
  },
  {
    manifest: {
      name: "Custom Code Injector",
      slug: "custom-code",
      version: "1.0.0",
      description:
        "Paste any HTML/JS snippet to load on every page — perfect for GTM, Hotjar, Intercom, Clarity, Facebook Pixel or custom CSS.",
      author: "PromptOS",
      license: "MIT",
      namespace: "system",
      permissions: ["system.write"],
      dependencies: [],
    },
    category: "Developer",
    icon: "Code2",
    configFields: [
      {
        key: "headCode",
        label: "Head snippet",
        type: "textarea",
        placeholder: "<!-- scripts that load in <head> -->",
      },
      {
        key: "bodyCode",
        label: "Body snippet",
        type: "textarea",
        placeholder: "<!-- scripts at the end of <body> -->",
      },
    ],
    hooks: {
      head: async (ctx) => String(ctx.config.headCode ?? "") || null,
      body: async (ctx) => String(ctx.config.bodyCode ?? "") || null,
    },
  },
];

export function getCatalogEntry(slug: string): CatalogExtension | undefined {
  return catalog.find((entry) => entry.manifest.slug === slug);
}

export function getExtensionCatalog(): CatalogExtension[] {
  return catalog;
}
