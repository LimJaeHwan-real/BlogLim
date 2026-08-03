import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSlug, preparePublication, PublisherError } from "../src/domain.js";

const NOW = new Date("2026-08-03T03:04:05.000Z");
const PNG_SIGNATURE_BASE64 = "iVBORw0KGgo=";

function basePayload(overrides = {}) {
  return {
    title: "안전한 GitHub 게시",
    description: "설명에 \"따옴표\"가 있습니다.",
    slug: "안전한 GitHub 게시",
    categories: ["개발", "GitHub"],
    tags: ["Worker"],
    thumbnail: "/assets/images/posts/cover.png",
    body: "# 본문\n\n![그림](bloglim-image://image-1)",
    images: [{ id: "image-1", mimeType: "image/png", dataBase64: PNG_SIGNATURE_BASE64 }],
    ...overrides,
  };
}

test("normalizeSlug keeps Korean and removes unsafe path characters", () => {
  assert.equal(normalizeSlug("  GitHub / 안전한 게시 ../ 테스트  "), "github-안전한-게시-테스트");
});

test("preparePublication creates canonical post and image paths", () => {
  const publication = preparePublication(basePayload(), NOW);

  assert.equal(publication.postPath, "_posts/2026-08-03-안전한-github-게시.md");
  assert.equal(publication.images[0].path, "assets/images/posts/2026-08-03-안전한-github-게시/01.png");
  assert.match(publication.markdown, /title: "안전한 GitHub 게시"/);
  assert.match(publication.markdown, /description: "설명에 \\"따옴표\\"가 있습니다."/);
  assert.match(publication.markdown, /\/BlogLim\/assets\/images\/posts\/2026-08-03-/);
  assert.doesNotMatch(publication.markdown, /bloglim-image:\/\//);
});

test("preparePublication blocks a mismatched image signature", () => {
  assert.throws(
    () => preparePublication(basePayload({ images: [{ id: "image-1", mimeType: "image/jpeg", dataBase64: PNG_SIGNATURE_BASE64 }] }), NOW),
    (error) => error instanceof PublisherError && error.code === "IMAGE_INVALID"
  );
});

test("preparePublication blocks high-confidence secrets", () => {
  const fakeToken = "ghp_" + "abcdefghijklmnopqrstuvwxyz123456";
  assert.throws(
    () => preparePublication(basePayload({ body: "노출 금지 " + fakeToken, images: [] }), NOW),
    (error) => error instanceof PublisherError && error.code === "SECRET_DETECTED"
  );
});

test("preparePublication never accepts more than five images", () => {
  const images = Array.from({ length: 6 }, (_, index) => ({
    id: "image-" + String(index + 1),
    mimeType: "image/png",
    dataBase64: PNG_SIGNATURE_BASE64,
  }));
  assert.throws(
    () => preparePublication(basePayload({ images }), NOW),
    (error) => error instanceof PublisherError && error.code === "IMAGE_INVALID"
  );
});
