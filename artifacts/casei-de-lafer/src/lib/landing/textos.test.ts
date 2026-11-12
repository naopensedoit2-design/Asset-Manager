import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { DEFAULT_SETTINGS } from "../gestor/rules.ts";
import { servicosPublicos } from "./servicos.ts";
import { diasAntes, diasDeChuva, itensDoCerimonial, itensDoFotografo, momentos, passos, perguntas, type RegrasPublicas } from "./textos.ts";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..", "..", "..");
const componentes = join(raiz, "src", "components", "landing");

/** Tudo o que escreve a página pública: os textos, os componentes e a página. */
const arquivos = [
  join(aqui, "textos.ts"),
  join(raiz, "app", "page.tsx"),
  ...readdirSync(componentes)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => join(componentes, f)),
];
const codigo = arquivos.map((a) => ({ arquivo: a.slice(raiz.length + 1), texto: readFileSync(a, "utf8") }));

const regras: RegrasPublicas = { sinalPercent: 40, saldoPercent: 60, saldoDiasAntes: 1, chuvaDias: 60 };

test("nenhuma palavra proibida pelo dono na página pública", () => {
  const proibidas = /inesquec|cinematogr|sonho|conto de fadas|joia rara|exclusiv|poucas datas|[úu]ltimas (datas|vagas)|imperd[ií]vel|incr[ií]vel|perfeit|\b[oa] melhor\b|garanta j[áa]|s[óo] hoje/i;
  for (const { arquivo, texto } of codigo) assert.doesNotMatch(texto, proibidas, arquivo);
});

test("o nome do dono não aparece: é sempre a nossa equipe", () => {
  for (const { arquivo, texto } of codigo) assert.doesNotMatch(texto, /leonardo/i, arquivo);
  assert.match(readFileSync(join(aqui, "textos.ts"), "utf8"), /nossa equipe/);
});

test("nenhum valor em reais é digitado no código: os preços vêm de Regras", () => {
  for (const { arquivo, texto } of codigo) assert.doesNotMatch(texto, /R\$\s*\d/, arquivo);
});

test("o prazo da chuva é lido do texto de cancelamento de Regras", () => {
  assert.equal(diasDeChuva(DEFAULT_SETTINGS.cancellationPolicy), 60);
  assert.equal(diasDeChuva("Em ensaios, chuva forte permite remarcar sem custo em até 45 dias."), 45);
  assert.equal(diasDeChuva("O sinal não é reembolsável."), null);
  assert.equal(diasDeChuva("Chuva não muda nada. O saldo vence em 60 dias."), null);
});

test("sinal, saldo e prazo dos passos e das perguntas acompanham Regras", () => {
  const outras: RegrasPublicas = { sinalPercent: 30, saldoPercent: 70, saldoDiasAntes: 3, chuvaDias: null };
  const ultimo = passos(outras).at(-1);
  assert.match(ultimo?.texto ?? "", /sinal de 30% por Pix/);
  assert.match(ultimo?.apoio ?? "", /70%, vence 3 dias antes/);
  assert.match(perguntas(outras, null).at(-1)?.resposta ?? "", /30%.*70%, vence 3 dias antes/);
  assert.match(itensDoCerimonial(outras).at(-1)?.texto ?? "", /30%/);
  assert.equal(diasAntes(0), "no dia do evento");
  assert.equal(diasAntes(1), "1 dia antes");
});

test("a resposta do ensaio só cita valor quando o painel tem o serviço", () => {
  assert.doesNotMatch(perguntas(regras, null)[1]?.resposta ?? "", /a partir de/);
  assert.match(perguntas(regras, "X reais")[1]?.resposta ?? "", /a partir de X reais\.$/);
});

test("o bloco dos fotógrafos só promete o que há: chuva se Regras diz, crédito se todas as fotos têm", () => {
  const frases = (r: RegrasPublicas, credito: boolean) => itensDoFotografo(r, credito).map((i) => i.forte).join(" ");
  assert.match(frases(regras, true), /Chuva forte.*Crédito em cada foto/);
  assert.doesNotMatch(frases(regras, false), /Crédito/);
  assert.doesNotMatch(frases({ ...regras, chuvaDias: null }, true), /Chuva/);
});

test("cada serviço de Regras vira um momento, na ordem chegada, saída, ensaio", () => {
  const publicos = servicosPublicos([
    { name: "Ensaio Pré-Wedding", description: "", priceCents: 195000, isAddon: false },
    { name: "Saída dos Noivos", description: "", priceCents: 50000, isAddon: true },
    { name: "Região de Caxias (Carro da Noiva)", description: "", priceCents: 20000, isAddon: true },
    { name: "Carro da Noiva", description: "", priceCents: 240000, isAddon: false },
  ]);
  const lista = momentos(publicos);
  assert.deepEqual(lista.map((m) => m.chave), ["chegada", "saida", "ensaio"]);
  assert.deepEqual(lista.map((m) => m.titulo), ["A chegada", "A saída", "O ensaio"]);
  // a Saída dos Noivos nunca leva valor; o adicional de região nem aparece
  assert.equal(lista[1]?.aPartirDeCents, null);
  assert.doesNotMatch(JSON.stringify(lista), /Caxias/);
});

test("serviço novo no painel aparece com o nome e a descrição de Regras, depois dos conhecidos", () => {
  const lista = momentos(
    servicosPublicos([
      { name: "Bodas de Prata", description: "O carro para a festa de bodas.", priceCents: 100000, isAddon: false },
      { name: "Carro da Noiva", description: "", priceCents: 240000, isAddon: false },
    ]),
  );
  assert.deepEqual(lista.map((m) => m.chave), ["chegada", null]);
  assert.equal(lista[1]?.titulo, "Bodas de Prata");
  assert.equal(lista[1]?.texto, "O carro para a festa de bodas.");
});
