import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://caseidalafer.com.br"),
  title: "Casei de Lafer — Carro Clássico para Casamentos na Serra Gaúcha",
  description:
    "Alugue o clássico MP Lafer conversível para o seu casamento na Serra Gaúcha. Chegada da noiva, ensaios fotográficos e fuga dos noivos.",
  robots: "index, follow",
  openGraph: {
    title: "Casei de Lafer — Carro Clássico para Casamentos",
    description:
      "MP Lafer conversível para casamentos na Serra Gaúcha. Uma experiência única e inesquecível.",
    type: "website",
    images: [{ url: "/hero-desktop.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Casei de Lafer — Carro Clássico para Casamentos",
    description: "MP Lafer conversível para casamentos na Serra Gaúcha.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
