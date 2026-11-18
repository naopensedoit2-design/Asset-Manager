"use client";

import { useId, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, CloudDownload, Copy, X } from "lucide-react";
import { creditoLimpo } from "@/lib/landing/curadoria";

interface Foto {
  id: string;
  nome: string;
  importada: boolean;
}
interface Pasta {
  id: string;
  nome: string;
  compartilhada: boolean;
  credito: string;
  fotos: Foto[];
}
type Estado =
  | { pronto: false; motivo: string; email: string | null; pasta: string | null }
  | { pronto: true; email: string | null; pasta: string; nome: string; pastas: Pasta[]; fotografos: string[] };

const campo = "w-full min-h-11 bg-bg-elevated border border-border-subtle text-text-primary placeholder:text-text-muted px-3 rounded text-[15px] focus:outline-none focus:border-gold/60";

// Janela "Importar do Google Drive" (Site → Galeria): mostra as pastas dos casais e copia as fotos escolhidas
// para a galeria, já com o casal (nome da pasta) e o fotógrafo de cada pasta. O fotógrafo vem sugerido:
// o que já foi usado naquele casal, ou um dos que já estão na galeria (src/lib/landing/fotografos.ts).
export default function ImportarDrive({ onFechar, onImportou }: { onFechar: () => void; onImportou: () => void }) {
  const queryClient = useQueryClient();
  const [link, setLink] = useState("");
  const [erroLink, setErroLink] = useState<string | null>(null);
  const [escolhidas, setEscolhidas] = useState<Set<string>>(new Set());
  /** Fotógrafo de cada pasta, quando o dono mudou a sugestão. */
  const [creditos, setCreditos] = useState<Record<string, string>>({});
  const [soNovas, setSoNovas] = useState(false);
  const [andamento, setAndamento] = useState<string | null>(null);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [feitas, setFeitas] = useState(0);

  const { data, isLoading } = useQuery<Estado>({
    queryKey: ["site-drive"],
    queryFn: () => fetch("/api/admin/drive").then((r) => r.json()),
  });

  async function salvarPasta() {
    setErroLink(null);
    const r = await fetch("/api/admin/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pasta: link }) });
    const json = await r.json().catch(() => null);
    if (!r.ok) return setErroLink(json?.erro ?? "Não consegui salvar a pasta.");
    queryClient.setQueryData(["site-drive"], json);
  }

  const pastas = data?.pronto ? data.pastas : [];
  const fotografos = data?.pronto ? data.fotografos : [];
  const creditoDa = (p: Pasta) => creditos[p.id] ?? p.credito;
  const pastaDaFoto = useMemo(() => new Map(pastas.flatMap((p) => p.fotos.map((f) => [f.id, p] as const))), [pastas]);
  const pastasEscolhidas = new Set([...escolhidas].map((id) => pastaDaFoto.get(id)?.id));

  const alternar = (id: string) =>
    setEscolhidas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function importar() {
    const ids = [...escolhidas];
    setFalhas([]);
    setFeitas(0);
    const erros: string[] = [];
    let certas = 0;
    for (let i = 0; i < ids.length; i++) {
      setAndamento(`Importando ${i + 1} de ${ids.length}…`);
      const p = pastaDaFoto.get(ids[i]!);
      const credito = p ? creditoDa(p) : "";
      const r = await fetch("/api/admin/drive/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ids[i], credito }) }).catch(() => null);
      if (r?.ok) certas++;
      else erros.push((await r?.json().catch(() => null))?.erro ?? "Falha de rede.");
    }
    setAndamento(null);
    setFalhas(erros);
    setFeitas(certas);
    setEscolhidas(new Set());
    await queryClient.invalidateQueries({ queryKey: ["site-drive"] });
    onImportou();
  }

  const minhas = pastas.filter((p) => !p.compartilhada);
  const deOutros = pastas.filter((p) => p.compartilhada);

  const secao = (p: Pasta) => {
    const novas = p.fotos.filter((f) => !f.importada);
    const visiveis = soNovas ? novas : p.fotos;
    if (visiveis.length === 0) return null;
    const todas = novas.length > 0 && novas.every((f) => escolhidas.has(f.id));
    const marcadas = p.fotos.filter((f) => escolhidas.has(f.id)).length;
    return (
      <details key={p.id} open={novas.length > 0} className="group border-b border-border-subtle pb-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block font-serif text-xl text-text-primary truncate">{p.nome}</span>
            <span className="block text-sm text-text-muted">
              {p.fotos.length} {p.fotos.length === 1 ? "foto" : "fotos"} · {p.fotos.length - novas.length} na galeria
              {marcadas > 0 && <b className="text-gold font-semibold"> · {marcadas} marcada{marcadas > 1 ? "s" : ""}</b>}
            </span>
          </span>
          <ChevronDown className="w-5 h-5 shrink-0 text-text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>

        <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-end">
          <Fotografo valor={creditoDa(p)} sugeridos={fotografos} onMudar={(v) => setCreditos((c) => ({ ...c, [p.id]: v }))} rotulo={`Fotógrafo de ${p.nome}`} />
          {novas.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setEscolhidas((s) => {
                  const n = new Set(s);
                  for (const f of novas) {
                    if (todas) n.delete(f.id);
                    else n.add(f.id);
                  }
                  return n;
                })
              }
              className="min-h-11 shrink-0 px-4 rounded border border-border-subtle text-sm text-text-secondary cursor-pointer"
            >
              {todas ? "Desmarcar todas" : `Marcar as ${novas.length} novas`}
            </button>
          )}
        </div>

        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2">
          {visiveis.map((f) => {
            const on = escolhidas.has(f.id);
            return (
              <li key={f.id}>
                <button
                  type="button"
                  disabled={f.importada}
                  onClick={() => alternar(f.id)}
                  aria-pressed={on}
                  aria-label={`${f.nome}${f.importada ? " (já na galeria)" : ""}`}
                  className={`relative block w-full aspect-square overflow-hidden rounded border-2 cursor-pointer disabled:cursor-default ${on ? "border-gold" : "border-transparent"}`}
                >
                  <img src={`/api/admin/drive/miniatura/${encodeURIComponent(f.id)}`} alt="" loading="lazy" className={`w-full h-full object-cover ${f.importada ? "opacity-40" : ""}`} />
                  {(on || f.importada) && (
                    <span className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-gold text-bg-primary">
                      <Check className="w-4 h-4" aria-hidden="true" />
                    </span>
                  )}
                  {f.importada && <span className="absolute inset-x-0 bottom-0 bg-bg-primary/85 text-sm text-text-primary py-0.5">Na galeria</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-bg-primary overflow-y-auto" role="dialog" aria-modal="true" aria-label="Importar do Google Drive">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-40">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="font-serif text-2xl text-text-primary">Importar do Google Drive</h2>
          <button type="button" onClick={onFechar} className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded border border-border-subtle text-sm text-text-secondary cursor-pointer">
            <X className="w-4 h-4" aria-hidden="true" /> Fechar
          </button>
        </div>
        <p className="text-sm text-text-muted mb-5 max-w-2xl">
          O site copia a foto do Drive para a galeria, numa versão de até 2.400 px (o tamanho que a página usa). A foto continua no Drive. O nome da pasta vira o
          casal; o fotógrafo vem sugerido pelo que você já usou.
        </p>

        {isLoading && <p className="text-sm text-text-muted">Lendo o Drive…</p>}

        {data && !data.pronto && (
          <div className="space-y-4 max-w-2xl">
            <p role="alert" className="text-sm text-warn bg-warn/10 border border-warn/30 rounded px-3 py-2">
              {data.motivo}
            </p>
            {data.email && <EmailDoSite email={data.email} />}
            <label className="block text-sm text-text-secondary">
              Link da pasta do Drive
              <span className="flex flex-wrap gap-2 mt-1">
                <input className={`${campo} flex-1 min-w-0`} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" />
                <button type="button" onClick={salvarPasta} disabled={!link.trim()} className="min-h-11 px-5 rounded bg-gold text-bg-primary font-semibold text-sm cursor-pointer disabled:opacity-40">
                  Salvar
                </button>
              </span>
            </label>
            {erroLink && <p className="text-sm text-bad">{erroLink}</p>}
          </div>
        )}

        {data?.pronto && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <p className="text-sm text-text-secondary">
                Pasta: <b className="text-text-primary">{data.nome}</b>
              </p>
              <button
                type="button"
                aria-pressed={soNovas}
                onClick={() => setSoNovas((v) => !v)}
                className={`min-h-11 px-4 rounded border text-sm cursor-pointer ${soNovas ? "border-gold text-gold bg-gold/10" : "border-border-subtle text-text-secondary"}`}
              >
                {soNovas ? "Mostrando só as que faltam" : "Esconder as que já estão na galeria"}
              </button>
            </div>
            {feitas > 0 && (
              <p role="status" className="text-sm text-ok bg-ok/10 border border-ok/30 rounded px-3 py-2 mb-2">
                {feitas} {feitas === 1 ? "foto foi para" : "fotos foram para"} a galeria. Escolha o lugar de cada uma em Site.
              </p>
            )}
            {pastas.length === 0 && <p className="text-sm text-text-muted">Nenhuma foto nesta pasta nem nas subpastas.</p>}
            <div>{minhas.map(secao)}</div>
            {deOutros.length > 0 && (
              <>
                <h3 className="mt-8 text-sm uppercase tracking-wider text-text-muted">Compartilhadas direto com o site</h3>
                <div>{deOutros.map(secao)}</div>
              </>
            )}
            {data.email && (
              <div className="mt-8 max-w-2xl">
                <EmailDoSite email={data.email} />
                <p className="text-sm text-text-muted mt-1">
                  Um fotógrafo pode compartilhar a pasta dele com este e-mail (como Leitor): ela aparece aqui, em &quot;Compartilhadas direto com o site&quot;.
                </p>
              </div>
            )}
          </>
        )}

        {falhas.length > 0 && (
          <ul role="alert" className="mt-6 text-sm text-bad space-y-1">
            {falhas.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        )}
      </div>

      {data?.pronto && (
        <div className="fixed inset-x-0 bottom-0 bg-bg-card border-t border-border-subtle px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="max-w-5xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-secondary" aria-live="polite">
              {escolhidas.size
                ? `${escolhidas.size} ${escolhidas.size === 1 ? "foto marcada" : "fotos marcadas"}${pastasEscolhidas.size > 1 ? ` em ${pastasEscolhidas.size} pastas` : ""}`
                : "Toque nas fotos para marcar."}
            </p>
            <button
              type="button"
              onClick={importar}
              disabled={escolhidas.size === 0 || Boolean(andamento)}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded bg-gold text-bg-primary font-semibold text-sm cursor-pointer disabled:opacity-40"
            >
              <CloudDownload className="w-4 h-4" aria-hidden="true" />
              {andamento ?? (escolhidas.size ? `Importar ${escolhidas.size} ${escolhidas.size === 1 ? "foto" : "fotos"}` : "Escolha as fotos")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailDoSite({ email }: { email: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <p className="text-sm text-text-secondary flex flex-wrap items-center gap-2">
      <span>
        E-mail do site no Drive: <span className="select-all break-all font-medium text-text-primary">{email}</span>
      </span>
      <button
        type="button"
        onClick={() => void navigator.clipboard?.writeText(email).then(() => setCopiado(true))}
        className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded border border-border-subtle text-sm text-text-secondary cursor-pointer"
      >
        <Copy className="w-4 h-4" aria-hidden="true" /> {copiado ? "Copiado" : "Copiar"}
      </button>
    </p>
  );
}

/** Campo do fotógrafo com os já usados em botões (o primeiro toque resolve) e na lista do teclado. */
export function Fotografo({ valor, sugeridos, onMudar, rotulo }: { valor: string; sugeridos: string[]; onMudar: (v: string) => void; rotulo: string }) {
  const id = useId();
  const comoSai = creditoLimpo(valor);
  const outros = sugeridos.filter((s) => s.toLowerCase() !== comoSai.toLowerCase()).slice(0, 6);
  return (
    <div className="flex-1 min-w-0">
      <label htmlFor={id} className="block text-sm text-text-secondary">
        Fotógrafo <span className="text-text-muted">(opcional, sai como &quot;Foto: …&quot;)</span>
      </label>
      <span className="flex gap-2 mt-1">
        <input id={id} list={`${id}-lista`} className={`${campo} flex-1 min-w-0`} value={valor} maxLength={80} onChange={(e) => onMudar(e.target.value)} placeholder="Nome, @ ou link do Instagram" aria-label={rotulo} />
        {valor && (
          <button type="button" onClick={() => onMudar("")} className="grid min-h-11 min-w-11 place-items-center rounded border border-border-subtle text-text-muted cursor-pointer" aria-label="Limpar fotógrafo">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </span>
      <datalist id={`${id}-lista`}>
        {sugeridos.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {valor && comoSai !== valor.trim() && <p className="text-sm text-text-muted mt-1">Vai sair como: {comoSai || "(sem crédito)"}</p>}
      {outros.length > 0 && (
        <span className="flex gap-2 mt-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {outros.map((s) => (
            <button key={s} type="button" onClick={() => onMudar(s)} className="shrink-0 min-h-11 px-3 rounded-full border border-border-subtle bg-bg-elevated text-sm text-text-secondary cursor-pointer hover:border-gold/60">
              {s}
            </button>
          ))}
        </span>
      )}
    </div>
  );
}
