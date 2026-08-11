import { getLocale as getIntlLocale, getMessages as getIntlMessages } from "next-intl/server";
import { getDirection as getLocaleDirection, type Locale } from "./config";

export async function getLocale(): Promise<Locale> {
  return (await getIntlLocale()) as Locale;
}

export async function getDirection(): Promise<"ltr" | "rtl"> {
  const locale = await getLocale();
  return getLocaleDirection(locale);
}

export async function getMessages(): Promise<Record<string, unknown>> {
  return (await getIntlMessages()) as Record<string, unknown>;
}
