// Para onde os botões da página inicial apontam. O WhatsApp passa pela rota /whatsapp do próprio site:
// o toque funciona antes de o JavaScript carregar, o número fica só no servidor e uma troca de número
// no painel vale na hora. O chat continua no mesmo endereço de sempre.

export const CHAT_URL = "/orcamento/detalhado";
export const WHATSAPP_HREF = "/whatsapp";

/** Mensagem que já chega escrita no WhatsApp: a conversa começa pela data e pelo local. */
export const MENSAGEM_WHATSAPP = [
  "Olá! Quero ver se o MP Lafer está livre no meu casamento.",
  "Data:",
  "Cidade ou local:",
  "Serviço (Carro da Noiva, Saída dos Noivos ou Ensaio):",
].join("\n");
