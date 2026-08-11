import {
  Layers,
  Sparkles,
  Globe,
  Share2,
  Zap,
  Shield,
  Cloud,
  GitFork,
  Lightbulb,
  WandSparkles,
  Rocket,
  MessageCircle,
  Check,
  Star,
  HelpCircle,
  Users,
  Copy,
  Heart,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

export const HOME_ICONS: Record<string, LucideIcon> = {
  layers: Layers,
  sparkles: Sparkles,
  globe: Globe,
  share: Share2,
  zap: Zap,
  shield: Shield,
  cloud: Cloud,
  git: GitFork,
  bulb: Lightbulb,
  wand: WandSparkles,
  rocket: Rocket,
  chat: MessageCircle,
  check: Check,
  star: Star,
  help: HelpCircle,
  users: Users,
  copy: Copy,
  heart: Heart,
  grid: LayoutGrid,
};

export function homeIcon(name: string | undefined): LucideIcon {
  return (name && HOME_ICONS[name]) || Sparkles;
}
