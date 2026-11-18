// Onde cada foto do painel entra na página inicial, sem mudar o banco nem o painel.
// O dono usa os dois campos que a galeria do painel já tem em cada foto:
// - "Tag do casal": um apelido do casal. Nunca aparece no site; serve só para a página não mostrar o mesmo
//   casal duas vezes seguidas.
// - "Local": o lugar da foto NA PÁGINA (capa, passagem, chegada, saida, ensaio, carro, cenario, final ou
//   detalhe) e, se quiser, o crédito depois de uma barra. Exemplo: "chegada | Foto: Nome de quem fotografou".
// Foto sem lugar marcado entra onde estiver faltando, na ordem do painel (as mais recentes primeiro).
// A capa pode ter várias fotos (carrossel): "capa 1", "capa 2"… dizem a ordem. A página Site do painel
// (app/admin/site) escreve estes campos por botões; quem digita à mão segue o mesmo formato.

export const LUGARES = ["capa", "passagem", "chegada", "saida", "ensaio", "carro", "cenario", "final", "detalhe"] as const;
export type Lugar = (typeof LUGARES)[number];

/** A foto como vem do painel. `casal` e `local` ficam só no servidor. */
export interface FotoDoPainel {
  id: number;
  url: string;
  alt: string;
  casal: string;
  local: string;
}

/** A foto como vai para a página: sem a tag do casal. */
export interface FotoDaPagina {
  id: number;
  url: string;
  alt: string;
  /** Nome de quem fotografou, quando o painel informa. "" = sem crédito. */
  credito: string;
}

export interface Curadoria {
  /** Primeira foto da capa (a mesma de `capas[0]`). */
  capa: FotoDaPagina | null;
  /** Fotos da capa marcadas na galeria, na ordem do carrossel. */
  capas: FotoDaPagina[];
  /** Foto deitada do carro em movimento. Só entra se estiver marcada: uma foto em pé não serve aqui. */
  passagem: FotoDaPagina | null;
  chegada: FotoDaPagina | null;
  saida: FotoDaPagina | null;
  ensaio: FotoDaPagina | null;
  carro: FotoDaPagina | null;
  /** Foto do bloco dos fotógrafos. Só entra se estiver marcada. */
  cenario: FotoDaPagina | null;
  final: FotoDaPagina | null;
  detalhes: FotoDaPagina[];
}

export const ALT_PADRAO = "MP Lafer conversível em casamento ou ensaio";
const CREDITO_MAXIMO = 60;
const DETALHES_MINIMO = 4;
const DETALHES_MAXIMO = 10;
export const CAPAS_MAXIMO = 5;

const simples = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .trim()
    .replace(/^#\s*/, "");

function lugarDe(texto: string): { lugar: Lugar | null; ordem: number } {
  const partes = /^(.*?)\s*(\d{1,2})?$/.exec(simples(texto));
  const nome = (partes?.[1] ?? "").replace(/s$/, "");
  const lugar = (LUGARES as readonly string[]).includes(nome) ? (nome as Lugar) : null;
  return { lugar, ordem: lugar && partes?.[2] ? Number(partes[2]) : 0 };
}

/** O crédito como sai na página: sem "Foto:", sem quebra de linha e, se for o link do Instagram, só o @. */
export function creditoLimpo(texto: string): string {
  const limpo = texto
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ")
    .replace(/^\s*(foto|fotos|fotografia|cr[eé]dito)\s*:?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const insta = /^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:[?#].*)?$/i.exec(limpo)?.[1];
  return (insta ? `@${insta}` : limpo).slice(0, CREDITO_MAXIMO);
}

const creditoDe = creditoLimpo;

/** Lê o campo "Local" do painel: "chegada", "chegada | Foto: Nome", "capa 2" ou só "Foto: Nome". Outro texto é ignorado. */
export function lerLocal(local: string): { lugar: Lugar | null; credito: string; ordem: number } {
  const [antes, ...resto] = local.split("|");
  const { lugar, ordem } = lugarDe(antes ?? "");
  if (resto.length > 0) return { lugar, credito: creditoDe(resto.join(" ")), ordem };
  if (!lugar && /^\s*(foto|fotos|fotografia|cr[eé]dito)\s*:/i.test(local)) return { lugar: null, credito: creditoDe(local), ordem: 0 };
  return { lugar, credito: "", ordem };
}

/** O contrário de lerLocal: o que a página Site do painel grava no campo "Local". */
export function montarLocal(lugar: Lugar | null, credito: string, ordem = 0): string {
  const nome = creditoDe(credito);
  const onde = lugar ? (ordem > 0 ? `${lugar} ${Math.min(99, Math.round(ordem))}` : lugar) : "";
  if (onde && nome) return `${onde} | Foto: ${nome}`;
  return onde || (nome ? `Foto: ${nome}` : "");
}

interface Lida {
  foto: FotoDaPagina;
  casal: string;
  lugar: Lugar | null;
  ordem: number;
}

/** Lugares que aceitam uma foto qualquer quando nenhuma foi marcada, na ordem em que aparecem na página. */
const PREENCHER = ["chegada", "saida", "ensaio", "carro", "final"] as const;

export function curar(fotos: readonly FotoDoPainel[]): Curadoria {
  const lidas: Lida[] = fotos.map((f) => {
    const { lugar, credito, ordem } = lerLocal(f.local);
    return { foto: { id: f.id, url: f.url, alt: f.alt.trim() || ALT_PADRAO, credito }, casal: simples(f.casal), lugar, ordem };
  });

  const usadas = new Set<number>();
  const marcada = (lugar: Lugar): Lida | null => {
    const achada = lidas.find((l) => l.lugar === lugar && !usadas.has(l.foto.id)) ?? null;
    if (achada) usadas.add(achada.foto.id);
    return achada;
  };

  // Capa: todas as marcadas, pela ordem ("capa 1", "capa 2"…); sem número, depois das numeradas, na ordem do painel.
  const capas = lidas
    .filter((l) => l.lugar === "capa")
    .map((l, i) => ({ l, chave: (l.ordem || 1000) * 10_000 + i }))
    .sort((a, b) => a.chave - b.chave)
    .map(({ l }) => l)
    .slice(0, CAPAS_MAXIMO);
  for (const c of capas) usadas.add(c.foto.id);

  const escolhidas: Partial<Record<Lugar, Lida>> = {};
  for (const lugar of ["passagem", "chegada", "saida", "ensaio", "carro", "cenario", "final"] as const) {
    const achada = marcada(lugar);
    if (achada) escolhidas[lugar] = achada;
  }
  const detalhes = lidas.filter((l) => l.lugar === "detalhe");
  for (const d of detalhes) usadas.add(d.foto.id);

  // O que sobrou (sem lugar, ou repetida num lugar que já tem foto) preenche os lugares vazios.
  const livres = () => lidas.filter((l) => !usadas.has(l.foto.id) && l.lugar !== "capa" && l.lugar !== "passagem" && l.lugar !== "cenario");
  let anterior = "";
  for (const lugar of PREENCHER) {
    const atual = escolhidas[lugar];
    if (atual) {
      anterior = atual.casal;
      continue;
    }
    const sobra = livres();
    // De preferência, um casal diferente do que apareceu logo antes.
    const proxima = sobra.find((l) => !l.casal || l.casal !== anterior) ?? sobra[0];
    if (!proxima) continue;
    usadas.add(proxima.foto.id);
    escolhidas[lugar] = proxima;
    anterior = proxima.casal;
  }

  const faixa = [...detalhes, ...(detalhes.length < DETALHES_MINIMO ? livres() : [])].slice(0, DETALHES_MAXIMO);

  const foto = (lugar: Lugar) => escolhidas[lugar]?.foto ?? null;
  return {
    capa: capas[0]?.foto ?? null,
    capas: capas.map((c) => c.foto),
    passagem: foto("passagem"),
    chegada: foto("chegada"),
    saida: foto("saida"),
    ensaio: foto("ensaio"),
    carro: foto("carro"),
    cenario: foto("cenario"),
    final: foto("final"),
    detalhes: faixa.length >= DETALHES_MINIMO ? faixa.map((l) => l.foto) : [],
  };
}
