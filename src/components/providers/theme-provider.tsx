import { prisma } from "@/lib/prisma";
import { themeToCSS } from "@/engine/themes/themes.service";

/**
 * Server-side theme injection. Reads the active theme once per request and
 * renders a <style> block that overrides the Tailwind v4 theme tokens on
 * :root, so utilities like bg-surface / text-emerald-400 re-color instantly.
 */
export async function ThemeProvider({ children }: { children: React.ReactNode }) {
  let css = "";
  try {
    const active = await prisma.theme.findFirst({ where: { isActive: true } });
    if (active && active.tokens && typeof active.tokens === "object") {
      css = themeToCSS(active.tokens as Record<string, string>);
    }
  } catch {
    // DB unavailable — the app ships with the default tokens
  }

  return (
    <>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      {children}
    </>
  );
}