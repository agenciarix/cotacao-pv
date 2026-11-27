import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotação de proteção veicular",
  description: "Checkout de cotação white label para associações de proteção veicular.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
