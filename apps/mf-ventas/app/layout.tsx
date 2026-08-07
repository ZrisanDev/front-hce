import type { ReactNode } from "react";
import "./globals.css";
import { AppLayout, AuthProvider, ModalProvider, SessionExpiredProvider, ThemeProvider } from "@hce/shared";
import { Toaster } from "@hce/shared/ui";

export const metadata = {
  title: "Ventas · HCE",
  description: "Micro-frontend de Ventas",
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
         *
         * <Toaster> mounts the sonner viewport so toast() calls from the
         * registrar form (with dynamic items) actually render.
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
                <AppLayout zone="Ventas">{children}</AppLayout>
              </SessionExpiredProvider>
            </AuthProvider>
          </ModalProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
