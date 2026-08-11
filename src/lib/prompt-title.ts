const COMMON_WORDS = new Set([
  "business", "employee", "government", "instagram", "internal", "marketing",
  "professional", "presentation", "scholarship", "nutrition", "following",
  "generation", "templates", "strategy", "management", "development",
  "technology", "education", "intelligence", "application", "collection",
  "community", "assistant", "automation", "integration", "innovation",
]);

function isGptIdToken(token: string): boolean {
  if (token.length < 8 || token.length > 12) return false;
  if (COMMON_WORDS.has(token.toLowerCase())) return false;
  const hasDigit = /[0-9]/.test(token);
  const hasInnerUpper = /^[a-z][A-Za-z]*[A-Z]/.test(token) && !/^[A-Z][a-z]+$/.test(token);
  return hasDigit || hasInnerUpper;
}

export function cleanPromptTitle(raw: string): string {
  let title = raw.trim();

  title = title.replace(/^\d{4}-\d{2}-\d{2}[-_\s]+/, "");
  title = title.replace(/^\d{8}[-_\s]+/, "");

  const parts = title.split(/\s+/);
  if (parts.length > 1 && isGptIdToken(parts[0])) {
    parts.shift();
  }
  title = parts.join(" ");

  title = title.replace(/\s*\[v?\d+(\.\d+)?\]\s*$/i, "").trim();
  title = title.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  title = title.replace(/^[-_\s]+|[-_\s]+$/g, "").trim();

  return title;
}
