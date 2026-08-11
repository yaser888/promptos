import { NextResponse } from "next/server";
import { getEnabledLanguages } from "@/lib/site-languages";

export async function GET() {
  try {
    const languages = await getEnabledLanguages();
    return NextResponse.json({
      defaultLocale: languages.find((l) => l.isDefault)?.code ?? "en",
      languages: languages.map(({ code, name, nativeName, dir, flag }) => ({
        code,
        name,
        nativeName,
        dir,
        flag,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load languages" }, { status: 500 });
  }
}