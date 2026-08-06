import type { ReactNode } from "react";

export const metadata = {
  title: "Kardex · HCE",
  description: "Micro-frontend de Kardex",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
