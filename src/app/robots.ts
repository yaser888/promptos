import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://promptos.ai";

  let index = true;
  let follow = true;

  try {
    const setting = await prisma.setting.findFirst();
    if (setting) {
      index = setting.robotsIndex;
      follow = setting.robotsFollow;
    }
  } catch {
    // DB unavailable — default to index/follow
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: index && follow ? [] : ["/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
