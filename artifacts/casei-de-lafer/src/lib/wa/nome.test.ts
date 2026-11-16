import { test } from "node:test";
import assert from "node:assert/strict";
import { dicaDeTranscricao, nomeDoPerfil } from "./nome.ts";

test("limpa números, emojis e símbolos do nome do perfil", () => {
  assert.equal(nomeDoPerfil("Neuselí695297"), "Neuselí");
  assert.equal(nomeDoPerfil("Isabel Cristina Davila🐛🦋🦗"), "Isabel Cristina Davila");
  assert.equal(nomeDoPerfil("  Ana   e Rodrigo 💍 "), "Ana e Rodrigo");
  assert.equal(nomeDoPerfil("12345"), "");
  assert.equal(nomeDoPerfil(null), "");
});

test("a dica leva o nome do perfil só quando existe", () => {
  assert.match(dicaDeTranscricao("Neuselí"), /Neuselí/);
  assert.doesNotMatch(dicaDeTranscricao(""), /chamar/);
});
