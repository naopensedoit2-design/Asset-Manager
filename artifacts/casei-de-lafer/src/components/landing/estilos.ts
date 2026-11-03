// Classes repetidas da página inicial: um botão grande, um link em texto e o foco visível para quem usa teclado.
export const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

export const botao =
  "inline-flex min-h-14 w-full items-center justify-center bg-gold px-8 text-center text-base font-semibold text-black transition-colors hover:bg-gold-light sm:w-auto " +
  foco;

export const linkTexto =
  "inline-flex min-h-11 items-center text-sm text-text-secondary underline underline-offset-4 transition-colors hover:text-gold " +
  foco;

// Algarismos alinhados pela linha de base (o Playfair, por padrão, usa números "de texto", com alturas diferentes).
export const titulo2 = "font-serif text-[1.75rem] leading-tight text-balance lining-nums text-text-primary md:text-4xl";
