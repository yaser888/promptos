import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: {
    default: "PromptOS - The Operating System for AI Prompts",
    template: "%s | PromptOS",
  },
  description:
    "Create, optimize, manage, and share AI prompts across all major platforms. ChatGPT, Claude, Gemini, Midjourney and more.",
  keywords: [
    "AI prompts",
    "prompt engineering",
    "ChatGPT prompts",
    "Claude prompts",
    "Midjourney prompts",
    "prompt management",
    "AI tools",
  ],
  authors: [{ name: "PromptOS" }],
  creator: "PromptOS",
  openGraph: {
    title: "PromptOS - The Operating System for AI Prompts",
    description:
      "Create, optimize, manage, and share AI prompts across all major platforms.",
    url: "https://promptos.ai",
    siteName: "PromptOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptOS",
    description:
      "Create, optimize, manage, and share AI prompts across all major platforms.",
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
