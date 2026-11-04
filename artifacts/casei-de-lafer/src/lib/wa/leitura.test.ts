import { test } from "node:test";
import assert from "node:assert/strict";
import { leituraPermitida, linha, semDocumentos } from "./leitura.ts";

test("leitura só pelo endereço *.vercel.app e só com a chave ligada", () => {
  assert.equal(leituraPermitida("projeto-exemplo.vercel.app", "1"), true);
  assert.equal(leituraPermitida("projeto-exemplo-abc123-time.vercel.app:443", "1"), true);
  assert.equal(leituraPermitida("www.exemplo.com.br", "1"), false);
  assert.equal(leituraPermitida("exemplo.vercel.app.atacante.com", "1"), false);
  assert.equal(leituraPermitida("projeto-exemplo.vercel.app", undefined), false);
  assert.equal(leituraPermitida("projeto-exemplo.vercel.app", "0"), false);
  assert.equal(leituraPermitida(null, "1"), false);
});

test("documentos pessoais saem escondidos; telefone e valores ficam", () => {
  const t = semDocumentos("Nome: Ana\nCPF: 529.982.247-25\nRG: 1234567890\nE-mail: ana@exemplo.com\nCep 93.000-000\nTelefone: 51 99999-0000\nPix de 400");
  assert.doesNotMatch(t, /529\.982|1234567890|ana@exemplo|93\.000/);
  assert.match(t, /51 99999-0000/);
  assert.match(t, /Pix de 400/);
  assert.match(semDocumentos("o documento 529.982.247-25 está ok"), /\[CPF oculto\]/);
});

test("linha da conversa marca quem falou e a ação proposta", () => {
  const base = { id: 1, createdAt: new Date("2026-11-04T19:05:00Z"), author: "margot", type: "text", text: "oi", fileName: "", action: "", actionDoneAt: null };
  assert.equal(linha({ ...base, direction: "in", author: "leonardo" }).de, "leonardo");
  const l = linha({ ...base, direction: "out", type: "interactive", action: JSON.stringify({ tipo: "pedido" }) });
  assert.equal(l.acao, "pedido: pendente");
  assert.equal(linha({ ...base, direction: "in", type: "document", text: "", fileName: "Termo.pdf" }).texto, "[arquivo: Termo.pdf]");
});
