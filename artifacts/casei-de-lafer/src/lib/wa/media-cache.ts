// Guarda por poucos minutos as mídias que o painel acabou de baixar da Meta. Puro: testado em media-cache.test.ts.
//
// O player de vídeo pede o arquivo em vários pedaços (ver range.ts). Sem este cache, cada pedaço baixaria o
// arquivo inteiro da Meta de novo. Vale só enquanto a mesma instância da função está viva; se a instância mudar,
// o arquivo é baixado outra vez, sem perda nenhuma.

export interface CachedMedia {
  data: Buffer;
  mime: string;
}

export interface MediaCacheOptions {
  /** Soma máxima dos arquivos guardados, em bytes. */
  maxBytes: number;
  /** Quanto tempo cada arquivo vale. */
  ttlMs: number;
  now?: () => number;
}

export function createMediaCache(opts: MediaCacheOptions) {
  const now = opts.now ?? Date.now;
  const items = new Map<string, { at: number; item: CachedMedia }>();
  const loading = new Map<string, Promise<CachedMedia>>();
  let total = 0;

  const drop = (key: string) => {
    const hit = items.get(key);
    if (!hit) return;
    total -= hit.item.data.length;
    items.delete(key);
  };

  const get = (key: string): CachedMedia | undefined => {
    const hit = items.get(key);
    if (!hit) return undefined;
    if (now() - hit.at > opts.ttlMs) {
      drop(key);
      return undefined;
    }
    return hit.item;
  };

  const set = (key: string, item: CachedMedia) => {
    drop(key);
    if (item.data.length > opts.maxBytes) return; // grande demais para guardar
    // Abre espaço tirando os mais antigos (o Map guarda na ordem em que entraram).
    for (const old of [...items.keys()]) {
      if (total + item.data.length <= opts.maxBytes) break;
      drop(old);
    }
    items.set(key, { at: now(), item });
    total += item.data.length;
  };

  /** Devolve o arquivo guardado ou baixa com `load`. Dois pedidos juntos do mesmo arquivo baixam uma vez só. */
  const getOrLoad = async (key: string, load: () => Promise<CachedMedia>): Promise<CachedMedia> => {
    const hit = get(key);
    if (hit) return hit;
    const running = loading.get(key);
    if (running) return running;
    const p = load()
      .then((item) => {
        set(key, item);
        return item;
      })
      .finally(() => loading.delete(key));
    loading.set(key, p);
    return p;
  };

  return { get, set, getOrLoad, bytes: () => total, count: () => items.size };
}
