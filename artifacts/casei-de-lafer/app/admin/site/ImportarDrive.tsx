"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CloudDownload, X } from "lucide-react";

interface Foto {
  id: string;
  nome: string;
  importada: boolean;
}
interface Pasta {
  id: string;
  nome: string;
  fotos: Foto[];
}
type Estado =
  | { pronto: false; motivo: string; email: string | null; pasta: string | null }
  | { pronto: true; email: string | null; pasta: string; nome: string; pastas: Pasta[] };

const campo = "w-full min-h-11 bg-bg-elevated border border-border-subtle text-text-primary placeholder:text-text-muted px-3 rounded text-[15px] focus:outline-none focus:border-gold/60";

// Janela "Importar do Google Drive" (Site → Galeria): mostra as pastas dos casais e copia as fotos escolhidas
// para a galeria, já com o casal (nome da pasta) e, se quiser, o fotógrafo. Regras em src/lib/google/drive.ts.
export default function ImportarDrive({ onFechar, onImportou }: { onFechar: () => void; onImportou: () => void }) {
  const queryClient = useQueryClient();
  const [link, setLink] = useState("");
  const [erroLink, setErroLink] = useState<string | null>(null);
  const [escolhidas, setEscolhidas] = useState<Set<string>>(new Set());
  const [credito, setCredito] = useState("");
  const [andamento, setAndamento] = useState<string | null>(null);
  const [falhas, setFalhas] = useState<string[]>([]);

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
    const erros: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      setAndamento(`Importando ${i + 1} de ${ids.length}…`);
      const r = await fetch("/api/admin/drive/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ids[i], credito }) }).catch(() => null);
      if (!r?.ok) erros.push((await r?.json().catch(() => null))?.erro ?? "Falha de rede.");
    }
    setAndamento(null);
    setFalhas(erros);
    setEscolhidas(new Set());
    await queryClient.invalidateQueries({ queryKey: ["site-drive"] });
    onImportou();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-bg-primary overflow-y-auto" role="dialog" aria-modal="true" aria-label="Importar do Google Drive">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-32">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="font-serif text-2xl text-text-primary">Importar do Google Drive</h2>
          <button type="button" onClick={onFechar} className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded border border-border-subtle text-sm text-text-secondary cursor-pointer">
            <X className="w-4 h-4" aria-hidden="true" /> Fechar
          </button>
        </div>
        <p className="text-sm text-text-muted mb-5 max-w-2xl">
          O site copia a foto do Drive para a galeria, numa versão de até 2.400 px (o tamanho que a página usa). A foto continua no Drive. O nome da pasta vira o
          casal; foto já importada aparece marcada.
        </p>

        {isLoading && <p className="text-sm text-text-muted">Lendo o Drive…</p>}

        {data && !data.pronto && (
          <div className="space-y-4 max-w-2xl">
            <p role="alert" className="text-sm text-warn bg-warn/10 border border-warn/30 rounded px-3 py-2">
              {data.motivo}
            </p>
            {data.email && (
              <p className="text-sm text-text-secondary">
                E-mail para compartilhar a pasta (como <b>Leitor</b>):{" "}
                <span className="select-all break-all font-medium text-text-primary">{data.email}</span>
              </p>
            )}
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
          <div className="space-y-8">
            <p className="text-sm text-text-secondary">
              Pasta: <b className="text-text-primary">{data.nome}</b>
            </p>
            {data.pastas.length === 0 && <p className="text-sm text-text-muted">Nenhuma foto nesta pasta nem nas subpastas.</p>}
            {data.pastas.map((p) => {
              const novas = p.fotos.filter((f) => !f.importada);
              const todas = novas.length > 0 && novas.every((f) => escolhidas.has(f.id));
              return (
                <section key={p.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="font-serif text-xl text-text-primary">
                      {p.nome} <span className="text-sm text-text-muted font-sans">({p.fotos.length})</span>
                    </h3>
                    {novas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setEscolhidas((s) => { const n = new Set(s); for (const f of novas) { if (todas) n.delete(f.id); else n.add(f.id); } return n; })}
                        className="min-h-11 px-3 rounded border border-border-subtle text-sm text-text-secondary cursor-pointer"
                      >
                        {todas ? "Desmarcar todas" : "Marcar todas"}
                      </button>
                    )}
                  </div>
                  <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {p.fotos.map((f) => {
                      const on = escolhidas.has(f.id);
                      return (
                        <li key={f.id}>
                          <button
                            type="button"
                            disabled={f.importada}
                            onClick={() => alternar(f.id)}
                            aria-pressed={on}
                            aria-label={`${f.nome}${f.importada ? " (já importada)" : ""}`}
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
                </section>
              );
            })}
          </div>
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
          <div className="max-w-5xl mx-auto flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[12rem] text-sm text-text-secondary">
              Fotógrafo destas fotos (opcional)
              <input className={`${campo} mt-1`} value={credito} maxLength={60} onChange={(e) => setCredito(e.target.value)} placeholder="Nome ou @" />
            </label>
            <button
              type="button"
              onClick={importar}
              disabled={escolhidas.size === 0 || Boolean(andamento)}
              className="inline-flex items-center gap-2 min-h-11 px-5 rounded bg-gold text-bg-primary font-semibold text-sm cursor-pointer disabled:opacity-40"
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
