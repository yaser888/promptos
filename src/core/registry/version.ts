import pkg from "../../../package.json";
import nextPkg from "next/package.json";
import reactPkg from "react/package.json";

/** PromptOS Core — محمية: لا تعدَّل إلا عبر تحديث رسمي موقّع. */
export const CORE_VERSION = "1.0.0";

/** PromptOS Engine — مكونات مستقرة فوق النواة (updates/themes/extensions/pages/center). */
export const ENGINE_VERSION = "1.0.0";

export const APP_VERSION = pkg.version ?? "0.0.0";
export const APP_NAME = pkg.name ?? "promptos";
export const NEXT_VERSION = nextPkg.version ?? "";
export const REACT_VERSION = reactPkg.version ?? "";

export interface VersionInfo {
  app: string;
  core: string;
  engine: string;
  next: string;
  react: string;
  node: string;
  platform: string;
  environment: "development" | "test" | "production";
  uptimeSeconds: number;
}

export function getVersionInfo(): VersionInfo {
  return {
    app: APP_VERSION,
    core: CORE_VERSION,
    engine: ENGINE_VERSION,
    next: NEXT_VERSION,
    react: REACT_VERSION,
    node: process.version,
    platform: process.platform,
    environment: (process.env.NODE_ENV as VersionInfo["environment"]) ?? "development",
    uptimeSeconds: Math.floor(process.uptime()),
  };
}