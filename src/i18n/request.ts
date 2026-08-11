import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { defaultLocale } from "./config";
import { getLanguageRegistry } from "@/lib/site-languages";

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale;
  const requested = typeof resolved === "string" && resolved.trim() ? resolved : defaultLocale;

  const registry = await getLanguageRegistry();
  const known = registry.some((l) => l.code === requested);

  if (known && !registry.find((l) => l.code === requested)?.enabled) {
    notFound();
  }

  const locale = known && registry.find((l) => l.code === requested)?.enabled ? requested : defaultLocale;

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`@/messages/${defaultLocale}.json`)).default;
  }

  return {
    locale,
    messages,
  };
});