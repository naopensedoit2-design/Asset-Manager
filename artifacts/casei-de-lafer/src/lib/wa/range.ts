// Pedaços de arquivo (HTTP Range) para a mídia das conversas. Puro: testado em range.test.ts.
//
// Por que existe: a Vercel recusa resposta de função acima de 4,5 MB, e o iPhone só toca vídeo e áudio se o
// servidor entregar o arquivo em pedaços (resposta 206). Cada pedaço fica abaixo do limite; o player pede o próximo.

/** Maior pedaço por resposta (abaixo dos 4,5 MB da Vercel). */
export const MAX_SLICE = 4_000_000;

/** Faixa de bytes, com início e fim incluídos. */
export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Lê o cabeçalho Range para um arquivo de `size` bytes.
 * - `null`: sem Range (ou um formato que não atendemos, como várias faixas): responde o arquivo inteiro.
 * - `"invalido"`: a faixa começa depois do fim do arquivo: responde 416.
 * - faixa: o pedaço a entregar, já limitado a MAX_SLICE.
 */
export function parseByteRange(header: string | null | undefined, size: number): ByteRange | "invalido" | null {
  if (!header) return null;
  const m = /^\s*bytes\s*=\s*(\d*)\s*-\s*(\d*)\s*$/i.exec(header);
  if (!m) return null;
  const [, first, last] = m;
  if (first === "" && last === "") return null;
  if (size <= 0) return "invalido";

  let start: number;
  let end: number;
  if (first === "") {
    // "bytes=-500": os últimos 500 bytes
    const n = Number(last);
    if (!(n > 0)) return "invalido";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(first);
    end = last === "" ? size - 1 : Number(last);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
    if (start >= size) return "invalido";
    if (end < start) return null; // faixa sem sentido: o HTTP manda ignorar o cabeçalho
    end = Math.min(end, size - 1);
  }
  return { start, end: Math.min(end, start + MAX_SLICE - 1) };
}

/** Valor do cabeçalho Content-Range de uma resposta 206. */
export function contentRange(r: ByteRange, size: number): string {
  return `bytes ${r.start}-${r.end}/${size}`;
}
