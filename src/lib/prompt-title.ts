const COMMON_WORDS = new Set([
  "business", "employee", "government", "instagram", "internal", "marketing",
  "professional", "presentation", "scholarship", "nutrition", "following",
  "generation", "templates", "strategy", "management", "development",
  "technology", "education", "intelligence", "application", "collection",
  "community", "assistant", "automation", "integration", "innovation",
]);

const HASH_LIKE = /^[a-f0-9]{8,}$/i;
const UID_LIKE = /^[a-z0-9]{8,}-\d+$/i;

function isGptIdToken(token: string): boolean {
  if (token.length < 8 || token.length > 12) return false;
  if (COMMON_WORDS.has(token.toLowerCase())) return false;
  const hasDigit = /[0-9]/.test(token);
  const hasInnerUpper = /^[a-z][A-Za-z]*[A-Z]/.test(token) && !/^[A-Z][a-z]+$/.test(token);
  return hasDigit || hasInnerUpper;
}

/**
 * A title is considered "opaque" when it carries no real meaning:
 * only digits/symbols, a hash/UUID, a bare GPT token, or a single
 * unreadable code word.
 */
export function isOpaqueTitle(title: string): boolean {
  const t = (title || "").trim();
  if (!t) return true;

  if (!/[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(t)) {
    return true; // no letters at all
  }
  if (/^[a-zA-Z0-9]{10,}$/.test(t) && /\d/.test(t)) {
    if (HASH_LIKE.test(t) || UID_LIKE.test(t)) return true;
    if (isGptIdToken(t)) return true;
  }
  if (/^\d{1,3}[a-zA-Z]{0,2}$/.test(t)) return true; // "12", "3b"
  if (t.length < 3) return true;
  return false;
}

export function cleanPromptTitle(raw: string): string {
  let title = raw.trim();

  // Date prefixes: 2024-01-15, 20240115
  title = title.replace(/^\d{4}-\d{2}-\d{2}[-_\s]+/, "");
  title = title.replace(/^\d{8}[-_\s]+/, "");

  // Serial numbers / numbered lists: "12-", "003_", "1."
  title = title.replace(/^\d{1,3}[-_.,\s]+/, "");

  // Leading GPT-token ids: "gAbc12345Xy Some prompt"
  const parts = title.split(/\s+/);
  if (parts.length > 1 && isGptIdToken(parts[0])) {
    parts.shift();
  }
  title = parts.join(" ");

  // Version suffixes: [v1], [v2.3], (v3)
  title = title.replace(/\s*[\[(]v?\d+(\.\d+)?[)\]]\s*$/i, "").trim();

  // Separators -> spaces (underscores, dashes, dots)
  title = title.replace(/[_\-/]+/g, " ").replace(/\s+/g, " ").trim();

  // Trim stray separators and trailing numbers
  title = title.replace(/^[-_\s]+|[-_\s]+$/g, "").trim();
  title = title.replace(/\s+\d{1,3}$/, "").trim();

  // Trailing date codes: "gpt4o 12102024", "beta 20240315", "v1 01012025"
  title = title.replace(/\s+\d{8}$/, "").trim();
  title = title.replace(/\s+\d{6}$/, "").trim();
  title = title.replace(/\s+\d{4}[-_]\d{1,2}[-_]\d{1,2}$/, "").trim();

  return title;
}
