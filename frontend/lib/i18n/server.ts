import { cookies } from "next/headers";
import { isLocale, messages, type Locale, type MessageKey } from "./messages";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get("locale")?.value;
  return isLocale(value) ? value : "en";
}

export async function getTranslations() {
  const locale = await getLocale();
  return { locale, t: (key: MessageKey) => messages[locale][key] };
}
