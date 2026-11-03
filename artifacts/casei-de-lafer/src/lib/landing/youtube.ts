// O painel guarda o vídeo do topo como código ou como endereço do YouTube; aqui sai só o código de 11 caracteres.
const CODIGO = /^[A-Za-z0-9_-]{11}$/;

export function idDoYoutube(valor: string | null | undefined): string | null {
  const texto = (valor ?? "").trim();
  if (!texto) return null;
  if (CODIGO.test(texto)) return texto;
  try {
    const url = new URL(texto);
    const host = url.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") {
      id = url.pathname.slice(1).split("/")[0] ?? null;
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      id = url.searchParams.get("v") ?? /^\/(?:embed|shorts|live)\/([^/?]+)/.exec(url.pathname)?.[1] ?? null;
    }
    return id && CODIGO.test(id) ? id : null;
  } catch {
    return null;
  }
}
