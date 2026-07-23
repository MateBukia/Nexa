import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: {
    default: "Nexa Commerce",
    template: "%s · Nexa Commerce",
  },
  description:
    "A thoughtful storefront with live inventory and intelligent product discovery.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
