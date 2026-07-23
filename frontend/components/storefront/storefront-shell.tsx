import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { ShoppingAssistant } from "@/components/ai/shopping-assistant";

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f7f2] text-slate-950">
      <SiteHeader />
      {children}
      <SiteFooter />
      <ShoppingAssistant />
    </div>
  );
}
