import { test } from "node:test";
import assert from "node:assert/strict";
import { concluir, gravarPendencia, lerPendencia, novaPendencia, pendenciasVisiveis, type Pendencia } from "./pendencias.ts";

const p = (numero: number, over: Partial<Pendencia> = {}): Pendencia => ({
  numero,
  texto: `pedido ${numero}`,
  criadaEm: "2026-11-01",
  status: "aberta",
  concluidaEm: null,
  nota: "",
  ...over,
});

test("numera em sequência, sem repetir número de pendência concluída", () => {
  const n = novaPendencia("  Ignorar mensagens   que o WhatsApp não entrega ", "2026-11-11", [p(1), p(3, { status: "concluida", concluidaEm: "2026-11-05" })]);
  assert.ok(typeof n !== "string");
  assert.equal(n.numero, 4);
  assert.equal(n.texto, "Ignorar mensagens que o WhatsApp não entrega");
  assert.equal(n.status, "aberta");
});

test("recusa pedido vazio", () => {
  assert.equal(typeof novaPendencia(" ok ", "2026-11-11", []), "string");
});

test("grava e lê de volta; ignora chave ou valor estranho", () => {
  const original = concluir(p(7), "2026-11-12", "PR nº 40");
  const g = gravarPendencia(original);
  assert.deepEqual(lerPendencia(g.key, g.value), original);
  assert.equal(lerPendencia("margotRecado:abc", g.value), null);
  assert.equal(lerPendencia("margotPendencia:x", g.value), null);
  assert.equal(lerPendencia(g.key, "lixo"), null);
});

test("lista abertas primeiro e esconde concluída antiga", () => {
  const rows = [
    p(2, { status: "concluida", concluidaEm: "2026-11-10" }),
    p(5),
    p(1, { status: "concluida", concluidaEm: "2026-09-01" }),
    p(3),
  ].map(gravarPendencia);
  assert.deepEqual(pendenciasVisiveis(rows, "2026-11-11").map((x) => x.numero), [3, 5, 2]);
});
