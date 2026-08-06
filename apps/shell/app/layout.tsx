import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider, SessionExpiredProvider } from "@hce/shared";
import { LogoutButton } from "../components/logout-button";
import { TooltipProvider } from "@/components/ui/tooltip";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HCE",
  description: "Sistema HCE — Multi-Zones",
};

// NOTE: Next 16's `LayoutProps<'/'>` helper is a GLOBAL type emitted by
// `next dev`/`next build`/`next typegen`. It does not exist for a plain `tsc`
// run, so `Cannot find name 'LayoutProps'` fires. The root layout has no params
// and no slots, so the inline `{ children: ReactNode }` shape (the form used by
// every root-layout example in the Next 16 layout.md reference) is equivalent
// and avoids depending on a prior type-generation step.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
         * AuthProvider holds the optimistic session state; SessionExpiredProvider
         * subscribes to the @hce/shared singleton and shows the blocking modal
         * on any 401 from any zone. Both are Client Components but can be
         * rendered inside this Server Component root layout.
         */}
        <AuthProvider>
          <SessionExpiredProvider>
            <TooltipProvider>
            <header className="border-b border-border bg-background">
              <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3">
                <a href="/" className="text-base font-semibold">
                  HCE
                <a/>
                {/* Cross-zone navigation: plain <a> forces a hard navigation.
                    next/link soft-navigates and breaks between zones. */}
                <a href="/productos" className="text-sm hover:underline">
                  Productos
                </a>
                <a href="/compras" className="text-sm hover:underline">
                  Compras
                </a>
                <a href="/ventas" className="text-sm hover:underline">
                  Ventas
                </a>
                <a href="/kardex" className="text-sm hover:underline">
                  Kardex
                </a>
                <div className="ml-auto">
                  <LogoutButton />
                </div>
              </nav>
            </header>
              <main className="flex-1">{children}</main>
            </TooltipProvider>
          </SessionExpiredProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
