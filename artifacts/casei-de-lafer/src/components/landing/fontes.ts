import { Fraunces, IBM_Plex_Mono } from "next/font/google";

// Fontes só da página inicial pública. O Next baixa os arquivos na hora de montar o site e os serve do
// próprio endereço: o navegador de quem visita não fala com nenhum outro servidor por causa delas.
// O painel (/admin) não importa este arquivo e segue com as fontes de app/layout.tsx.
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

/** Classe que entrega as duas fontes, por variável, para quem estiver dentro dela. */
export const fontesDaLanding = `${fraunces.variable} ${plexMono.variable}`;
