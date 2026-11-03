import { test } from "node:test";
import assert from "node:assert/strict";
import { descreverPedido, itensDoOrcamento, lerPedido, resolverServicos, telefoneDoPedido, type PedidoNovo, type ServicoLista } from "./pedido.ts";

const LISTA: ServicoLista[] = [
  { id: 1, name: "Carro da Noiva", priceCents: 260000, isAddon: false },
  { id: 2, name: "Saída dos Noivos", priceCents: 50000, isAddon: true },
];

const base: PedidoNovo = {
  nome: "Ana & Beto",
  telefone: "5551999990000",
  data: "2026-12-05",
  horario: "16:00",
  local: "Capela Exemplo",
  cidade: "Gramado",
  servicos: [1],
  valorCents: 240000,
  evento: "evt1",
  notas: "",
};

test("telefone: aceita DDD com ou sem 55 e acrescenta o nono dígito; recusa sem DDD", () => {
  assert.equal(telefoneDoPedido("(51) 99999-0000"), "5551999990000");
  assert.equal(telefoneDoPedido("+55 51 99999-0000"), "5551999990000");
  assert.equal(telefoneDoPedido("99999-0000"), null);
  assert.equal(telefoneDoPedido(""), null);
  assert.equal(telefoneDoPedido(undefined), null);
});

test("serviços: por código ou por parte do nome, sem repetir, e avisa o que não achou", () => {
  assert.deepEqual(resolverServicos(["carro da noiva", 2, "saida"], LISTA), { ids: [1, 2], faltou: [] });
  assert.deepEqual(resolverServicos(["helicóptero"], LISTA), { ids: [], faltou: ["helicóptero"] });
  assert.deepEqual(resolverServicos(undefined, LISTA), { ids: [], faltou: [] });
});

test("orçamento: sem valor combinado usa a tabela; com valor, o total fecha nele", () => {
  assert.deepEqual(itensDoOrcamento([1, 2], LISTA, null).map((i) => i.priceCents), [260000, 50000]);
  const itens = itensDoOrcamento([1, 2], LISTA, 280000);
  assert.deepEqual(itens.map((i) => i.priceCents), [230000, 50000]);
  assert.equal(itens.reduce((s, i) => s + i.priceCents, 0), 280000);
  assert.throws(() => itensDoOrcamento([1, 2], LISTA, 40000), /menor que os outros/);
});

test("confirmação mostra o que será gravado, com o sinal na porcentagem padrão", () => {
  const t = descreverPedido(base, ["Carro da Noiva"], 30);
  assert.match(t, /Ana & Beto/);
  assert.match(t, /05\/12/);
  assert.match(t, /R\$\s2\.400,00/);
  assert.match(t, /sinal de 30% = R\$\s720,00/);
  assert.match(t, /Ligado ao evento da Google Agenda/);
  assert.match(t, /só é reservada quando o sinal for recebido/);
  assert.match(descreverPedido({ ...base, evento: null, valorCents: null }, ["Carro da Noiva"], 30), /preços da tabela[\s\S]*Sem ligação/);
});

test("lerPedido recusa dados quebrados e limpa o que sobra", () => {
  assert.ok(lerPedido(base));
  assert.equal(lerPedido({ ...base, nome: " " }), null);
  assert.equal(lerPedido({ ...base, telefone: "123" }), null);
  assert.equal(lerPedido({ ...base, data: "05/12/2026" }), null);
  assert.equal(lerPedido({ ...base, valorCents: 0 }), null);
  assert.equal(lerPedido({ ...base, servicos: ["1"] }), null);
  assert.equal(lerPedido(null), null);
  assert.equal(lerPedido({ ...base, valorCents: null, evento: null })?.valorCents, null);
});

import { descontoPara, descreverAjuste, descreverContrato, documentoMascarado } from "./pedido.ts";

test("desconto: pelo total final ou pelo valor do desconto; nunca negativo nem maior que os serviços", () => {
  assert.equal(descontoPara(260000, { totalCents: 254500 }), 5500);
  assert.equal(descontoPara(260000, { descontoCents: 5500 }), 5500);
  assert.equal(descontoPara(260000, { totalCents: 254500, descontoCents: 100 }), 5500);
  assert.equal(descontoPara(260000, { totalCents: 260000 }), 0);
  assert.throws(() => descontoPara(260000, { totalCents: 270000 }), /maior que os serviços/);
  assert.throws(() => descontoPara(260000, { descontoCents: 300000 }), /maior que o valor/);
  assert.throws(() => descontoPara(260000, {}), /total final ou o valor do desconto/);
});

test("confirmação do ajuste mostra antes, depois, sinal e saldo", () => {
  const t = descreverAjuste({ pedido: 3, nome: "Ana & Beto", antesCents: 260000, subtotalCents: 260000, descontoCents: 5500, sinalPercent: 40 });
  assert.match(t, /#3/);
  assert.match(t, /Antes: R\$\s2\.600,00/);
  assert.match(t, /Agora: R\$\s2\.545,00 \(desconto de R\$\s55,00/);
  assert.match(t, /Sinal R\$\s1\.018,00 · saldo R\$\s1\.527,00/);
});

test("documento aparece mascarado na confirmação", () => {
  assert.equal(documentoMascarado("529.982.247-25"), "529.***.***-25");
  assert.equal(documentoMascarado("AB123456"), "AB****56");
  const t = descreverContrato({ pedido: 3, nome: "Ana & Beto", nomeCompleto: "Ana Exemplo Silva", documento: "529.982.247-25", endereco: "Rua Teste, 1, Cidade", email: "" });
  assert.doesNotMatch(t, /982/);
  assert.match(t, /Termo Simplificado/);
  assert.doesNotMatch(t, /E-mail/);
});
