import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeLink, linkKey, linksFromRows, parseLink } from "./links.ts";

test("o vínculo vai e volta pela linha de Setting", () => {
  const link = parseLink(linkKey(12), encodeLink("abc123xyz", "2026-12-05"));
  assert.deepEqual(link, { orderId: 12, eventId: "abc123xyz", date: "2026-12-05" });
});

test("linha que não é vínculo, ou está estragada, é ignorada sem erro", () => {
  assert.equal(parseLink("depositPercent", "40"), null);
  assert.equal(parseLink("googleVinculo:abc", encodeLink("e", "2026-12-05")), null);
  assert.equal(parseLink("googleVinculo:0", encodeLink("e", "2026-12-05")), null);
  assert.equal(parseLink("googleVinculo:5", "não é json"), null);
  assert.equal(parseLink("googleVinculo:5", JSON.stringify({ eventId: "", date: "2026-12-05" })), null);
  assert.equal(parseLink("googleVinculo:5", JSON.stringify({ eventId: "e", date: "05/12/2026" })), null);
});

test("linksFromRows separa os vínculos do resto das configurações", () => {
  const rows = [
    { key: "depositPercent", value: "40" },
    { key: linkKey(3), value: encodeLink("ev3", "2026-12-05") },
    { key: "googleVinculo:x", value: "{}" },
    { key: linkKey(9), value: encodeLink("ev9", "2026-12-19") },
  ];
  assert.deepEqual(
    linksFromRows(rows).map((l) => [l.orderId, l.eventId]),
    [[3, "ev3"], [9, "ev9"]],
  );
});
