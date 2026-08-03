import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";
import { seal } from "../src/session.js";

const SESSION_SECRET = "test-only-session-secret-with-more-than-32-characters";

function environment() {
  return {
    GITHUB_CLIENT_ID: "client-id",
    GITHUB_CLIENT_SECRET: "client-secret",
    GITHUB_REPOSITORY_ID: "1212419657",
    GITHUB_OWNER: "LimJaeHwan-real",
    GITHUB_REPO: "BlogLim",
    GITHUB_BRANCH: "main",
    ALLOWED_LOGIN: "LimJaeHwan-real",
    ALLOWED_ORIGIN: "https://limjaehwan-real.github.io",
    SITE_BASE_URL: "https://limjaehwan-real.github.io/BlogLim",
    SESSION_ENCRYPTION_KEY: SESSION_SECRET,
  };
}

test("publish endpoint rejects every unapproved Origin before authentication", async () => {
  const request = new Request("https://publisher.example/publish", {
    method: "POST",
    headers: {
      Origin: "https://attacker.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const response = await worker.fetch(request, environment());
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, "INVALID_ORIGIN");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

test("expired encrypted sessions are rejected without calling GitHub", async () => {
  const session = await seal(
    { accessToken: "not-a-token", login: "LimJaeHwan-real", expiresAt: Date.now() - 1000 },
    SESSION_SECRET,
    "session"
  );
  const request = new Request("https://publisher.example/publish", {
    method: "POST",
    headers: {
      Origin: "https://limjaehwan-real.github.io",
      Authorization: "Bearer " + session,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const response = await worker.fetch(request, environment());
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "AUTH_REQUIRED");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://limjaehwan-real.github.io");
});

test("configuration errors never include configured secret values", async () => {
  const env = environment();
  env.GITHUB_CLIENT_ID = "SET_AFTER_CREATING_GITHUB_APP";
  const response = await worker.fetch(new Request("https://publisher.example/unknown"), env);
  const responseText = await response.text();

  assert.equal(response.status, 503);
  assert.equal(responseText.includes(env.GITHUB_CLIENT_SECRET), false);
  assert.equal(responseText.includes(env.SESSION_ENCRYPTION_KEY), false);
  assert.match(responseText, /CONFIGURATION_ERROR/);
});

test("an auth popup receives configuration errors immediately", async () => {
  const env = environment();
  env.GITHUB_CLIENT_ID = "SET_AFTER_CREATING_GITHUB_APP";
  const request = new Request(
    "https://publisher.example/auth/start?return_origin=" + encodeURIComponent(env.ALLOWED_ORIGIN)
  );
  const response = await worker.fetch(request, env);
  const responseText = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Security-Policy"), /nonce-/);
  assert.match(responseText, /bloglim:auth-error/);
  assert.match(responseText, /CONFIGURATION_ERROR/);
  assert.equal(responseText.includes(env.GITHUB_CLIENT_SECRET), false);
});
