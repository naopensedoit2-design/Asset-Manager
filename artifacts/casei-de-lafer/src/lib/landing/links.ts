// Para onde os botões da página inicial apontam. O WhatsApp passa pela rota /whatsapp do próprio site:
// o toque funciona antes de o JavaScript carregar, o número fica só no servidor e uma troca de número
// no painel vale na hora. O chat continua no mesmo endereço de sempre.

export const CHAT_URL = "/orcamento/detalhado";
export const WHATSAPP_HREF = "/whatsapp";

const ABERTURA = "Olá! Quero ver se o MP Lafer está livre no meu casamento.";
const LINHA_SERVICO = "Serviço (Carro da Noiva, Saída dos Noivos ou Ensaio):";

/** Quem indica o carro a um casal: a conversa começa dizendo quem está falando. */
export const PARCEIROS = ["cerimonial", "fotografo"] as const;
export type Parceiro = (typeof PARCEIROS)[number];

const ABERTURA_PARCEIRO: Record<Parceiro, string> = {
  cerimonial: "Olá! Sou cerimonialista e quero indicar o MP Lafer a um casal.",
  fotografo: "Olá! Fotografo casamentos e quero combinar um ensaio com o MP Lafer.",
};

export const parceiroDe = (valor: string | null | undefined): Parceiro | null =>
  (PARCEIROS as readonly string[]).includes(valor ?? "") ? (valor as Parceiro) : null;

export const hrefParceiro = (parceiro: Parceiro) => `${WHATSAPP_HREF}?p=${parceiro}`;

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2027-03-13" vira "13/03/2027". Qualquer outra coisa, ou um dia que não existe, vira "". */
export function dataBR(iso: string | null | undefined): string {
  const partes = DATA_ISO.exec((iso ?? "").trim());
  if (!partes) return "";
  const [, ano, mes, dia] = partes;
  const [a, m, d] = [Number(ano), Number(mes), Number(dia)];
  if (a < 2000 || a > 2100 || m < 1 || m > 12 || d < 1) return "";
  const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return d > ultimoDia ? "" : `${dia}/${mes}/${ano}`;
}

const LOCAL_MAXIMO = 80;

/** O que a pessoa digitou no campo de cidade: uma linha só, sem caractere invisível, no máximo 80 letras. */
export function localLimpo(valor: string | null | undefined): string {
  return (valor ?? "")
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LOCAL_MAXIMO);
}

/**
 * Mensagem que já chega escrita no WhatsApp. A conversa começa pela data e pelo local: se a pessoa escolheu
 * a data (e a cidade) na página, as duas já vão preenchidas; senão, ficam em branco para ela completar.
 */
export function mensagemWhatsapp(pedido: { data?: string | null; local?: string | null; parceiro?: Parceiro | null } = {}): string {
  const data = dataBR(pedido.data);
  const local = localLimpo(pedido.local);
  const linhas = [
    pedido.parceiro ? ABERTURA_PARCEIRO[pedido.parceiro] : ABERTURA,
    data ? `Data: ${data}` : "Data:",
    local ? `Cidade ou local: ${local}` : "Cidade ou local:",
  ];
  if (!pedido.parceiro) linhas.push(LINHA_SERVICO);
  return linhas.join("\n");
}

/** A mensagem sem nada escolhido: é a que os botões simples enviam. */
export const MENSAGEM_WHATSAPP = mensagemWhatsapp();
