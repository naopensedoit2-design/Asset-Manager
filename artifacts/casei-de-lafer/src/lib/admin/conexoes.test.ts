import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agendaConnection,
  attentionCount,
  buildConnections,
  groupConnections,
  iaConnection,
  instagramConnection,
  rotinaConnection,
  whatsappConnection,
  whenLabel,
  type ConexoesInput,
} from "./conexoes.ts";

// 30/10/2026, 10:05 em Brasília (13:05 UTC)
const NOW = new Date("2026-10-30T13:05:00Z");

const base: ConexoesInput = {
  now: NOW,
  whatsapp: { missing: [], margotOn: true, ownerPhoneSet: true },
  agenda: { missing: [] },
  financeiro: { openBills: 2, openBillsCents: 659_200 },
  rotina: { record: { at: "2026-10-30T10:01:00Z", resumoEnviado: true, detalhe: "resumo enviado" }, cronSecret: true },
  ia: { keySet: true, usageUsd: 2.38, limitUsd: 10 },
  fotos: { missing: [] },
  api: { enabled: true },
  instagram: { panelUrl: "https://exemplo.com/painel-instagram" },
};

test("whenLabel: hoje, ontem e data (horário de Brasília)", () => {
  assert.equal(whenLabel("2026-10-30T10:01:00Z", NOW), "hoje às 07:01");
  assert.equal(whenLabel("2026-10-29T10:02:00Z", NOW), "ontem às 07:02");
  assert.equal(whenLabel("2026-10-27T10:03:00Z", NOW), "27/10 às 07:03");
  // 02:30 UTC ainda é o dia anterior em Brasília
  assert.equal(whenLabel("2026-10-30T02:30:00Z", NOW), "ontem às 23:30");
});

test("WhatsApp: faltando variável, pausada, sem número do dono e tudo certo", () => {
  const falta = whatsappConnection({ missing: ["WHATSAPP_TOKEN"], margotOn: true, ownerPhoneSet: true });
  assert.equal(falta.state, "falta");
  assert.deepEqual(falta.missing, ["WHATSAPP_TOKEN"]);
  assert.equal(falta.check, undefined, "sem configuração não há o que conferir ao vivo");
  assert.ok(falta.steps.length >= 2);

  const pausada = whatsappConnection({ missing: [], margotOn: false, ownerPhoneSet: true });
  assert.equal(pausada.state, "atencao");
  assert.match(pausada.headline, /pausada/);

  const semDono = whatsappConnection({ missing: [], margotOn: true, ownerPhoneSet: false });
  assert.equal(semDono.state, "atencao");

  const ok = whatsappConnection({ missing: [], margotOn: true, ownerPhoneSet: true });
  assert.equal(ok.state, "ok");
  assert.equal(ok.check, "whatsapp");
});

test("Agenda: sem variáveis falta; com variáveis permite conferir ao vivo", () => {
  assert.equal(agendaConnection({ missing: ["GOOGLE_CALENDAR_ID"] }).state, "falta");
  const ok = agendaConnection({ missing: [] });
  assert.equal(ok.state, "ok");
  assert.equal(ok.check, "agenda");
});

test("Rotina das 7h: sem chave, sem registro, parada, enviou e motivos de não enviar", () => {
  const r = (record: ConexoesInput["rotina"]["record"], cronSecret = true) => rotinaConnection({ record, cronSecret }, NOW);

  assert.equal(r(null, false).state, "falta");
  assert.deepEqual(r(null, false).missing, ["CRON_SECRET"]);

  const semRegistro = r(null);
  assert.equal(semRegistro.state, "atencao");
  assert.match(semRegistro.headline, /sem registro/i);

  const enviou = r({ at: "2026-10-30T10:01:00Z", resumoEnviado: true, detalhe: "resumo enviado" });
  assert.equal(enviou.state, "ok");
  assert.equal(enviou.headline, "Rodou hoje às 07:01");
  assert.match(enviou.detail, /resumo do dia/);

  const modelo = r({ at: "2026-10-30T10:01:00Z", resumoEnviado: true, detalhe: "aviso modelo (conversa fechada)" });
  assert.match(modelo.detail, /modelo/);

  const nada = r({ at: "2026-10-30T10:01:00Z", resumoEnviado: false, detalhe: "Nada para avisar hoje" });
  assert.equal(nada.state, "ok");
  assert.match(nada.detail, /nada para avisar/i);

  const desligado = r({ at: "2026-10-30T10:01:00Z", resumoEnviado: false, detalhe: "Resumo diário desligado em Regras" });
  assert.equal(desligado.state, "ok");

  const problema = r({ at: "2026-10-30T10:01:00Z", resumoEnviado: false, detalhe: "WhatsApp não configurado" });
  assert.equal(problema.state, "atencao");
  assert.match(problema.detail, /WhatsApp não configurado/);

  // Com a Vercel Hobby a rodada cai "dentro da hora" das 7h: 25 h e meia entre uma e outra ainda é normal; 27 h, não.
  assert.equal(r({ at: "2026-10-29T11:35:00Z", resumoEnviado: true, detalhe: "resumo enviado" }).state, "ok");
  assert.equal(r({ at: "2026-10-29T10:00:00Z", resumoEnviado: true, detalhe: "resumo enviado" }).state, "atencao");
  const parada = r({ at: "2026-10-28T10:00:00Z", resumoEnviado: true, detalhe: "resumo enviado" });
  assert.equal(parada.state, "atencao");
  assert.match(parada.detail, /Cron Jobs/);
});

test("IA da Margot: sem chave, limite zero, perto, estourado e pronta", () => {
  assert.equal(iaConnection({ keySet: false, usageUsd: 0, limitUsd: 10 }).state, "falta");
  assert.equal(iaConnection({ keySet: true, usageUsd: 0, limitUsd: 0 }).state, "atencao");
  assert.match(iaConnection({ keySet: true, usageUsd: 10, limitUsd: 10 }).headline, /atingido/);
  assert.match(iaConnection({ keySet: true, usageUsd: 9.2, limitUsd: 10 }).headline, /Perto/);
  const ok = iaConnection({ keySet: true, usageUsd: 2.38, limitUsd: 10 });
  assert.equal(ok.state, "ok");
  assert.match(ok.detail, /US\$ 2,38 de US\$ 10,00/);
});

test("Lista completa: ordem, honestidade sobre Gmail/Instagram/Metricool e contagem de atenção", () => {
  const list = buildConnections(base);
  assert.deepEqual(
    list.map((c) => c.key),
    ["whatsapp", "agenda", "financeiro", "rotina", "ia", "instagram", "metricool", "gmail", "api", "fotos"],
  );
  const by = (k: string) => list.find((c) => c.key === k)!;
  assert.equal(by("gmail").state, "falta", "Gmail não está conectado e não finge estar");
  assert.equal(by("instagram").state, "fora");
  assert.equal(by("metricool").state, "fora");
  assert.equal(by("instagram").link?.external, true);
  assert.equal(by("instagram").link?.href, "https://exemplo.com/painel-instagram");
  // Só o Gmail pede ação quando todo o resto está em dia.
  assert.equal(attentionCount(list), 1);

  const g = groupConnections(list);
  assert.deepEqual(g.atencao.map((c) => c.key), ["gmail"]);
  assert.ok(g.funcionando.length >= 5);
  assert.deepEqual(g.fora.map((c) => c.key), ["instagram", "metricool"]);

  const pior = buildConnections({
    ...base,
    whatsapp: { missing: ["WHATSAPP_TOKEN", "WHATSAPP_APP_SECRET"], margotOn: true, ownerPhoneSet: true },
    api: { enabled: false },
  });
  assert.equal(attentionCount(pior), 2, "WhatsApp e Gmail; a API é opcional e fica fora da contagem");
  assert.equal(pior.find((c) => c.key === "api")!.state, "fora");
});

test("Instagram: sem link configurado não mostra botão e explica como ligar; link inseguro é ignorado", () => {
  const sem = instagramConnection("");
  assert.equal(sem.link, undefined);
  assert.match(sem.steps.join(" "), /INSTAGRAM_PANEL_URL/);
  assert.equal(sem.state, "fora");
  assert.equal(instagramConnection("javascript:alert(1)").link, undefined);
  assert.equal(instagramConnection("http://exemplo.com").link, undefined);
  assert.equal(instagramConnection("  https://exemplo.com/p  ").link?.href, "https://exemplo.com/p");
});

test("Os textos nunca trazem valores de variáveis, só nomes", () => {
  const all = JSON.stringify(
    buildConnections({ ...base, whatsapp: { missing: ["WHATSAPP_TOKEN"], margotOn: true, ownerPhoneSet: true }, fotos: { missing: ["CLOUDINARY_API_SECRET"] } }),
  );
  assert.ok(all.includes("WHATSAPP_TOKEN"));
  assert.ok(!/sk-ant|Bearer |eyJ/.test(all));
});
