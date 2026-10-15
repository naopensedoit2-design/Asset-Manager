// Proposta comercial no mesmo visual do PDF aprovado (skill "eu-casei-de-lafer-orcamento"):
// 5 páginas A4, fundo escuro, dourado, Cormorant Garamond + Inter, galeria de inspiração.

import { dateLong, durationLabel, esc, instantLong, money, ogTags, placeLabel, type DocData } from "./data";

export const DOC_FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">';

/** Na tela: páginas centralizadas e reduzidas no celular, com botão para salvar em PDF. Na impressão: A4 puro. */
export function screenChrome(bg: string, buttonLabel: string) {
  return {
    css: `
@media screen {
  html, body { width:auto !important; height:auto !important; background:${bg} !important; }
  body { padding: 16px 0 96px; }
  .page { margin: 0 auto 16px; box-shadow: 0 8px 40px rgba(0,0,0,.35); }
  .doc-actions { position:fixed; left:0; right:0; bottom:0; display:flex; justify-content:center; padding:14px 16px calc(14px + env(safe-area-inset-bottom)); background:linear-gradient(180deg,transparent,rgba(0,0,0,.65)); }
  .doc-actions button { font-family:'Inter',sans-serif; font-weight:600; font-size:15px; background:#c9a25e; color:#0f0e0c; border:0; border-radius:6px; padding:14px 26px; cursor:pointer; box-shadow:0 6px 24px rgba(0,0,0,.4); }
}
@media print { .doc-actions { display:none !important; } }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`,
    html: `<div class="doc-actions"><button type="button" onclick="window.print()">${buttonLabel}</button></div>
<script>
(function(){
  function fit(){ var w = document.documentElement.clientWidth; var z = Math.min(1, (w - 16) / 794); document.body.style.zoom = z; }
  fit(); window.addEventListener('resize', fit);
  window.addEventListener('beforeprint', function(){ document.body.style.zoom = 1; });
  window.addEventListener('afterprint', fit);
})();
</script>`,
  };
}

const CSS = `
@page { size: A4; margin: 0; background: #0f0e0c; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background:#0f0e0c; width:210mm; color:#efe9df; font-family:'Inter',sans-serif; }
.page { width:210mm; height:297mm; position:relative; overflow:hidden; background:#0f0e0c; page-break-after:always; break-after:page; }
.page:last-of-type { page-break-after: avoid; break-after: auto; }
.corner { position:absolute; width:34mm; height:34mm; border:1px solid #7a6535; opacity:.55; }
.corner-tl{top:8mm;left:8mm;border-right:none;border-bottom:none;}
.corner-tr{top:8mm;right:8mm;border-left:none;border-bottom:none;}
.corner-bl{bottom:8mm;left:8mm;border-right:none;border-top:none;}
.corner-br{bottom:8mm;right:8mm;border-left:none;border-top:none;}
.divider{display:flex;align-items:center;justify-content:center;gap:3mm;margin:0 auto;}
.divider .line{width:22mm;height:1px;background:linear-gradient(90deg,transparent,#7a6535);}
.divider .line.right{background:linear-gradient(90deg,#7a6535,transparent);}
.divider .diamond{width:2.2mm;height:2.2mm;background:#c9a25e;transform:rotate(45deg);}
.eyebrow{font-size:8.3pt;letter-spacing:3.2px;color:#b79a5f;text-transform:uppercase;font-weight:500;text-align:center;}
.p1-content{position:relative;z-index:2;padding:26mm 22mm 0 22mm;text-align:center;}
.brand-name{font-family:'Cormorant Garamond',serif;font-size:25pt;font-weight:500;letter-spacing:2px;color:#f2ead9;}
.brand-tagline{margin-top:3mm;font-size:7.3pt;letter-spacing:2.6px;color:#8a7748;text-transform:uppercase;}
.orc-title{margin-top:13mm;font-family:'Cormorant Garamond',serif;font-size:15pt;letter-spacing:6px;color:#c9a25e;text-transform:uppercase;font-weight:500;}
.meta-block{margin-top:6mm;font-size:10pt;line-height:1.9;color:#cfc4a9;}
.meta-block b{color:#efe9df;font-weight:600;}
.divider.mid{margin-top:9mm;margin-bottom:9mm;}
.proposta-title{margin-top:4mm;font-family:'Cormorant Garamond',serif;font-size:34pt;font-weight:600;color:#f5efe1;}
.proposta-subtitle{margin-top:2mm;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14pt;color:#d9c48f;}
.intro-text{margin:8mm auto 0 auto;max-width:132mm;font-size:9.8pt;line-height:1.75;color:#c9c0ac;}
.details-grid{margin:11mm auto 0 auto;max-width:150mm;display:flex;flex-wrap:wrap;row-gap:7mm;column-gap:6mm;text-align:left;}
.details-grid > div{width:calc(50% - 3mm);}
.details-grid .full{width:100%;}
.detail-label{font-size:7.6pt;letter-spacing:2.6px;color:#8a7748;text-transform:uppercase;font-weight:500;}
.detail-value{margin-top:1.6mm;font-family:'Cormorant Garamond',serif;font-size:13.5pt;color:#f0e9d8;font-weight:500;}
.gal-content{position:relative;z-index:2;padding:20mm 22mm 0 22mm;text-align:center;}
.gal-title{margin-top:4mm;font-family:'Cormorant Garamond',serif;font-size:25pt;font-weight:600;color:#f5efe1;}
.gal-subtitle{margin-top:2mm;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:12pt;color:#d9c48f;}
.gal-frame{display:block;border:1px solid #3a331f;}
.gal1-hero{width:166mm;height:72mm;object-fit:cover;object-position:center 42%;margin:10mm auto 8mm auto;}
.gal1-row{display:flex;gap:6mm;width:166mm;margin:0 auto;}
.gal1-left{width:57mm;height:112mm;object-fit:cover;object-position:center 22%;}
.gal1-right{width:103mm;height:112mm;object-fit:cover;object-position:center 40%;}
.gal2-hero{width:166mm;height:82mm;object-fit:cover;object-position:center 68%;margin:10mm auto 8mm auto;}
.gal2-row{display:flex;align-items:center;gap:8mm;width:166mm;margin:0 auto;text-align:left;}
.gal2-quote{width:108mm;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:15pt;line-height:1.6;color:#d9c48f;}
.gal2-quote::before{content:'';display:block;width:10mm;height:1px;background:#7a6535;margin-bottom:5mm;}
.gal2-image{width:50mm;height:88mm;object-fit:cover;object-position:center top;flex:0 0 auto;}
.gal-caption{margin-top:10mm;font-size:8pt;font-style:italic;color:#746a52;line-height:1.6;}
.p2-content{position:relative;z-index:2;padding:24mm 24mm 0 24mm;}
.section-title{font-family:'Cormorant Garamond',serif;font-size:17pt;letter-spacing:1px;color:#f0e9d8;text-align:center;font-weight:600;}
.includes-list{margin-top:9mm;}
.include-item{display:flex;gap:5mm;padding:4.6mm 0;border-bottom:1px solid #2a2620;}
.include-item:first-child{padding-top:0;}
.include-mark{flex:0 0 auto;width:2.6mm;height:2.6mm;margin-top:1.8mm;background:#c9a25e;transform:rotate(45deg);}
.include-heading{font-family:'Cormorant Garamond',serif;font-size:12.5pt;font-weight:600;color:#f0e9d8;}
.include-desc{margin-top:.8mm;font-size:8.8pt;line-height:1.55;color:#b6ac97;}
.obs-block{margin-top:8mm;}
.obs-title{font-size:8pt;letter-spacing:2px;color:#8a7748;text-transform:uppercase;font-weight:500;margin-bottom:3mm;}
.obs-block ul{list-style:none;}
.obs-block li{position:relative;padding-left:4.5mm;font-size:8.6pt;line-height:1.6;color:#a89e89;margin-bottom:2.4mm;}
.obs-block li::before{content:'';position:absolute;left:0;top:2mm;width:1.6mm;height:1.6mm;background:#6b5a30;transform:rotate(45deg);}
.invest-box{margin-top:10mm;padding:8mm 10mm;border:1px solid #493d21;background:linear-gradient(180deg,rgba(201,162,94,.07),rgba(201,162,94,.015));text-align:center;}
.invest-eyebrow{font-size:8pt;letter-spacing:3px;color:#b79a5f;text-transform:uppercase;font-weight:500;}
.invest-items{margin-top:2.5mm;font-size:8.6pt;color:#a89e89;}
.invest-value{margin-top:2mm;font-family:'Cormorant Garamond',serif;font-size:30pt;font-weight:600;color:#e9d8ac;}
.invest-note{margin-top:3mm;font-size:8.6pt;color:#b6ac97;line-height:1.6;}
.validity-text{margin-top:7mm;text-align:center;font-size:8pt;font-style:italic;color:#746a52;}
.p3-content{position:relative;z-index:2;padding:22mm 26mm 0 26mm;text-align:center;}
.p3-content .brand-name{font-size:22pt;}
.p3-content .divider{margin:8mm auto;}
.steps-list{margin:11mm auto 0 auto;max-width:142mm;text-align:left;}
.step-item{display:flex;gap:6mm;align-items:flex-start;padding:5.5mm 0;border-bottom:1px solid #2a2620;}
.step-item:last-child{border-bottom:none;}
.step-num{flex:0 0 auto;width:9mm;height:9mm;margin-top:.5mm;border:1px solid #7a6535;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:12pt;font-weight:600;color:#e3cf9c;}
.step-heading{font-family:'Cormorant Garamond',serif;font-size:12.5pt;font-weight:600;color:#f0e9d8;}
.step-desc{margin-top:.8mm;font-size:8.8pt;line-height:1.55;color:#b6ac97;}
.closing-block{margin-top:14mm;text-align:center;}
.closing-text{margin-top:4mm;font-size:11pt;line-height:1.9;color:#cfc4a9;font-family:'Cormorant Garamond',serif;font-style:italic;}
.closing-whats{margin-top:6mm;font-size:8pt;letter-spacing:2px;color:#8a7748;text-transform:uppercase;}
`;

const corners =
  '<div class="corner corner-tl"></div><div class="corner corner-tr"></div><div class="corner corner-bl"></div><div class="corner corner-br"></div>';
const divider = '<div class="line"></div><div class="diamond"></div><div class="line right"></div>';

function include(heading: string, desc: string) {
  return `<div class="include-item"><div class="include-mark"></div><div><div class="include-heading">${heading}</div><div class="include-desc">${desc}</div></div></div>`;
}

export function renderProposal(d: DocData): string {
  const wedding = d.kind === "casamento";
  const dep = d.settings.depositPercent;
  const place = placeLabel(d);
  const duration = durationLabel(d);
  const durationShort = duration.replace(/ no local.*$/i, "").replace(/^Até/, "até");
  const ref = `ECL-${(d.eventDate ?? d.issuedAt.toISOString()).slice(0, 4)}-${String(d.orderId).padStart(3, "0")}`;
  const title = wedding ? "Carro da Noiva" : "Ensaio Fotográfico";
  const subtitle = wedding ? "Chegada da Noiva com o MP Lafer no Dia do Casamento" : "Pré-Wedding com MP Lafer";
  const intro = wedding
    ? `Uma proposta especial para o casamento de ${esc(d.names)}: a chegada da noiva com toda a elegância do MP Lafer conversível.`
    : `Uma proposta especial para o ensaio de ${esc(d.names)}: o charme do MP Lafer conversível nas paisagens da Serra Gaúcha.`;
  const modality = d.items.map((i) => esc(i.name)).join(" + ") || title;
  const balanceCents = d.totalCents - d.depositCents;
  const itemsLine =
    d.items.length > 1 || d.discountCents > 0
      ? `<div class="invest-items">${d.items.map((i) => `${esc(i.name)} ${money(i.priceCents)}`).join(" + ")}${
          d.discountCents ? ` − desconto ${money(d.discountCents)}` : ""
        }</div>`
      : "";
  const chrome = screenChrome("#050505", "Salvar em PDF");
  const firstName = esc(d.names);

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Orçamento — ${firstName} · Eu Casei de Lafer</title>${ogTags(
    `Orçamento — ${d.names} · Eu Casei de Lafer`,
    wedding ? "O MP Lafer conversível para o grande dia. Toque para ver a proposta completa." : "O MP Lafer conversível para o seu ensaio. Toque para ver a proposta completa.",
  )}${DOC_FONTS}
<style>${CSS}${chrome.css}</style></head><body>

<div class="page">${corners}
  <div class="p1-content">
    <div class="brand-name">Eu Casei de Lafer</div>
    <div class="brand-tagline">Experiências Memoráveis em Automóveis Clássicos</div>
    <div class="orc-title">Orçamento</div>
    <div class="meta-block">Para: <b>${firstName}</b><br>Data de emissão: ${instantLong(d.issuedAt)}<br>Ref.: ${ref}</div>
    <div class="divider mid">${divider}</div>
    <div class="eyebrow">Proposta Comercial</div>
    <div class="proposta-title">${title}</div>
    <div class="proposta-subtitle">${subtitle}</div>
    <p class="intro-text">${intro}</p>
    <div class="details-grid">
      <div><div class="detail-label">Modalidade</div><div class="detail-value">${modality}</div></div>
      <div><div class="detail-label">Veículo</div><div class="detail-value">MP Lafer Conversível — Clássico</div></div>
      <div><div class="detail-label">Data</div><div class="detail-value">${d.eventDate ? dateLong(d.eventDate) : "A definir"}${d.eventTime ? `, ${esc(d.eventTime)}` : ""}</div></div>
      <div><div class="detail-label">Local</div><div class="detail-value">${esc(place)}</div></div>
      <div class="full"><div class="detail-label">Duração</div><div class="detail-value">${esc(duration)}</div></div>
    </div>
  </div>
</div>

<div class="page">${corners}
  <div class="gal-content">
    <div class="eyebrow">Inspiração</div>
    <div class="gal-title">Uma Prévia da Experiência</div>
    <div class="gal-subtitle">Registros de ensaios realizados com o MP Lafer</div>
    <img class="gal-frame gal1-hero" src="/proposta/img_5401.jpg" alt="">
    <div class="gal1-row">
      <img class="gal-frame gal1-left" src="/proposta/img_5402.jpg" alt="">
      <img class="gal-frame gal1-right" src="/proposta/img_5400.jpg" alt="">
    </div>
    <div class="gal-caption">Imagens ilustrativas de ensaios anteriores com o veículo — uma prévia do clima e da estética possíveis no grande dia.</div>
  </div>
</div>

<div class="page">${corners}
  <div class="gal-content">
    <div class="eyebrow">Momentos</div>
    <div class="gal-title">Cada Detalhe Conta uma História</div>
    <div class="gal-subtitle">Pequenos instantes que compõem a memória do grande dia</div>
    <img class="gal-frame gal2-hero" src="/proposta/img_9968.jpg" alt="">
    <div class="gal2-row">
      <div class="gal2-quote">Dos saltos da noiva ao emblema clássico do MP Lafer — o charme está nos detalhes.</div>
      <img class="gal-frame gal2-image" src="/proposta/img_dsc3183.jpg" alt="">
    </div>
    <div class="gal-caption">Imagens ilustrativas de ensaios anteriores com o veículo — uma prévia do clima e da estética possíveis no grande dia.</div>
  </div>
</div>

<div class="page">${corners}
  <div class="p2-content">
    <div class="section-title">O que está incluso</div>
    <div class="includes-list">
      ${include("Deslocamento do veículo até o local", `Translado ida e volta até ${esc(place)} incluído no valor — sem cobranças adicionais de frete.`)}
      ${include("Veículo preparado e higienizado", "MP Lafer entregue limpo, polido e pronto para o grande momento, garantindo o melhor resultado visual.")}
      ${include(`Disponibilidade de ${esc(durationShort)} no local`, "Tempo reservado para o uso do veículo e registros fotográficos junto a ele.")}
      ${
        wedding
          ? include("Motorista trajado a rigor", "Elegância do primeiro ao último minuto, em sintonia com o estilo da cerimônia.")
          : include("Liberdade para criar", "Clima leve e descontraído, com o carro à disposição para diferentes ângulos e composições.")
      }
      ${include("Acompanhamento e suporte", "Presença do responsável pelo veículo para garantir o melhor aproveitamento do momento.")}
    </div>
    <div class="obs-block">
      <div class="obs-title">Observações importantes</div>
      <ul>
        <li>Duração estimada: ${esc(duration.charAt(0).toLowerCase() + duration.slice(1))}; ajustes de horário podem ser alinhados conforme o roteiro.</li>
        ${wedding ? "<li>Em caso de chuva, a capota é colocada com antecedência, sem prejuízo ao visual do carro.</li>" : "<li>O ensaio contempla um ponto de ensaio; um segundo local pode ser orçado à parte.</li>"}
        <li>A data é garantida somente após a confirmação do sinal.</li>
      </ul>
    </div>
    <div class="invest-box">
      <div class="invest-eyebrow">Investimento Total</div>
      ${itemsLine}
      <div class="invest-value">${money(d.totalCents)}</div>
      <div class="invest-note">${dep}% de sinal (${money(d.depositCents)}) para reserva da data e ${100 - dep}% restantes (${money(balanceCents)}) até ${
        d.settings.balanceDaysBefore === 1 ? "1 dia" : `${d.settings.balanceDaysBefore} dias`
      } antes do evento.<br>Pagamento via PIX.</div>
    </div>
    <div class="validity-text">Esta proposta é válida por ${d.settings.proposalValidityDays} dias a contar da data de emissão.</div>
  </div>
</div>

<div class="page">${corners}
  <div class="p3-content">
    <div class="eyebrow">Próximos Passos</div>
    <div class="gal-title">Como Confirmar a Reserva</div>
    <div class="gal-subtitle">Três passos simples para garantir o MP Lafer no grande dia</div>
    <div class="steps-list">
      <div class="step-item"><div class="step-num">1</div><div><div class="step-heading">Aprovação da proposta</div><div class="step-desc">Confirme o interesse neste orçamento diretamente pelo WhatsApp.</div></div></div>
      <div class="step-item"><div class="step-num">2</div><div><div class="step-heading">Dados para o contrato</div><div class="step-desc">Envie nome completo, CPF (ou passaporte, se estrangeiro) e endereço de quem assinará como contratante, para a emissão do Termo Simplificado de Prestação de Serviço.</div></div></div>
      <div class="step-item"><div class="step-num">3</div><div><div class="step-heading">Reserva da data</div><div class="step-desc">O sinal de ${dep}% via PIX garante a data na agenda; o restante é pago até ${
        d.settings.balanceDaysBefore === 1 ? "1 dia" : `${d.settings.balanceDaysBefore} dias`
      } antes do evento.</div></div></div>
    </div>
    <div class="closing-block">
      <div class="brand-name">Eu Casei de Lafer</div>
      <div class="divider">${divider}</div>
      <div class="closing-text">Ficamos à disposição para quaisquer ajustes<br>ou dúvidas sobre esta proposta.</div>
      <div class="closing-whats">Entre em contato pelo WhatsApp</div>
    </div>
  </div>
</div>
${chrome.html}
</body></html>`;
}
