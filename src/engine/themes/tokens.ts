export const TOKEN_PREFIXES = ["--color-", "--radius-", "--font-"];

export const DEFAULT_TOKENS: Record<string, string> = {
  "--color-accent": "#10b981",
  "--color-accent-hover": "#34d399",
  "--color-accent-foreground": "#000000",
  "--color-surface": "#0f1016",
  "--color-surface-secondary": "#1a1c26",
  "--color-surface-tertiary": "#2b2d38",
  "--color-border": "#2b2d38",
  "--color-border-light": "#434652",
  "--color-text-primary": "#e4e5e7",
  "--color-text-secondary": "#aeb0b6",
  "--color-text-muted": "#787b85",
  "--radius-md": "0.5rem",
  "--radius-lg": "0.75rem",
  "--radius-xl": "1rem",
  "--radius-2xl": "1.5rem",
};

const mix = (from: string, to: string, pct: number): string =>
  `color-mix(in srgb, ${from} ${pct}%, ${to})`;

const ACCENT_RAMP: Array<[string, string]> = [
  ["--color-emerald-950", mix("var(--color-accent)", "black", 18)],
  ["--color-emerald-900", mix("var(--color-accent)", "black", 30)],
  ["--color-emerald-800", mix("var(--color-accent)", "black", 45)],
  ["--color-emerald-700", mix("var(--color-accent)", "black", 60)],
  ["--color-emerald-600", mix("var(--color-accent)", "black", 80)],
  ["--color-emerald-500", "var(--color-accent)"],
  ["--color-emerald-400", "var(--color-accent-hover)"],
  ["--color-emerald-300", mix("var(--color-accent)", "white", 75)],
  ["--color-emerald-200", mix("var(--color-accent)", "white", 55)],
  ["--color-emerald-100", mix("var(--color-accent)", "white", 35)],
  ["--color-emerald-50", mix("var(--color-accent)", "white", 18)],
];

const CHARCOAL_RAMP: Array<[string, string]> = [
  ["--color-charcoal-950", "var(--color-surface)"],
  ["--color-charcoal-900", "var(--color-surface-secondary)"],
  ["--color-charcoal-800", "var(--color-surface-tertiary)"],
  ["--color-charcoal-700", "var(--color-border-light)"],
  ["--color-charcoal-600", mix("var(--color-border-light)", "var(--color-text-muted)", 40)],
  ["--color-charcoal-500", "var(--color-text-muted)"],
  ["--color-charcoal-400", mix("var(--color-text-muted)", "var(--color-text-primary)", 25)],
  ["--color-charcoal-300", "var(--color-text-secondary)"],
  ["--color-charcoal-200", mix("var(--color-text-secondary)", "var(--color-text-primary)", 50)],
  ["--color-charcoal-100", "var(--color-text-primary)"],
  ["--color-charcoal-50", "var(--color-text-primary)"],
];

const EXTRA_CSS = `
::selection {
  background-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
  color: var(--color-text-primary);
}
.glass {
  background: color-mix(in srgb, var(--color-surface-secondary) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-surface-tertiary) 50%, transparent);
}
.glass-hover:hover {
  background: color-mix(in srgb, var(--color-surface-tertiary) 60%, transparent);
  border-color: color-mix(in srgb, var(--color-border-light) 50%, transparent);
}
.glow-border::before {
  background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent, color-mix(in srgb, var(--color-accent) 10%, transparent));
}
@keyframes glow {
  from { box-shadow: 0 0 20px -10px color-mix(in srgb, var(--color-accent) 50%, transparent); }
  to { box-shadow: 0 0 30px -5px color-mix(in srgb, var(--color-accent) 30%, transparent); }
}
`;

/**
 * Builds the full CSS injected for an active theme. Overrides the site's
 * hardcoded emerald/charcoal palette with the theme's semantic tokens so
 * every component re-colors from a single accent/surface source.
 */
export function buildThemeCss(tokens: Record<string, string>): string {
  const merged = { ...DEFAULT_TOKENS, ...tokens };
  const rootLines: string[] = [];
  for (const [k, v] of Object.entries(merged)) {
    if (k.startsWith("--")) rootLines.push(`  ${k}: ${v};`);
  }
  for (const [k, fallback] of ACCENT_RAMP) {
    rootLines.push(`  ${k}: ${merged[k] ?? fallback};`);
  }
  for (const [k, fallback] of CHARCOAL_RAMP) {
    rootLines.push(`  ${k}: ${merged[k] ?? fallback};`);
  }
  return `:root {\n${rootLines.join("\n")}\n}\n${EXTRA_CSS.trim()}`;
}
