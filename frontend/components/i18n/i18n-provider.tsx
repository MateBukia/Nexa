"use client";

import { createContext, ReactNode, useContext } from "react";
import { messages, type Locale, type MessageKey } from "@/lib/i18n/messages";

const I18nContext = createContext<{
  locale: Locale;
  t: (key: MessageKey) => string;
} | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: (key) => messages[locale][key] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslations() {
  const value = useContext(I18nContext);
  if (!value)
    throw new Error("useTranslations must be used inside I18nProvider.");
  return value;
}
