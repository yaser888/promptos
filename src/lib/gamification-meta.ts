export const LEVEL_TITLES = [
  { min: 1, title: "Prompt Novice" },
  { min: 2, title: "Prompt Apprentice" },
  { min: 3, title: "Prompt Crafter" },
  { min: 5, title: "Prompt Artisan" },
  { min: 7, title: "Prompt Expert" },
  { min: 15, title: "Prompt Alchemist" },
  { min: 20, title: "Prompt Master" },
  { min: 30, title: "Prompt Legend" },
  { min: 50, title: "Prompt Grandmaster" },
  { min: 75, title: "Prompt Mythic" },
  { min: 100, title: "AI Whisperer" },
];

export function levelTitle(level: number): string {
  let title = LEVEL_TITLES[0].title;
  for (const t of LEVEL_TITLES) {
    if (level >= t.min) title = t.title;
  }
  return title;
}

export const ACTIVITY_META: Record<string, { emoji: string; label: string }> = {
  "prompt.created": { emoji: "✨", label: "created a prompt" },
  "prompt.copied": { emoji: "📋", label: "copied a prompt" },
  "prompt.favorited": { emoji: "💚", label: "favorited a prompt" },
  "level.up": { emoji: "🚀", label: "leveled up" },
  "xp.gained": { emoji: "⚡", label: "gained XP" },
};
