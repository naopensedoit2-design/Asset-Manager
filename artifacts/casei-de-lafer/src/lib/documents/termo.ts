// Termo Simplificado de Prestação de Serviço, no mesmo texto dos termos que o Leonardo já usa.
// Página A4 clara (economiza tinta e lê como contrato), com toques dourados.

import { dateLong, durationLabel, esc, money, placeLabel, type DocData } from "./data";
import { DOC_FONTS, screenChrome } from "./proposal";

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width:210mm; background:#fff; color:#2a2620; font-family:'Inter',sans-serif; }
.page { width:210mm; min-height:297mm; padding:16mm 18mm 14mm; background:#fffdf8; position:relative; }
.top { text-align:center; }
.eyebrow { font-size:7.4pt; letter-spacing:3px; text-transform:uppercase; color:#9a7d3e; font-weight:600; }
.brand { margin-top:2.5mm; font-family:'Cormorant Garamond',serif; font-size:24pt; font-weight:600; color:#1d1a15; }
.doc-title { margin-top:1mm; font-family:'Cormorant Garamond',serif; font-style:italic; font-size:13pt; color:#6b5a30; }
.facts { margin-top:8mm; display:grid; grid-template-columns: 1fr 1fr 1fr 1.6fr; border-top:1px solid #d9c9a3; border-bottom:1px solid #d9c9a3; }
.facts > div { padding:3.2mm 3mm; }
.facts > div + div { border-left:1px solid #eadfc6; }
.label { font-size:6.8pt; letter-spacing:2px; text-transform:uppercase; color:#9a7d3e; font-weight:600; }
.value { margin-top:1.2mm; font-family:'Cormorant Garamond',serif; font-size:13pt; font-weight:600; color:#1d1a15; line-height:1.2; }
h2 { margin-top:7mm; font-size:7.6pt; letter-spacing:2.6px; text-transform:uppercase; color:#9a7d3e; font-weight:600; }
p, li { font-size:9.2pt; line-height:1.6; color:#3a342b; }
h2 + p, h2 + .parties { margin-top:2mm; }
.parties { display:grid; grid-template-columns:1fr 1fr; gap:6mm; }
.party b { display:block; font-size:7pt; letter-spacing:2px; text-transform:uppercase; color:#6b5a30; margin-bottom:1mm; }
.party .name { font-family:'Cormorant Garamond',serif; font-size:13pt; font-weight:600; color:#1d1a15; }
.missing { color:#b45309; background:#fff3d6; padding:0 1mm; }
.pay { margin-top:2mm; display:flex; gap:4mm; flex-wrap:wrap; }
.pay > div { flex:1 1 0; border:1px solid #eadfc6; padding:2.6mm 3mm; background:#fff; }
.pay .value { font-size:14pt; }
.pix { margin-top:2.5mm; font-size:9pt; }
.pix span { font-weight:600; letter-spacing:.5px; }
.accept { margin-top:8mm; padding:3.5mm 4mm; border-left:2px solid #c9a25e; background:#faf4e6; font-size:9pt; }
.forum { margin-top:5mm; text-align:center; font-size:7.8pt; color:#7a7060; }
.foot { margin-top:6mm; text-align:center; font-size:7pt; letter-spacing:2.4px; text-transform:uppercase; color:#b0a181; }
`;

const missing = (label: string) => `<span class="missing">${label}</span>`;

export function termoReady(d: Pick<DocData, "legalName" | "document" | "address">) {
  return Boolean(d.legalName.trim() && d.document.trim() && d.address.trim());
}

export function renderTermo(d: DocData): string {
  const wedding = d.kind === "casamento";
  const dep = d.settings.depositPercent;
  const balance = d.totalCents - d.depositCents;
  const days = d.settings.balanceDaysBefore === 1 ? "1 dia" : `${d.settings.balanceDaysBefore} dias`;
  const hasExit = d.items.some((i) => /sa[íi]da/i.test(i.name));
  const chrome = screenChrome("#e9e4da", "Salvar em PDF");
  const contratante = d.legalName.trim() || d.names;

  const service = wedding
    ? `Entrega da noiva com o veículo clássico MP Lafer 1980, realizada pelo projeto Eu Casei de Lafer, com motorista trajado a rigor${
        hasExit ? ", incluindo a saída dos noivos com um segundo deslocamento no mesmo local" : ""
      }.`
    : `Aluguel do veículo clássico MP Lafer 1980 para ensaio fotográfico, realizado pelo projeto Eu Casei de Lafer, com livre movimentação entre pontos próximos dentro do local combinado (${esc(
        placeLabel(d),
      )}).`;

  const care = wedding
    ? `O serviço é realizado com veículo clássico, sujeito a cuidados especiais e a eventuais imprevistos técnicos ou condições alheias ao controle do contratado. Em caso de chuva, a capota é colocada com antecedência. Caso ocorra qualquer situação extraordinária, as partes buscarão uma solução de boa-fé.`
    : `O serviço é realizado com veículo clássico conversível, um bem histórico que exige cuidado e atenção especial. Pedimos que durante o ensaio seja evitado apoiar objetos, alimentos ou bebidas sobre o veículo, preservando sua conservação. Eventuais danos causados durante a sessão serão de responsabilidade do contratante. Condições climáticas adversas, como chuva ou tempestade, podem inviabilizar o ensaio; nesse caso, as partes combinarão de boa-fé uma nova data, sujeita à disponibilidade do contratado, em até 60 dias a partir da data original, sem custo adicional.`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Termo — ${esc(contratante)} · Eu Casei de Lafer</title>${DOC_FONTS}
<style>${CSS}${chrome.css}</style></head><body>
<div class="page">
  <div class="top">
    <div class="eyebrow">MP Lafer · Experiência para casamentos</div>
    <div class="brand">Eu Casei de Lafer</div>
    <div class="doc-title">Termo Simplificado de Prestação de Serviço</div>
  </div>

  <div class="facts">
    <div><div class="label">Data</div><div class="value">${d.eventDate ? dateLong(d.eventDate) : missing("a definir")}</div></div>
    <div><div class="label">Horário</div><div class="value">${d.eventTime ? esc(d.eventTime.replace(":", "h")) : "A combinar"}</div></div>
    <div><div class="label">Duração</div><div class="value">${esc(durationLabel(d).replace(/ no local$/i, ""))}</div></div>
    <div><div class="label">Local</div><div class="value">${esc(placeLabel(d))}</div></div>
  </div>

  <h2>Partes</h2>
  <div class="parties">
    <div class="party"><b>Contratante</b>
      <div class="name">${esc(contratante)}</div>
      <p>${d.document.trim() ? `CPF/Documento ${esc(d.document)}` : missing("CPF ou passaporte")}</p>
      <p>${d.address.trim() ? esc(d.address) : missing("endereço")}</p>
    </div>
    <div class="party"><b>Contratado</b>
      <div class="name">${esc(d.settings.contractorName || "Leonardo")}</div>
      <p>${d.settings.contractorDocument.trim() ? `CPF ${esc(d.settings.contractorDocument)}` : missing("CPF do contratado (Regras)")}</p>
      <p>Responsável pelo projeto Eu Casei de Lafer</p>
    </div>
  </div>

  <h2>Serviço</h2>
  <p>${service}${d.items.length ? ` Itens contratados: ${d.items.map((i) => esc(i.name)).join(" + ")}.` : ""}</p>

  <h2>Pagamento</h2>
  <div class="pay">
    <div><div class="label">Valor total</div><div class="value">${money(d.totalCents)}</div></div>
    <div><div class="label">Sinal (${dep}%)</div><div class="value">${money(d.depositCents)}</div></div>
    <div><div class="label">Restante (${100 - dep}%)</div><div class="value">${money(balance)}</div></div>
  </div>
  <p class="pix">Sinal para reserva da data; restante até ${days} antes do evento. PIX: ${
    d.settings.pixKey.trim() ? `<span>${esc(d.settings.pixKey)}</span>` : missing("chave Pix (Regras)")
  }</p>

  <h2>Cancelamento</h2>
  <p>Em caso de cancelamento por parte do contratante, o valor pago como sinal não será reembolsável, por se tratar de reserva de data.</p>

  <h2>Veículo histórico${wedding ? " e imprevistos" : " e condições climáticas"}</h2>
  <p>${care}</p>

  <div class="accept">O pagamento do sinal implica ciência e aceite integral dos termos acima, dispensando assinatura física.</div>
  <div class="forum">Foro eleito: ${esc(d.settings.forum || "a definir")}, para dirimir quaisquer questões decorrentes deste termo.</div>
  <div class="foot">Eu Casei de Lafer · eucaseidelafer.vercel.app</div>
</div>
${chrome.html}
</body></html>`;
}
