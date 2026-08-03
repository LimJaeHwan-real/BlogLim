import assert from "node:assert/strict";
import test from "node:test";

import { PublisherError } from "../src/domain.js";
import { publishAtomic } from "../src/github.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function queuedFetch(responses, requests) {
  return async function fakeFetch(url, options = {}) {
    requests.push({ url, options });
    const next = responses.shift();
    if (!next) {
      throw new Error("Unexpected request: " + url);
    }
    return typeof next === "function" ? next(url, options) : next;
  };
}

function publication() {
  return {
    title: "게시 테스트",
    postPath: "_posts/2026-08-03-게시-테스트.md",
    markdown: "---\ntitle: 게시 테스트\n---\n",
    images: [{ path: "assets/images/posts/2026-08-03-게시-테스트/01.png", dataBase64: "iVBORw0KGgo=" }],
  };
}

test("publishAtomic updates main once after all blobs and the commit exist", async () => {
  const requests = [];
  const responses = [
    jsonResponse({ object: { sha: "base-commit" } }),
    jsonResponse({ tree: { sha: "base-tree" } }),
    jsonResponse({}, 404),
    jsonResponse({}, 404),
    jsonResponse({ sha: "post-blob" }, 201),
    jsonResponse({ sha: "image-blob" }, 201),
    jsonResponse({ sha: "new-tree" }, 201),
    jsonResponse({ sha: "new-commit" }, 201),
    jsonResponse({ object: { sha: "new-commit" } }),
  ];

  const result = await publishAtomic({
    fetchImpl: queuedFetch(responses, requests),
    token: "test-token",
    owner: "LimJaeHwan-real",
    repo: "BlogLim",
    branch: "main",
    publication: publication(),
  });

  assert.equal(result.commitSha, "new-commit");
  const updates = requests.filter((request) => request.options.method === "PATCH");
  assert.equal(updates.length, 1);
  assert.deepEqual(JSON.parse(updates[0].options.body), { sha: "new-commit", force: false });
});

test("publishAtomic refuses to overwrite an existing post", async () => {
  const requests = [];
  const responses = [
    jsonResponse({ object: { sha: "base-commit" } }),
    jsonResponse({ tree: { sha: "base-tree" } }),
    jsonResponse({ sha: "existing-file" }),
  ];

  await assert.rejects(
    () => publishAtomic({
      fetchImpl: queuedFetch(responses, requests),
      token: "test-token",
      owner: "LimJaeHwan-real",
      repo: "BlogLim",
      branch: "main",
      publication: publication(),
    }),
    (error) => error instanceof PublisherError && error.code === "PATH_CONFLICT"
  );
  assert.equal(requests.some((request) => request.options.method === "PATCH"), false);
});

test("publishAtomic retries once on a concurrent main update without force pushing", async () => {
  const requests = [];
  const responses = [
    jsonResponse({ object: { sha: "base-commit-1" } }),
    jsonResponse({ tree: { sha: "base-tree-1" } }),
    jsonResponse({}, 404),
    jsonResponse({}, 404),
    jsonResponse({ sha: "post-blob" }, 201),
    jsonResponse({ sha: "image-blob" }, 201),
    jsonResponse({ sha: "new-tree-1" }, 201),
    jsonResponse({ sha: "new-commit-1" }, 201),
    jsonResponse({}, 422),
    jsonResponse({ object: { sha: "base-commit-2" } }),
    jsonResponse({ tree: { sha: "base-tree-2" } }),
    jsonResponse({}, 404),
    jsonResponse({}, 404),
    jsonResponse({ sha: "new-tree-2" }, 201),
    jsonResponse({ sha: "new-commit-2" }, 201),
    jsonResponse({ object: { sha: "new-commit-2" } }),
  ];

  const result = await publishAtomic({
    fetchImpl: queuedFetch(responses, requests),
    token: "test-token",
    owner: "LimJaeHwan-real",
    repo: "BlogLim",
    branch: "main",
    publication: publication(),
  });

  assert.equal(result.commitSha, "new-commit-2");
  const updates = requests.filter((request) => request.options.method === "PATCH");
  assert.equal(updates.length, 2);
  updates.forEach((request) => assert.equal(JSON.parse(request.options.body).force, false));
});
