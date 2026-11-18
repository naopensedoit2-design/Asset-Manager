// Fotos do Google Drive para a galeria do site, pela mesma conta de serviço da Agenda (só leitura).
// O dono compartilha UMA pasta com o e-mail da conta, como Leitor; as subpastas são os casais.
// Pastas que outra pessoa (um fotógrafo, por exemplo) compartilhar direto com o e-mail da conta também aparecem.
// Regras puras em drive-regras.ts; sugestão de fotógrafo em src/lib/landing/fotografos.ts.

import { fotografosConhecidos } from "@/lib/landing/fotografos";
import { prisma } from "@/lib/prisma";
import { uploadBuffer } from "@/lib/storage";
import { googleToken, serviceAccountEmail } from "./calendar";
import { CHAVE_PASTA, ehImagem, idsJaImportados, miniaturaNoTamanho, motivoDoErro, publicIdDoDrive } from "./drive-regras";

const API = process.env["GOOGLE_DRIVE_API_BASE"] || "https://www.googleapis.com/drive/v3";
const ESCOPO = "https://www.googleapis.com/auth/drive.readonly";
const TIMEOUT_MS = 15_000;
/** Tamanho importado: o maior que a página usa (e bem abaixo do limite de 10 MB do Cloudinary). */
const LADO_IMPORTADO = 2400;
const PASTA = "application/vnd.google-apps.folder";

export class ErroDoDrive extends Error {}

interface Arquivo {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  parents?: string[];
  size?: string;
}

async function drive<T>(caminho: string): Promise<T> {
  const res = await fetch(`${API}${caminho}`, {
    headers: { authorization: `Bearer ${await googleToken(ESCOPO)}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok) throw new ErroDoDrive(motivoDoErro(res.status, json?.error?.message ?? "", serviceAccountEmail()));
  return json as T;
}

async function buscar(consulta: string): Promise<Arquivo[]> {
  const out: Arquivo[] = [];
  let pagina = "";
  do {
    const q = encodeURIComponent(consulta);
    const campos = encodeURIComponent("nextPageToken, files(id, name, mimeType, thumbnailLink, size)");
    const r = await drive<{ files: Arquivo[]; nextPageToken?: string }>(
      `/files?q=${q}&fields=${campos}&pageSize=200&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true${pagina ? `&pageToken=${pagina}` : ""}`,
    );
    out.push(...r.files);
    pagina = r.nextPageToken ?? "";
  } while (pagina && out.length < 2000);
  return out;
}

const filhos = (pastaId: string) => buscar(`'${pastaId}' in parents and trashed = false`);

export async function pastaEscolhida(): Promise<string | null> {
  const linha = await prisma.setting.findUnique({ where: { key: CHAVE_PASTA } }).catch(() => null);
  return linha?.value || null;
}

export async function escolherPasta(id: string) {
  await prisma.setting.upsert({ where: { key: CHAVE_PASTA }, create: { key: CHAVE_PASTA, value: id }, update: { value: id } });
}

export interface FotoDoDrive {
  id: string;
  nome: string;
  importada: boolean;
}

export interface PastaDoDrive {
  id: string;
  nome: string;
  /** Pasta que alguém compartilhou direto com o e-mail do site (fora da pasta escolhida). */
  compartilhada: boolean;
  /** Fotógrafo que o painel sugere para estas fotos: o que já foi usado neste casal. */
  credito: string;
  fotos: FotoDoDrive[];
}

/** A pasta escolhida e as pastas compartilhadas direto com o site, com as fotos delas e de cada subpasta (um nível). */
export async function listarFotos(): Promise<
  | { pronto: false; motivo: string; email: string | null; pasta: string | null }
  | { pronto: true; email: string | null; pasta: string; nome: string; pastas: PastaDoDrive[]; fotografos: string[] }
> {
  const email = serviceAccountEmail();
  const pasta = await pastaEscolhida();
  if (!email) return { pronto: false, motivo: "Falta a conta de serviço do Google (GOOGLE_SERVICE_ACCOUNT_JSON na Vercel), a mesma da Agenda.", email, pasta };
  if (!pasta) return { pronto: false, motivo: "Cole o link da pasta do Drive abaixo e toque em Salvar.", email, pasta };
  try {
    const raiz = await drive<{ id: string; name: string }>(`/files/${pasta}?fields=id,name&supportsAllDrives=true`);
    const galeria = await prisma.galleryImage.findMany({ select: { publicId: true, location: true, coupleTag: true } });
    const ja = idsJaImportados(galeria.map((g) => g.publicId));
    const conhecidos = fotografosConhecidos(galeria.map((g) => ({ local: g.location, casal: g.coupleTag })));
    const foto = (a: Arquivo): FotoDoDrive => ({ id: a.id, nome: a.name, importada: ja.has(a.id) });
    const secao = (id: string, nome: string, compartilhada: boolean, fotos: FotoDoDrive[]): PastaDoDrive => ({ id, nome, compartilhada, credito: conhecidos.doCasal(nome), fotos });

    // Uma pasta de origem: as fotos soltas nela (casal = nome dela, menos na pasta escolhida) e uma seção por subpasta.
    const daOrigem = async (id: string, nome: string, compartilhada: boolean) => {
      const itens = await filhos(id);
      const out: PastaDoDrive[] = [];
      const soltas = itens.filter((a) => ehImagem(a.mimeType)).map(foto);
      if (soltas.length) out.push(secao(id, nome, compartilhada, soltas));
      for (const sub of itens.filter((a) => a.mimeType === PASTA)) {
        const fotos = (await filhos(sub.id)).filter((a) => ehImagem(a.mimeType)).map(foto);
        if (fotos.length) out.push(secao(sub.id, sub.name, compartilhada, fotos));
      }
      return out;
    };

    const pastas = await daOrigem(raiz.id, raiz.name, false);
    const outras = (await buscar(`sharedWithMe = true and mimeType = '${PASTA}' and trashed = false`).catch((): Arquivo[] => [])).filter((a) => a.id !== pasta).slice(0, 30);
    for (const o of outras) pastas.push(...(await daOrigem(o.id, o.name, true)));
    return { pronto: true, email, pasta, nome: raiz.name, pastas, fotografos: conhecidos.lista };
  } catch (e) {
    return { pronto: false, motivo: e instanceof ErroDoDrive ? e.message : "Não consegui falar com o Google Drive agora.", email, pasta };
  }
}

/**
 * Só arquivos dentro da pasta escolhida, de uma pasta compartilhada direto com o site ou de uma subpasta delas
 * podem ser lidos pelo painel. Devolve também o casal (nome da pasta onde a foto está).
 */
async function arquivoPermitido(fileId: string): Promise<Arquivo & { pastaNome: string }> {
  const pasta = await pastaEscolhida();
  if (!pasta) throw new ErroDoDrive("Escolha a pasta do Drive primeiro.");
  const a = await drive<Arquivo>(`/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,thumbnailLink,parents,size&supportsAllDrives=true`);
  if (!ehImagem(a.mimeType)) throw new ErroDoDrive("Este arquivo não é uma foto.");
  const fora = () => new ErroDoDrive("Foto fora das pastas do site.");
  const paiId = a.parents?.[0];
  if (!paiId) throw fora();
  if (paiId === pasta) return { ...a, pastaNome: "" };
  type Pasta = { id: string; name: string; parents?: string[]; sharedWithMeTime?: string };
  const ler = (id: string) => drive<Pasta>(`/files/${encodeURIComponent(id)}?fields=id,name,parents,sharedWithMeTime&supportsAllDrives=true`);
  const pai = await ler(paiId);
  if (pai.parents?.includes(pasta) || pai.sharedWithMeTime) return { ...a, pastaNome: pai.name };
  const avoId = pai.parents?.[0];
  if (avoId && (await ler(avoId).catch(() => null))?.sharedWithMeTime) return { ...a, pastaNome: pai.name };
  throw fora();
}

async function baixar(a: Arquivo, lado: number): Promise<{ bytes: Buffer; tipo: string }> {
  const token = await googleToken(ESCOPO);
  if (a.thumbnailLink) {
    const r = await fetch(miniaturaNoTamanho(a.thumbnailLink, lado), { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (r.ok) return { bytes: Buffer.from(await r.arrayBuffer()), tipo: r.headers.get("content-type") || "image/jpeg" };
  }
  // Sem miniatura (foto recém-enviada ao Drive): o arquivo inteiro, se couber no Cloudinary.
  if (Number(a.size ?? 0) > 10_000_000) throw new ErroDoDrive(`${a.name}: o Drive ainda não gerou a versão menor e o original passa de 10 MB. Tente de novo mais tarde.`);
  const r = await fetch(`${API}/files/${a.id}?alt=media&supportsAllDrives=true`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new ErroDoDrive(`${a.name}: não consegui baixar do Drive.`);
  return { bytes: Buffer.from(await r.arrayBuffer()), tipo: a.mimeType };
}

/** Miniatura para o painel mostrar (pequena: cabe na resposta da Vercel). */
export async function miniatura(fileId: string) {
  return baixar(await arquivoPermitido(fileId), 480);
}

/** Copia a foto do Drive para a galeria, com o casal = nome da subpasta. Foto já importada não duplica. */
export async function importar(fileId: string, local: string) {
  const a = await arquivoPermitido(fileId);
  const publicId = publicIdDoDrive(a.id);
  const ja = await prisma.galleryImage.findFirst({ where: { publicId: { endsWith: publicId } } });
  if (ja) return { foto: ja, nova: false };
  const { bytes } = await baixar(a, LADO_IMPORTADO);
  const { url, publicId: salvo } = await uploadBuffer(bytes, "casei-de-lafer/gallery", publicId);
  const foto = await prisma.galleryImage.create({ data: { url, publicId: salvo, coupleTag: a.pastaNome.slice(0, 80), location: local.slice(0, 120) } });
  return { foto, nova: true };
}
