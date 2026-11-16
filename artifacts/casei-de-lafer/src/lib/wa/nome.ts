// Nome do perfil do WhatsApp limpo para uso da Margot e como dica de grafia na transcrição de áudio.
// "Neuselí695297" → "Neuselí"; "Isabel Cristina 🐛🦋" → "Isabel Cristina". Sem letras, devolve "".

export function nomeDoPerfil(bruto: string | null | undefined): string {
  return (bruto ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Dica para o transcritor acertar a grafia de nomes próprios do negócio e da pessoa. */
export function dicaDeTranscricao(nome: string): string {
  const base = "Eu Casei de Lafer, Margot, MP Lafer, pré-wedding.";
  return nome ? `${base} Quem fala pode se chamar ${nome}.` : base;
}
