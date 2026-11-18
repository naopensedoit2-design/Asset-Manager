// Fotos do Google Drive para a galeria do site: regras puras (sem rede), para poder testar.
// O banco e as chamadas ao Google ficam em drive.ts.

/** Chave em Setting onde fica a pasta escolhida no painel (Site → Galeria). */
export const CHAVE_PASTA = "googleDrivePasta";

/** Aceita o link da pasta ("…/folders/<id>?usp=…") ou só o id. Qualquer outra coisa vira null. */
export function idDaPasta(texto: string | null | undefined): string | null {
  const t = (texto ?? "").trim();
  const doLink = /\/folders\/([A-Za-z0-9_-]{10,})/.exec(t)?.[1] ?? /[?&]id=([A-Za-z0-9_-]{10,})/.exec(t)?.[1];
  const id = doLink ?? t;
  return /^[A-Za-z0-9_-]{10,100}$/.test(id) ? id : null;
}

/** Só imagens entram (vídeos ficam no Drive). */
export const ehImagem = (mimeType: string) => /^image\/(jpeg|png|webp|heic|heif|gif)$/i.test(mimeType);

/** A versão do Drive no tamanho que o site usa: "=s220" vira "=s<lado>". */
export function miniaturaNoTamanho(thumbnailLink: string, lado: number): string {
  const l = Math.max(64, Math.min(4000, Math.round(lado)));
  return /=s\d+(-c)?$/.test(thumbnailLink) ? thumbnailLink.replace(/=s\d+(-c)?$/, `=s${l}`) : `${thumbnailLink}=s${l}`;
}

/** Nome da foto no Cloudinary: o id do arquivo no Drive. Assim o painel sabe o que já foi importado. */
export const publicIdDoDrive = (fileId: string) => `drive-${fileId.replace(/[^A-Za-z0-9_-]/g, "")}`;

/** Ids do Drive já importados, a partir do publicId das fotos da galeria ("casei-de-lafer/gallery/drive-<id>"). */
export function idsJaImportados(publicIds: readonly string[]): Set<string> {
  const ids = new Set<string>();
  for (const p of publicIds) {
    const m = /(?:^|\/)drive-([A-Za-z0-9_-]+)$/.exec(p);
    if (m) ids.add(m[1]!);
  }
  return ids;
}

/** O que dizer ao dono quando o Google recusa. */
export function motivoDoErro(status: number, mensagem: string, emailDaConta: string | null): string {
  if (/has not been used|is disabled|accessNotConfigured|SERVICE_DISABLED/i.test(mensagem))
    return "A Google Drive API está desligada. Ligue em console.cloud.google.com → APIs e serviços → Google Drive API → Ativar, no mesmo projeto da conta da Agenda.";
  if (status === 404 || status === 403)
    return `O site não enxerga a pasta. No Drive, compartilhe a pasta com ${emailDaConta ?? "o e-mail da conta de serviço"} como Leitor.`;
  return `O Google Drive não respondeu (${status}). Tente de novo em instantes.`;
}
