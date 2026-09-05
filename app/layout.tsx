import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mobile AI — Assistant",
  description: "Testez l’assistant Mobile AI en streaming.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
