// Fotos do Cloudinary sob demanda: largura certa e formato leve (AVIF/WebP) em vez do arquivo original.
// Qualquer URL que não seja do Cloudinary (arquivo em /public, outro endereço) passa sem mudança.

const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

export function ehCloudinary(url: string): boolean {
  return CLOUDINARY.test(url);
}

/** Mesma foto, limitada a `largura` px de largura, no formato e na qualidade que o aparelho aceitar. */
export function otimizada(url: string, largura: number): string {
  const partes = CLOUDINARY.exec(url);
  if (!partes) return url;
  const [, base, resto] = partes;
  // Já tem formato automático na URL: foi cadastrada assim, não mexe.
  if (/(^|[,/])f_auto([,/]|$)/.test(resto)) return url;
  const w = Math.max(16, Math.round(largura));
  return `${base}f_auto,q_auto,c_limit,w_${w}/${resto}`;
}

/** Valor do srcset com uma versão por largura; undefined quando a foto não é do Cloudinary. */
export function srcSet(url: string, larguras: readonly number[]): string | undefined {
  if (!ehCloudinary(url)) return undefined;
  return larguras.map((w) => `${otimizada(url, w)} ${w}w`).join(", ");
}
