const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function importSessionKey(secret) {
  if (!secret || String(secret).length < 32) {
    throw new Error("SESSION_ENCRYPTION_KEY must contain at least 32 characters");
  }

  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(secret)));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function createPkceChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function seal(value, secret, purpose) {
  const key = await importSessionKey(secret);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: encoder.encode("bloglim:" + purpose + ":v1"),
    },
    key,
    encoder.encode(JSON.stringify(value))
  );

  return "v1." + bytesToBase64Url(iv) + "." + bytesToBase64Url(new Uint8Array(encrypted));
}

export async function unseal(token, secret, purpose) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    throw new Error("Invalid sealed value");
  }

  const key = await importSessionKey(secret);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64UrlToBytes(parts[1]),
      additionalData: encoder.encode("bloglim:" + purpose + ":v1"),
    },
    key,
    base64UrlToBytes(parts[2])
  );

  return JSON.parse(decoder.decode(decrypted));
}

export function readCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator === -1) {
      continue;
    }
    if (cookie.slice(0, separator).trim() === name) {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    }
  }
  return "";
}

export function oauthCookie(value, maxAgeSeconds) {
  return [
    "__Host-bloglim-oauth=" + encodeURIComponent(value),
    "Path=/",
    "Max-Age=" + String(maxAgeSeconds),
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}

export function clearOauthCookie() {
  return "__Host-bloglim-oauth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax";
}

export function timingSafeEqual(left, right) {
  const first = String(left || "");
  const second = String(right || "");
  let mismatch = first.length ^ second.length;
  const length = Math.max(first.length, second.length);

  for (let index = 0; index < length; index += 1) {
    mismatch |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
