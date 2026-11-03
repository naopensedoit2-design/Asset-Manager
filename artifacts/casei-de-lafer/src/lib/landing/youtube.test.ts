import assert from "node:assert/strict";
import { test } from "node:test";
import { idDoYoutube } from "./youtube.ts";

test("código puro de 11 caracteres", () => {
  assert.equal(idDoYoutube("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(idDoYoutube("  dQw4w9WgXcQ "), "dQw4w9WgXcQ");
});

test("endereços comuns do YouTube", () => {
  assert.equal(idDoYoutube("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3s"), "dQw4w9WgXcQ");
  assert.equal(idDoYoutube("https://youtu.be/dQw4w9WgXcQ?si=abc"), "dQw4w9WgXcQ");
  assert.equal(idDoYoutube("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(idDoYoutube("https://youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(idDoYoutube("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
});

test("o que não é YouTube, vazio ou código torto vira null", () => {
  assert.equal(idDoYoutube(""), null);
  assert.equal(idDoYoutube(null), null);
  assert.equal(idDoYoutube("https://exemplo.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(idDoYoutube("curto"), null);
  assert.equal(idDoYoutube("https://www.youtube.com/watch?v=<script>"), null);
  assert.equal(idDoYoutube("javascript:alert(1)"), null);
});
