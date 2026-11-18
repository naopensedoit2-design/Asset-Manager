"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CloudDownload, ExternalLink, ImagePlus, Trash2, Upload, X } from "lucide-react";
import { ErrorNote, Loading, Panel } from "@/components/gestor/ui";
import { CAPAS_MAXIMO, curar, lerLocal, type FotoDoPainel } from "@/lib/landing/curadoria";
import { otimizada } from "@/lib/landing/imagem";
import {
  LUGARES_UNICOS,
  NOME_DO_LUGAR,
  colocarNaCapa,
  colocarNoLugar,
  colocarNosDetalhes,
  fotosDaCapa,
  moverNaCapa,
  tirarDoLugar,
  trocarCredito,
  type LugarUnico,
  type Mudanca,
} from "@/lib/landing/painel-site";
import BloqueiosDeData from "./BloqueiosDeData";
import ImportarDrive from "./ImportarDrive";
import NumeroReserva from "./NumeroReserva";

// Site: o que aparece em eucaseidelafer.com, na ordem da página. Cada botão grava o campo "Local" da foto
// (regras em src/lib/landing/painel-site.ts); a página se refaz na hora (revalidar.ts).

interface FotoDaGaleria {
  id: number;
  url: string;
  alt: string;
  coupleTag: string;
  location: string;
}

interface FotoDoTopo {
  url: string;
}

const paraPainel = (f: FotoDaGaleria): FotoDoPainel => ({ id: f.id, url: f.url, alt: f.alt, casal: f.coupleTag, local: f.location });

/** Onde cada parte aparece, para o dono reconhecer na página. */
const ONDE: Record<LugarUnico, string> = {
  passagem: "Foto deitada que atravessa a tela com a rolagem. Sem foto marcada, esta parte não aparece.",
  chegada: "Primeiro serviço, com o valor do Carro da Noiva.",
  saida: "Segundo serviço, sem valor.",
  ensaio: "Terceiro serviço, com o valor do Ensaio.",
  carro: "Ao lado da história e da ficha do carro.",
  cenario: "No bloco para fotógrafos. Sem foto marcada, o bloco fica só com texto.",
  final: "Atrás do convite final, antes do rodapé.",
};

function Miniatura({ url, alt, className = "" }: { url: string; alt: string; className?: string }) {
  return <img src={otimizada(url, 480)} alt={alt} loading="lazy" className={`w-full h-full object-cover ${className}`} />;
}

function Botao({ children, onClick, disabled, perigo, rotulo }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; perigo?: boolean; rotulo?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={rotulo}
      className={`inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded border text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        perigo ? "border-bad/40 text-bad hover:bg-bad/10" : "border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
      }`}
    >
      {children}
    </button>
  );
}

/** Janela para escolher uma foto da galeria. */
function Escolher({ fotos, titulo, onEscolher, onFechar }: { fotos: FotoDaGaleria[]; titulo: string; onEscolher: (id: number) => void; onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-bg-primary/90 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-serif text-xl text-text-primary">{titulo}</h2>
          <Botao onClick={onFechar} rotulo="Fechar">
            <X className="w-4 h-4" aria-hidden="true" /> Fechar
          </Botao>
        </div>
        {fotos.length === 0 ? (
          <p className="text-sm text-text-muted">A galeria está vazia. Envie fotos na seção Galeria, no fim desta página.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {fotos.map((f) => {
              const { lugar } = lerLocal(f.location);
              return (
                <li key={f.id}>
                  <button type="button" onClick={() => onEscolher(f.id)} className="block w-full text-left cursor-pointer group">
                    <span className="block aspect-[4/5] overflow-hidden rounded border border-border-subtle group-hover:border-gold">
                      <Miniatura url={f.url} alt={f.alt || "Foto da galeria"} />
                    </span>
                    <span className="block mt-1 text-sm text-text-muted truncate">{lugar ? `Hoje em: ${NOME_DO_LUGAR[lugar]}` : "Sem lugar"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function FotoDoTopoCampo({ tipo, rotulo, foto, onMudou }: { tipo: "desktop" | "mobile"; rotulo: string; foto: FotoDoTopo | null; onMudou: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  async function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", tipo);
    await fetch("/api/admin/hero", { method: "POST", body: fd });
    setEnviando(false);
    e.target.value = "";
    onMudou();
  }
  async function apagar() {
    await fetch("/api/admin/hero", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: tipo }) });
    onMudou();
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-text-secondary">{rotulo}</p>
      <div className={`overflow-hidden rounded border border-border-subtle bg-bg-elevated ${tipo === "mobile" ? "aspect-[4/5]" : "aspect-[16/10]"}`}>
        {foto ? <Miniatura url={foto.url} alt={`Foto principal da capa (${rotulo.toLowerCase()})`} /> : <span className="flex h-full items-center justify-center text-sm text-text-muted">Sem foto</span>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={enviar} />
      <div className="flex gap-2">
        <Botao onClick={() => ref.current?.click()} disabled={enviando}>
          <Upload className="w-4 h-4" aria-hidden="true" /> {enviando ? "Enviando…" : foto ? "Trocar" : "Enviar"}
        </Botao>
        {foto && (
          <Botao onClick={apagar} perigo rotulo={`Apagar a foto principal (${rotulo.toLowerCase()})`}>
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Botao>
        )}
      </div>
    </div>
  );
}

function CartaoDaGaleria({ foto, onSalvar, onApagar }: { foto: FotoDaGaleria; onSalvar: (dados: { alt: string; coupleTag: string; location: string }) => Promise<void>; onApagar: () => void }) {
  const lido = lerLocal(foto.location);
  const [alt, setAlt] = useState(foto.alt);
  const [credito, setCredito] = useState(lido.credito);
  const [casal, setCasal] = useState(foto.coupleTag);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo">("");
  const mudou = alt !== foto.alt || credito !== lido.credito || casal !== foto.coupleTag;
  async function salvar() {
    setEstado("salvando");
    await onSalvar({ alt, coupleTag: casal, location: trocarCredito(paraPainel(foto), credito) });
    setEstado("salvo");
    setTimeout(() => setEstado(""), 2000);
  }
  const campo = "w-full min-h-11 bg-bg-elevated border border-border-subtle text-text-primary placeholder:text-text-muted px-3 rounded text-[15px] focus:outline-none focus:border-gold/60";
  return (
    <li className="bg-bg-elevated/40 border border-border-subtle rounded-lg overflow-hidden flex flex-col">
      <div className="aspect-[4/3] sm:aspect-[4/5] overflow-hidden">
        <Miniatura url={foto.url} alt={foto.alt || "Foto da galeria"} />
      </div>
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <p className="text-sm text-text-muted">{lido.lugar ? `No site: ${NOME_DO_LUGAR[lido.lugar]}${lido.lugar === "capa" && lido.ordem ? ` (${lido.ordem}ª)` : ""}` : "Ainda sem lugar no site"}</p>
        <label className="block text-sm text-text-secondary">
          Descrição da foto
          <input className={`${campo} mt-1`} value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} placeholder="Ex.: Noiva chegando no MP Lafer" />
        </label>
        <label className="block text-sm text-text-secondary">
          Fotógrafo (crédito)
          <input className={`${campo} mt-1`} value={credito} maxLength={60} onChange={(e) => setCredito(e.target.value)} placeholder="Nome ou @ de quem fotografou" />
        </label>
        <label className="block text-sm text-text-secondary">
          Casal (só para você, não aparece no site)
          <input className={`${campo} mt-1`} value={casal} maxLength={80} onChange={(e) => setCasal(e.target.value)} placeholder="Ex.: ana-rodrigo" />
        </label>
        <div className="flex gap-2 pt-1 mt-auto">
          <button
            type="button"
            onClick={salvar}
            disabled={!mudou || estado === "salvando"}
            className="flex-1 min-h-11 rounded bg-gold text-bg-primary font-semibold text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {estado === "salvo" ? "Salvo" : estado === "salvando" ? "Salvando…" : "Salvar"}
          </button>
          <Botao onClick={onApagar} perigo rotulo="Apagar foto">
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Botao>
        </div>
      </div>
    </li>
  );
}

type Escolha = { tipo: "capa" } | { tipo: "detalhe" } | { tipo: "lugar"; lugar: LugarUnico };

export default function SitePage() {
  const queryClient = useQueryClient();
  const [escolha, setEscolha] = useState<Escolha | null>(null);
  const [drive, setDrive] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const galeria = useQuery<FotoDaGaleria[]>({
    queryKey: ["site-galeria"],
    queryFn: async () => {
      const r = await fetch("/api/admin/gallery");
      if (!r.ok) throw new Error("Não consegui ler a galeria. Tente de novo.");
      return r.json();
    },
  });
  const topo = useQuery<{ desktop: FotoDoTopo | null; mobile: FotoDoTopo | null }>({
    queryKey: ["site-topo"],
    queryFn: () => fetch("/api/hero").then((r) => r.json()),
  });

  const fotos = galeria.data ?? [];
  const noPainel = fotos.map(paraPainel);
  const pagina = curar(noPainel);
  const capas = fotosDaCapa(noPainel);
  const detalhesMarcados = noPainel.filter((f) => lerLocal(f.local).lugar === "detalhe");
  const atualizar = () => queryClient.invalidateQueries({ queryKey: ["site-galeria"] });

  async function gravar(mudancas: Mudanca[]) {
    setErro(null);
    try {
      for (const m of mudancas) {
        const r = await fetch(`/api/admin/gallery/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ location: m.local }) });
        if (!r.ok) throw new Error();
      }
    } catch {
      setErro("Não consegui salvar a mudança. Tente de novo.");
    } finally {
      await atualizar();
    }
  }

  async function salvarFoto(id: number, dados: { alt: string; coupleTag: string; location: string }) {
    const r = await fetch(`/api/admin/gallery/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
    if (!r.ok) setErro("Não consegui salvar a foto. Tente de novo.");
    await atualizar();
  }

  async function apagarFoto(id: number) {
    if (!window.confirm("Apagar esta foto da galeria e do site?")) return;
    await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    await atualizar();
  }

  async function enviarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []).slice(0, 20);
    if (!lista.length) return;
    setErro(null);
    const falhas: string[] = [];
    // Uma foto por envio: a Vercel recusa pedidos acima de ~4,5 MB.
    for (let i = 0; i < lista.length; i++) {
      setEnviando(`Enviando ${i + 1} de ${lista.length}…`);
      const fd = new FormData();
      fd.append("files", lista[i]!);
      const r = await fetch("/api/admin/gallery", { method: "POST", body: fd }).catch(() => null);
      if (!r?.ok) falhas.push(lista[i]!.name);
    }
    setEnviando(null);
    e.target.value = "";
    if (falhas.length) setErro(`Não consegui enviar: ${falhas.join(", ")}.`);
    await atualizar();
  }

  function escolher(id: number) {
    if (!escolha) return;
    const mudancas =
      escolha.tipo === "capa" ? colocarNaCapa(noPainel, id) : escolha.tipo === "detalhe" ? colocarNosDetalhes(noPainel, id) : colocarNoLugar(noPainel, id, escolha.lugar);
    setEscolha(null);
    void gravar(mudancas);
  }

  const tituloDaEscolha =
    escolha?.tipo === "capa" ? "Escolha uma foto para a capa" : escolha?.tipo === "detalhe" ? "Escolha uma foto para os detalhes" : escolha ? `Escolha a foto de: ${NOME_DO_LUGAR[escolha.lugar]}` : "";
  const temTopo = Boolean(topo.data?.desktop || topo.data?.mobile);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">Site</h1>
          <p className="text-sm text-text-muted mt-1 max-w-2xl">
            As fotos de eucaseidelafer.com, na mesma ordem da página. Toda mudança aparece no site na hora. As fotos ficam aqui, na galeria do
            painel; o botão Importar do Google Drive, na Galeria, copia as do Drive para cá.
          </p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 min-h-11 px-4 rounded border border-border-subtle text-sm text-text-secondary hover:text-text-primary">
          <ExternalLink className="w-4 h-4" aria-hidden="true" /> Ver o site
        </a>
      </div>

      <ErrorNote message={erro ?? (galeria.error ? (galeria.error as Error).message : null)} />
      {galeria.isLoading && <Loading />}

      <Panel title="1. Capa (carrossel)">
        <p className="text-sm text-text-secondary mb-4 max-w-2xl">
          As fotos se revezam a cada 3 segundos. A primeira é a que fica parada para quem desliga as animações no celular. Até {CAPAS_MAXIMO + 1}{" "}
          fotos: a principal e mais {CAPAS_MAXIMO} da galeria.
        </p>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Foto principal {temTopo ? "(1ª do carrossel)" : "(opcional)"}</h3>
            <p className="text-sm text-text-muted mb-3">Uma versão em pé para o celular e uma deitada para o computador.</p>
            <div className="grid grid-cols-2 gap-4 max-w-xl">
              <FotoDoTopoCampo tipo="mobile" rotulo="Celular" foto={topo.data?.mobile ?? null} onMudou={() => queryClient.invalidateQueries({ queryKey: ["site-topo"] })} />
              <FotoDoTopoCampo tipo="desktop" rotulo="Computador" foto={topo.data?.desktop ?? null} onMudou={() => queryClient.invalidateQueries({ queryKey: ["site-topo"] })} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Mais fotos da capa</h3>
            {capas.length === 0 ? (
              <p className="text-sm text-text-muted mb-3">Nenhuma ainda.</p>
            ) : (
              <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-3">
                {capas.map((f, i) => (
                  <li key={f.id} className="space-y-2">
                    <div className="relative aspect-[4/5] overflow-hidden rounded border border-border-subtle">
                      <Miniatura url={f.url} alt={f.alt || "Foto da capa"} />
                      <span className="absolute left-1.5 top-1.5 rounded bg-bg-primary/85 px-2 py-0.5 text-sm text-text-primary">{i + (temTopo ? 2 : 1)}ª</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Botao onClick={() => void gravar(moverNaCapa(noPainel, f.id, -1))} disabled={i === 0} rotulo="Passar para antes">
                        <ArrowUp className="w-4 h-4" aria-hidden="true" />
                      </Botao>
                      <Botao onClick={() => void gravar(moverNaCapa(noPainel, f.id, 1))} disabled={i === capas.length - 1} rotulo="Passar para depois">
                        <ArrowDown className="w-4 h-4" aria-hidden="true" />
                      </Botao>
                      <Botao onClick={() => void gravar(tirarDoLugar(noPainel, f.id))} perigo rotulo="Tirar da capa">
                        <X className="w-4 h-4" aria-hidden="true" />
                      </Botao>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <Botao onClick={() => setEscolha({ tipo: "capa" })} disabled={capas.length >= CAPAS_MAXIMO}>
              <ImagePlus className="w-4 h-4" aria-hidden="true" /> Adicionar foto da galeria
            </Botao>
          </div>
        </div>
      </Panel>

      <Panel title="2. Fotos de cada parte da página">
        <ul className="divide-y divide-border-subtle">
          {LUGARES_UNICOS.map((lugar) => {
            const atual = pagina[lugar];
            const marcada = atual ? lerLocal(noPainel.find((f) => f.id === atual.id)?.local ?? "").lugar === lugar : false;
            return (
              <li key={lugar} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-start">
                <div className="w-24 sm:w-28 shrink-0 aspect-[4/5] overflow-hidden rounded border border-border-subtle bg-bg-elevated">
                  {atual ? <Miniatura url={atual.url} alt={atual.alt} /> : <span className="flex h-full items-center justify-center text-sm text-text-muted text-center px-2">Sem foto</span>}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className="text-[15px] font-semibold text-text-primary">{NOME_DO_LUGAR[lugar]}</h3>
                  <p className="text-sm text-text-muted">{ONDE[lugar]}</p>
                  <p className="text-sm text-text-secondary">
                    {atual
                      ? marcada
                        ? atual.credito
                          ? `Foto: ${atual.credito}`
                          : "Sem crédito: preencha o fotógrafo na galeria, abaixo."
                        : "Escolhida sozinha (a primeira foto sem lugar). Escolha uma para fixar."
                      : "Vazio."}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Botao onClick={() => setEscolha({ tipo: "lugar", lugar })}>
                      <ImagePlus className="w-4 h-4" aria-hidden="true" /> {marcada ? "Trocar foto" : "Escolher foto"}
                    </Botao>
                    {marcada && atual && (
                      <Botao onClick={() => void gravar(tirarDoLugar(noPainel, atual.id))} perigo>
                        Tirar
                      </Botao>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="3. Detalhes do carro (faixa que passa devagar)">
        <p className="text-sm text-text-muted mb-3">Precisa de pelo menos 4 fotos marcadas; com menos, a página completa com fotos sem lugar.</p>
        {detalhesMarcados.length > 0 && (
          <ul className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2 mb-3">
            {detalhesMarcados.map((f) => (
              <li key={f.id} className="relative aspect-[2/3] overflow-hidden rounded border border-border-subtle">
                <Miniatura url={f.url} alt={f.alt || "Detalhe do carro"} />
                <button
                  type="button"
                  onClick={() => void gravar(tirarDoLugar(noPainel, f.id))}
                  aria-label="Tirar dos detalhes"
                  className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full bg-bg-primary/85 text-text-primary cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Botao onClick={() => setEscolha({ tipo: "detalhe" })}>
          <ImagePlus className="w-4 h-4" aria-hidden="true" /> Adicionar foto aos detalhes
        </Botao>
      </Panel>

      <Panel title="4. Textos e valores">
        <p className="text-sm text-text-secondary max-w-2xl">
          Os valores &ldquo;a partir de&rdquo;, o sinal, o prazo do saldo e a regra da chuva vêm de{" "}
          <Link href="/admin/regras" className="text-gold underline underline-offset-4">
            Margot e regras
          </Link>
          . Os textos da página são fixos e aprovados; para mudar algum, é só pedir.
        </p>
      </Panel>

      <NumeroReserva />

      <BloqueiosDeData />

      <Panel title={`5. Galeria (${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"})`}>
        <p className="text-sm text-text-secondary mb-3 max-w-2xl">
          Todas as fotos que o site pode usar. A descrição é lida em voz alta para quem não enxerga; o fotógrafo aparece como &ldquo;Foto: nome&rdquo; no
          site. O casal serve só para o site não repetir o mesmo casal em sequência.
        </p>
        <input ref={arquivo} type="file" accept="image/*" multiple className="hidden" onChange={enviarFotos} />
        <div className="flex flex-wrap gap-2">
          <Botao onClick={() => setDrive(true)}>
            <CloudDownload className="w-4 h-4" aria-hidden="true" /> Importar do Google Drive
          </Botao>
          <Botao onClick={() => arquivo.current?.click()} disabled={Boolean(enviando)}>
            <Upload className="w-4 h-4" aria-hidden="true" /> {enviando ?? "Enviar do aparelho (até 20 por vez)"}
          </Botao>
        </div>
        {fotos.length > 0 && (
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fotos.map((f) => (
              <CartaoDaGaleria key={`${f.id}-${f.location}-${f.alt}-${f.coupleTag}`} foto={f} onSalvar={(d) => salvarFoto(f.id, d)} onApagar={() => void apagarFoto(f.id)} />
            ))}
          </ul>
        )}
      </Panel>

      {drive && <ImportarDrive onFechar={() => setDrive(false)} onImportou={() => void atualizar()} />}
      {escolha && <Escolher fotos={fotos} titulo={tituloDaEscolha} onEscolher={escolher} onFechar={() => setEscolha(null)} />}
    </main>
  );
}
