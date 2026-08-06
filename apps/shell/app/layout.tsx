import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
         * SessionExpiredProvider (and AuthProvider) mount here in Fase 3.
         * They live in @hce/shared and intercept 401s from any zone.
         */}
        <header className="border-b border-border bg-background">
          <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-3">
            <a href="/" className="text-base font-semibold">
              HCE
            </a>
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
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
