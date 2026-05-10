const DEFAULT_MESSAGE =
  "Olá! Gostaria de verificar a disponibilidade do MP Lafer para o meu casamento.";

export function getWhatsAppUrl(
  number: string,
  message: string = DEFAULT_MESSAGE,
): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
