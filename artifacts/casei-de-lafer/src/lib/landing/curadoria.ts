// Onde cada foto do painel entra na página inicial, sem mudar o banco nem o painel.
// O dono usa os dois campos que a galeria do painel já tem em cada foto:
// - "Tag do casal": um apelido do casal. Nunca aparece no site; serve só para a página não mostrar o mesmo
//   casal duas vezes seguidas.
// - "Local": o lugar da foto NA PÁGINA (capa, passagem, chegada, saida, ensaio, carro, cenario, final ou
//   detalhe) e, se quiser, o crédito depois de uma barra. Exemplo: "chegada | Foto: Nome de quem fotografou".
// Foto sem lugar marcado entra onde estiver faltando, na ordem do painel (as mais recentes primeiro).

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
  /** Só é usada quando o painel não tem foto do topo cadastrada. */
  capa: FotoDaPagina | null;
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

const simples = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .trim()
    .replace(/^#\s*/, "");

function lugarDe(texto: string): Lugar | null {
  const nome = simples(texto).replace(/s$/, "");
  return (LUGARES as readonly string[]).includes(nome) ? (nome as Lugar) : null;
}

function creditoDe(texto: string): string {
  return texto
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ")
    .replace(/^\s*(foto|fotos|fotografia|cr[eé]dito)\s*:?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CREDITO_MAXIMO);
}

/** Lê o campo "Local" do painel: "chegada", "chegada | Foto: Nome" ou só "Foto: Nome". Outro texto é ignorado. */
export function lerLocal(local: string): { lugar: Lugar | null; credito: string } {
  const [antes, ...resto] = local.split("|");
  const lugar = lugarDe(antes ?? "");
  if (resto.length > 0) return { lugar, credito: creditoDe(resto.join(" ")) };
  if (!lugar && /^\s*(foto|fotos|fotografia|cr[eé]dito)\s*:/i.test(local)) return { lugar: null, credito: creditoDe(local) };
  return { lugar, credito: "" };
}

interface Lida {
  foto: FotoDaPagina;
  casal: string;
  lugar: Lugar | null;
}

/** Lugares que aceitam uma foto qualquer quando nenhuma foi marcada, na ordem em que aparecem na página. */
const PREENCHER = ["chegada", "saida", "ensaio", "carro", "final"] as const;

export function curar(fotos: readonly FotoDoPainel[]): Curadoria {
  const lidas: Lida[] = fotos.map((f) => {
    const { lugar, credito } = lerLocal(f.local);
    return { foto: { id: f.id, url: f.url, alt: f.alt.trim() || ALT_PADRAO, credito }, casal: simples(f.casal), lugar };
  });

  const usadas = new Set<number>();
  const marcada = (lugar: Lugar): Lida | null => {
    const achada = lidas.find((l) => l.lugar === lugar && !usadas.has(l.foto.id)) ?? null;
    if (achada) usadas.add(achada.foto.id);
    return achada;
  };

  const escolhidas: Partial<Record<Lugar, Lida>> = {};
  for (const lugar of ["capa", "passagem", "chegada", "saida", "ensaio", "carro", "cenario", "final"] as const) {
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
    capa: foto("capa"),
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
