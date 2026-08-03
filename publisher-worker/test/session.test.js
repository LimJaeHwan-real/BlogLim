import assert from "node:assert/strict";
import test from "node:test";

import { createPkceChallenge, seal, timingSafeEqual, unseal } from "../src/session.js";

const SECRET = "test-only-session-secret-with-more-than-32-characters";

test("sealed sessions round-trip without exposing the payload", async () => {
  const token = await seal({ login: "LimJaeHwan-real", accessToken: "not-a-real-token" }, SECRET, "session");
  assert.equal(token.includes("not-a-real-token"), false);
  assert.deepEqual(await unseal(token, SECRET, "session"), {
    login: "LimJaeHwan-real",
    accessToken: "not-a-real-token",
  });
});

test("sealed values cannot be opened for another purpose", async () => {
  const token = await seal({ state: "abc" }, SECRET, "oauth");
  await assert.rejects(() => unseal(token, SECRET, "session"));
});

test("PKCE challenge and state comparison are deterministic", async () => {
  assert.equal(await createPkceChallenge("verifier"), "iMnq5o6zALKXGivsnlom_0F5_WYda32GHkxlV7mq7hQ");
  assert.equal(timingSafeEqual("same", "same"), true);
  assert.equal(timingSafeEqual("same", "different"), false);
});
