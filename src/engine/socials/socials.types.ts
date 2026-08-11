export const SOCIAL_ICONS = [
  "github",
  "twitter",
  "x",
  "discord",
  "youtube",
  "instagram",
  "linkedin",
  "facebook",
  "telegram",
  "whatsapp",
  "tiktok",
  "twitch",
  "email",
  "link",
] as const;

export type SocialIcon = (typeof SOCIAL_ICONS)[number];
