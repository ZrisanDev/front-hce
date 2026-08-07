import type { ReactNode } from "react";
import "./globals.css";
import { AppLayout, AuthProvider, ModalProvider, SessionExpiredProvider, ThemeProvider } from "@hce/shared";

export const metadata = {
  title: "Kardex · HCE",
  description: "Micro-frontend de Kardex",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        {/*
         * Each zone is a separate Next app with its own React tree, so it mounts
         * its own AuthProvider + SessionExpiredProvider. The session singleton
         * in @hce/shared is shared module state, so a 401 raised by this zone's
         * apiClient call surfaces the modal here.
         */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ModalProvider>
            <AuthProvider>
              <SessionExpiredProvider>
                <AppLayout zone="Kardex">{children}</AppLayout>
              </SessionExpiredProvider>
            </AuthProvider>
          </ModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
