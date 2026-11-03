import assert from "node:assert/strict";
import { test } from "node:test";
import { COMO_FUNCIONA, diasAntes, META, normalizar, OG, passos, perguntas, SEM_CANAIS, SERVICOS, type RegrasPublicas } from "./conteudo.ts";

const REGRAS: RegrasPublicas = { sinalPercent: 40, saldoPercent: 60, saldoDiasAntes: 1, validadeDias: 15 };
const normal = (s: string) => s.replace(/ /g, " ");

test("passos usam os números do painel", () => {
  const p = passos(REGRAS);
  assert.equal(p.length, 4);
  assert.equal(p[1].texto, "Ele vale 15 dias.");
  assert.match(p[3].titulo, /sinal de 40% por Pix/);
  assert.equal(p[3].texto, "O saldo, 60%, vence 1 dia antes.");
  const outros = passos({ sinalPercent: 30, saldoPercent: 70, saldoDiasAntes: 3, validadeDias: 7 });
  assert.equal(outros[1].texto, "Ele vale 7 dias.");
  assert.match(outros[3].titulo, /30%/);
  assert.equal(outros[3].texto, "O saldo, 70%, vence 3 dias antes.");
});

test("dias antes: 0, 1 e vários", () => {
  assert.equal(diasAntes(0), "no dia do evento");
  assert.equal(diasAntes(1), "1 dia antes");
  assert.equal(diasAntes(2), "2 dias antes");
});

test("perguntas: preço do ensaio vem do painel e some se não houver", () => {
  const com = perguntas(REGRAS, 190000).find((q) => q.pergunta.includes("ensaio"));
  assert.ok(com);
  assert.equal(normal(com.resposta), "O carro fica até 3 horas com vocês, em um único local, a partir de R$ 1.900.");
  const sem = perguntas(REGRAS, null).find((q) => q.pergunta.includes("ensaio"));
  assert.equal(sem?.resposta, "O carro fica até 3 horas com vocês, em um único local.");
});

test("perguntas: reserva usa sinal e saldo do painel", () => {
  const r = perguntas(REGRAS, null).find((q) => q.pergunta.includes("reservo"));
  assert.match(r?.resposta ?? "", /sinal de 40% por Pix/);
  assert.match(r?.resposta ?? "", /saldo, 60%, vence 1 dia antes/);
});

test("texto público não fala de distância nem usa o nome do dono (é sempre \"nossa equipe\")", () => {
  const tudo = JSON.stringify([passos(REGRAS), perguntas(REGRAS, 190000), SERVICOS, SEM_CANAIS]).toLowerCase();
  for (const proibido of ["leonardo", " km", "quilômetro", "raio", "distância"]) {
    assert.ok(!tudo.includes(proibido), `não pode aparecer: ${proibido}`);
  }
  assert.match(tudo, /nossa equipe/);
});

test("nomes de serviço são comparados sem acento nem maiúscula", () => {
  assert.equal(normalizar("Saída dos Noivos"), "saida dos noivos");
  assert.equal(normalizar(" Ensaio Pré-Wedding "), "ensaio pre-wedding");
  assert.ok(SERVICOS.descricoes[normalizar("Carro da Noiva")]);
  assert.ok(SERVICOS.descricoes[normalizar("Saída dos Noivos")]);
  assert.ok(SERVICOS.descricoes[normalizar("Ensaio Pré-Wedding")]);
});

test("a data só é prometida como garantida depois do sinal (o sistema segura a data, o texto público não diz 'bloqueada')", () => {
  const p = passos(REGRAS);
  assert.match(p[3].titulo, /a data fica garantida/);
  assert.match(COMO_FUNCIONA.nota, /garantida depois do sinal/);
  const reserva = perguntas(REGRAS, null).find((q) => q.pergunta.includes("reservo"));
  assert.match(reserva?.resposta ?? "", /só fica garantida depois do sinal/);
  const tudo = JSON.stringify([passos(REGRAS), perguntas(REGRAS, 190000), SERVICOS, COMO_FUNCIONA]).toLowerCase();
  assert.ok(!tudo.includes("bloquead"), "o texto público não usa 'bloqueada'");
  assert.ok(!tudo.includes("reservada para você"), "nada de reserva antes do sinal");
});

test("o que não foi confirmado pelo dono não aparece como incluso nem como promessa", () => {
  const incluso = SERVICOS.incluso.itens.join(" ").toLowerCase();
  for (const fora of ["floral", "flores", "decoração", "capota", "couro", "30 min", "seguro"]) {
    assert.ok(!incluso.includes(fora), `não pode estar em "incluso": ${fora}`);
  }
  const tudo = JSON.stringify([passos(REGRAS), perguntas(REGRAS, 190000), SERVICOS, SEM_CANAIS]).toLowerCase();
  for (const promessa of ["últimas datas", "restam", "vagas", "garantimos", "casamentos realizados", "avaliações"]) {
    assert.ok(!tudo.includes(promessa), `não pode aparecer: ${promessa}`);
  }
});

test("pré-visualização do link: título e descrição cabem, imagem 1200x630 e mesmo conteúdo do título da página", () => {
  assert.ok(OG.title.length <= 70);
  assert.ok(OG.description.length <= 160);
  assert.equal(OG.description, META.descricao);
  assert.equal(OG.images[0].url, "/og-landing.jpg");
  assert.equal(OG.images[0].width, 1200);
  assert.equal(OG.images[0].height, 630);
  assert.ok(OG.images[0].alt.length > 0);
});
