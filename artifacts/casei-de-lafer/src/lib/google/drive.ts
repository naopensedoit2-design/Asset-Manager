// Fotos do Google Drive para a galeria do site, pela mesma conta de serviço da Agenda (só leitura).
// O dono compartilha UMA pasta com o e-mail da conta, como Leitor; as subpastas são os casais.
// Regras puras em drive-regras.ts.

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

async function filhos(pastaId: string): Promise<Arquivo[]> {
  const out: Arquivo[] = [];
  let pagina = "";
  do {
    const q = encodeURIComponent(`'${pastaId}' in parents and trashed = false`);
    const campos = encodeURIComponent("nextPageToken, files(id, name, mimeType, thumbnailLink, size)");
    const r = await drive<{ files: Arquivo[]; nextPageToken?: string }>(
      `/files?q=${q}&fields=${campos}&pageSize=200&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true${pagina ? `&pageToken=${pagina}` : ""}`,
    );
    out.push(...r.files);
    pagina = r.nextPageToken ?? "";
  } while (pagina && out.length < 2000);
  return out;
}

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
  fotos: FotoDoDrive[];
}

/** A pasta escolhida, com as fotos dela e de cada subpasta (um nível: as pastas dos casais). */
export async function listarFotos(): Promise<
  { pronto: false; motivo: string; email: string | null; pasta: string | null } | { pronto: true; email: string | null; pasta: string; nome: string; pastas: PastaDoDrive[] }
> {
  const email = serviceAccountEmail();
  const pasta = await pastaEscolhida();
  if (!email) return { pronto: false, motivo: "Falta a conta de serviço do Google (GOOGLE_SERVICE_ACCOUNT_JSON na Vercel), a mesma da Agenda.", email, pasta };
  if (!pasta) return { pronto: false, motivo: "Cole o link da pasta do Drive abaixo e toque em Salvar.", email, pasta };
  try {
    const raiz = await drive<{ id: string; name: string }>(`/files/${pasta}?fields=id,name&supportsAllDrives=true`);
    const publicIds = (await prisma.galleryImage.findMany({ select: { publicId: true } })).map((g) => g.publicId);
    const ja = idsJaImportados(publicIds);
    const foto = (a: Arquivo): FotoDoDrive => ({ id: a.id, nome: a.name, importada: ja.has(a.id) });
    const itens = await filhos(pasta);
    const soltas = itens.filter((a) => ehImagem(a.mimeType)).map(foto);
    const pastas: PastaDoDrive[] = [];
    for (const sub of itens.filter((a) => a.mimeType === PASTA)) {
      const fotos = (await filhos(sub.id)).filter((a) => ehImagem(a.mimeType)).map(foto);
      if (fotos.length) pastas.push({ id: sub.id, nome: sub.name, fotos });
    }
    if (soltas.length) pastas.unshift({ id: raiz.id, nome: raiz.name, fotos: soltas });
    return { pronto: true, email, pasta, nome: raiz.name, pastas };
  } catch (e) {
    return { pronto: false, motivo: e instanceof ErroDoDrive ? e.message : "Não consegui falar com o Google Drive agora.", email, pasta };
  }
}

/** Só arquivos dentro da pasta escolhida (ou de uma subpasta dela) podem ser lidos pelo painel. */
async function arquivoPermitido(fileId: string): Promise<Arquivo & { pastaNome: string }> {
  const pasta = await pastaEscolhida();
  if (!pasta) throw new ErroDoDrive("Escolha a pasta do Drive primeiro.");
  const a = await drive<Arquivo>(`/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,thumbnailLink,parents,size&supportsAllDrives=true`);
  if (!ehImagem(a.mimeType)) throw new ErroDoDrive("Este arquivo não é uma foto.");
  const pai = a.parents?.[0];
  if (!pai) throw new ErroDoDrive("Foto fora da pasta escolhida.");
  if (pai === pasta) return { ...a, pastaNome: "" };
  const p = await drive<{ id: string; name: string; parents?: string[] }>(`/files/${pai}?fields=id,name,parents&supportsAllDrives=true`);
  if (!p.parents?.includes(pasta)) throw new ErroDoDrive("Foto fora da pasta escolhida.");
  return { ...a, pastaNome: p.name };
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
