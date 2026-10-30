"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ErrorNote } from "@/components/gestor/ui";
import type { Settings } from "@/lib/gestor/rules";
import Sheet from "./Sheet";
import Switch from "./Switch";

export const REGRAS_KEY = ["gestor-regras"];

/** Estado da Margot lido das regras: usado no topo do painel e na folha de pausar/retomar. */
export function useMargotSettings() {
  return useQuery<Settings>({ queryKey: REGRAS_KEY, queryFn: () => api("/api/admin/gestor/regras"), staleTime: 30_000 });
}

/** Liga ou pausa a Margot (WhatsApp e/ou chat do site) com um toque. */
export function useMargotToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { margotWhatsapp?: boolean; margotSite?: boolean }) => api<Settings>("/api/admin/gestor/regras", { method: "PUT", body: patch }),
    onSuccess: (data) => {
      qc.setQueryData(REGRAS_KEY, data);
      qc.invalidateQueries({ queryKey: ["hoje"] });
    },
  });
}

export default function MargotSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: settings } = useMargotSettings();
  const toggle = useMargotToggle();
  const whatsapp = settings?.margotWhatsapp ?? true;
  const site = settings?.margotSite ?? true;

  return (
    <Sheet open={open} onClose={onClose} title="Margot">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          {whatsapp ? "Atendendo clientes no WhatsApp. Você só entra nas exceções." : "Pausada no WhatsApp: as mensagens dos clientes chegam só para você."}
        </p>

        <div className="rounded-lg border border-border-subtle bg-bg-card divide-y divide-border-subtle">
          <Row
            title="No WhatsApp"
            hint="Responde clientes, monta orçamentos e avisa você"
            checked={whatsapp}
            busy={toggle.isPending}
            disabled={!settings}
            onChange={(v) => toggle.mutate({ margotWhatsapp: v })}
          />
          <Row
            title="No chat do site"
            hint="Responde quem pede orçamento pelo site"
            checked={site}
            busy={toggle.isPending}
            disabled={!settings}
            onChange={(v) => toggle.mutate({ margotSite: v })}
          />
        </div>

        <ErrorNote message={toggle.error ? (toggle.error as Error).message : null} />

        <p className="text-xs text-text-muted">
          Pausar não apaga nada: as conversas continuam chegando em Conversas, só sem resposta automática. Você também pode mandar
          &ldquo;pausar Margot&rdquo; ou &ldquo;retomar Margot&rdquo; pelo seu WhatsApp.
        </p>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/admin/conexoes" onClick={onClose} className="text-gold underline underline-offset-4">
            Ver as conexões
          </Link>
          <Link href="/admin/regras" onClick={onClose} className="text-gold underline underline-offset-4">
            Regras da Margot
          </Link>
        </div>
      </div>
    </Sheet>
  );
}

function Row({
  title,
  hint,
  checked,
  busy,
  disabled,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  busy: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">{title}</p>
        <p className="text-xs text-text-muted">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={`${title}: ${checked ? "ligada" : "pausada"}`} disabled={busy || disabled} />
    </div>
  );
}
