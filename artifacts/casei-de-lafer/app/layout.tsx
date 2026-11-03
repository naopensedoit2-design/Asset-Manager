import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { META, OG } from "@/lib/landing/conteudo";

// Endereço oficial do site (o domínio que está de fato no projeto). Os textos vêm de lib/landing/conteudo.ts.
export const metadata: Metadata = {
  metadataBase: new URL("https://www.eucaseidelafer.com"),
  title: META.titulo,
  description: META.descricao,
  robots: "index, follow",
  openGraph: OG,
  twitter: {
    card: "summary_large_image",
    title: OG.title,
    description: OG.description,
    images: OG.images.map((imagem) => imagem.url),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
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
