import { preparePublication, PublisherError } from "./domain.js";
import { publishAtomic } from "./github.js";
import {
  clearOauthCookie,
  createPkceChallenge,
  oauthCookie,
  randomToken,
  readCookie,
  seal,
  timingSafeEqual,
  unseal,
} from "./session.js";

const OAUTH_COOKIE = "__Host-bloglim-oauth";
const OAUTH_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_REQUEST_BYTES = 15 * 1024 * 1024;

function config(env) {
  const required = [
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "GITHUB_REPOSITORY_ID",
    "GITHUB_OWNER",
    "GITHUB_REPO",
    "GITHUB_BRANCH",
    "ALLOWED_LOGIN",
    "ALLOWED_ORIGIN",
    "SITE_BASE_URL",
    "SESSION_ENCRYPTION_KEY",
  ];

  for (const key of required) {
    if (!env[key] || String(env[key]).startsWith("SET_")) {
      throw new PublisherError("CONFIGURATION_ERROR", "게시 서버 설정이 완료되지 않았습니다.", 503);
    }
  }

  if (String(env.SESSION_ENCRYPTION_KEY).length < 32) {
    throw new PublisherError("CONFIGURATION_ERROR", "세션 암호화 설정이 올바르지 않습니다.", 503);
  }

  return {
    clientId: String(env.GITHUB_CLIENT_ID),
    clientSecret: String(env.GITHUB_CLIENT_SECRET),
    repositoryId: String(env.GITHUB_REPOSITORY_ID),
    owner: String(env.GITHUB_OWNER),
    repo: String(env.GITHUB_REPO),
    branch: String(env.GITHUB_BRANCH),
    allowedLogin: String(env.ALLOWED_LOGIN),
    allowedOrigin: String(env.ALLOWED_ORIGIN).replace(/\/$/, ""),
    siteBaseUrl: String(env.SITE_BASE_URL).replace(/\/$/, ""),
    sessionSecret: String(env.SESSION_ENCRYPTION_KEY),
  };
}

function baseHeaders() {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function corsHeaders(request, settings) {
  const origin = request.headers.get("Origin");
  if (origin !== settings.allowedOrigin) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": settings.allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function json(request, settings, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...baseHeaders(),
      ...corsHeaders(request, settings),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function errorJson(request, settings, error) {
  const safeError = error instanceof PublisherError
    ? error
    : new PublisherError("GITHUB_ERROR", "게시 중 오류가 발생했습니다.", 500);
  return json(request, settings, { error: { code: safeError.code, message: safeError.message } }, safeError.status);
}

function assertOrigin(request, settings) {
  if (request.headers.get("Origin") !== settings.allowedOrigin) {
    throw new PublisherError("INVALID_ORIGIN", "허용되지 않은 페이지에서 보낸 요청입니다.", 403);
  }
}

function callbackUrl(request) {
  const url = new URL(request.url);
  return url.origin + "/auth/callback";
}

async function handleAuthStart(request, settings) {
  const url = new URL(request.url);
  const returnOrigin = String(url.searchParams.get("return_origin") || "").replace(/\/$/, "");
  if (returnOrigin !== settings.allowedOrigin) {
    throw new PublisherError("INVALID_ORIGIN", "허용되지 않은 로그인 요청입니다.", 403);
  }

  const state = randomToken(32);
  const verifier = randomToken(48);
  const challenge = await createPkceChallenge(verifier);
  const sealedCookie = await seal(
    { state, verifier, expiresAt: Date.now() + OAUTH_TTL_MS },
    settings.sessionSecret,
    "oauth"
  );
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", settings.clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl(request));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("login", settings.allowedLogin);
  authorizeUrl.searchParams.set("allow_signup", "false");
  authorizeUrl.searchParams.set("prompt", "select_account");

  return new Response(null, {
    status: 302,
    headers: {
      ...baseHeaders(),
      Location: authorizeUrl.toString(),
      "Set-Cookie": oauthCookie(sealedCookie, OAUTH_TTL_MS / 1000),
    },
  });
}

async function exchangeCode(request, settings, code, verifier) {
  const form = new URLSearchParams({
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    code,
    redirect_uri: callbackUrl(request),
    code_verifier: verifier,
    repository_id: settings.repositoryId,
  });
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) {
    throw new PublisherError("AUTH_REQUIRED", "GitHub 로그인에 실패했습니다.", 401);
  }
  return String(result.access_token);
}

async function githubIdentity(token, settings) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "BlogLim-Secure-Publisher",
  };
  const userResponse = await fetch("https://api.github.com/user", { headers });
  if (!userResponse.ok) {
    throw new PublisherError("AUTH_REQUIRED", "GitHub 로그인을 확인할 수 없습니다.", 401);
  }
  const user = await userResponse.json();
  if (String(user.login || "").toLowerCase() !== settings.allowedLogin.toLowerCase()) {
    throw new PublisherError("FORBIDDEN_USER", "허용된 GitHub 계정이 아닙니다.", 403);
  }

  const repoResponse = await fetch(
    "https://api.github.com/repos/" + encodeURIComponent(settings.owner) + "/" + encodeURIComponent(settings.repo),
    { headers }
  );
  const repository = await repoResponse.json().catch(() => ({}));
  if (!repoResponse.ok || !repository.permissions || repository.permissions.push !== true) {
    throw new PublisherError("FORBIDDEN_USER", "BlogLim 저장소 게시 권한을 확인할 수 없습니다.", 403);
  }
  return String(user.login);
}

async function revokeAccessToken(accessToken, settings) {
  if (!accessToken) {
    return;
  }

  const basic = btoa(settings.clientId + ":" + settings.clientSecret);
  await fetch("https://api.github.com/applications/" + encodeURIComponent(settings.clientId) + "/token", {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Basic " + basic,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "BlogLim-Secure-Publisher",
    },
    body: JSON.stringify({ access_token: accessToken }),
  }).catch(() => null);
}

function popupHtml(message, targetOrigin, nonce) {
  const safeMessage = JSON.stringify(message).replace(/</g, "\\u003c");
  const safeOrigin = JSON.stringify(targetOrigin).replace(/</g, "\\u003c");
  return "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>GitHub 로그인</title></head>" +
    "<body><p>GitHub 인증을 처리했습니다. 이 창은 자동으로 닫힙니다.</p>" +
    "<script nonce=\"" + nonce + "\">if(window.opener){window.opener.postMessage(" + safeMessage + "," + safeOrigin + ");window.close();}else{document.body.textContent='로그인 결과를 전달하지 못했습니다(opener 연결 끊김). 창을 닫고 다시 시도해 주세요.';}</script>" +
    "</body></html>";
}

async function popupResponse(message, settings) {
  const nonce = randomToken(18);
  return new Response(popupHtml(message, settings.allowedOrigin, nonce), {
    status: 200,
    headers: {
      ...baseHeaders(),
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'nonce-" + nonce + "'; style-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      // Cross-Origin-Opener-Policy를 두지 않는다.
      // 이 페이지는 opener(글쓰기 화면)에게 세션을 postMessage로 넘기는 것이 유일한 목적인데,
      // COOP는 교차 출처 opener와의 연결을 끊어 window.opener를 null로 만든다.
      "Set-Cookie": clearOauthCookie(),
    },
  });
}

async function handleAuthCallback(request, settings) {
  let accessToken = "";
  try {
    const url = new URL(request.url);
    if (url.searchParams.get("error")) {
      throw new PublisherError("AUTH_REQUIRED", "GitHub 로그인이 취소됐습니다.", 401);
    }

    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    const cookie = readCookie(request, OAUTH_COOKIE);
    if (!code || !returnedState || !cookie) {
      throw new PublisherError("AUTH_REQUIRED", "GitHub 로그인 정보를 확인할 수 없습니다.", 401);
    }

    const oauth = await unseal(cookie, settings.sessionSecret, "oauth");
    if (oauth.expiresAt < Date.now() || !timingSafeEqual(oauth.state, returnedState)) {
      throw new PublisherError("AUTH_REQUIRED", "GitHub 로그인 요청이 만료됐습니다.", 401);
    }

    accessToken = await exchangeCode(request, settings, code, oauth.verifier);
    const login = await githubIdentity(accessToken, settings);
    const session = await seal(
      { accessToken, login, expiresAt: Date.now() + SESSION_TTL_MS },
      settings.sessionSecret,
      "session"
    );
    return popupResponse({ type: "bloglim:auth", session, login }, settings);
  } catch (error) {
    await revokeAccessToken(accessToken, settings);
    const code = error instanceof PublisherError ? error.code : "AUTH_REQUIRED";
    return popupResponse({ type: "bloglim:auth-error", code }, settings);
  }
}

async function readSession(request, settings) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    throw new PublisherError("AUTH_REQUIRED", "GitHub 로그인이 필요합니다.", 401);
  }

  try {
    const session = await unseal(authorization.slice(7), settings.sessionSecret, "session");
    if (!session.accessToken || session.expiresAt < Date.now() || String(session.login).toLowerCase() !== settings.allowedLogin.toLowerCase()) {
      throw new Error("Expired session");
    }
    return session;
  } catch (error) {
    throw new PublisherError("AUTH_REQUIRED", "GitHub 로그인이 만료됐습니다.", 401);
  }
}

async function handlePublish(request, settings) {
  assertOrigin(request, settings);
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    throw new PublisherError("INVALID_INPUT", "게시 요청 용량이 너무 큽니다.", 413);
  }

  const session = await readSession(request, settings);
  let payload;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_REQUEST_BYTES) {
      throw new PublisherError("INVALID_INPUT", "게시 요청 용량이 너무 큽니다.", 413);
    }
    payload = JSON.parse(rawBody);
  } catch (error) {
    if (error instanceof PublisherError) {
      throw error;
    }
    throw new PublisherError("INVALID_INPUT", "게시 요청이 올바르지 않습니다.");
  }
  const publication = preparePublication(payload);
  const commit = await publishAtomic({
    token: session.accessToken,
    owner: settings.owner,
    repo: settings.repo,
    branch: settings.branch,
    publication,
  });

  return json(request, settings, {
    commitSha: commit.commitSha,
    commitUrl: commit.commitUrl,
    postPath: publication.postPath,
    publicUrl: settings.siteBaseUrl + "/" + encodeURIComponent(publication.slug) + "/",
  }, 201);
}

async function handleLogout(request, settings) {
  assertOrigin(request, settings);
  let session;
  try {
    session = await readSession(request, settings);
  } catch (error) {
    return new Response(null, { status: 204, headers: { ...baseHeaders(), ...corsHeaders(request, settings) } });
  }

  await revokeAccessToken(session.accessToken, settings);

  return new Response(null, { status: 204, headers: { ...baseHeaders(), ...corsHeaders(request, settings) } });
}

export default {
  async fetch(request, env) {
    let settings;
    try {
      settings = config(env);
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        assertOrigin(request, settings);
        return new Response(null, { status: 204, headers: { ...baseHeaders(), ...corsHeaders(request, settings) } });
      }
      if (request.method === "GET" && url.pathname === "/auth/start") {
        return await handleAuthStart(request, settings);
      }
      if (request.method === "GET" && url.pathname === "/auth/callback") {
        return await handleAuthCallback(request, settings);
      }
      if (request.method === "POST" && url.pathname === "/publish") {
        return await handlePublish(request, settings);
      }
      if (request.method === "POST" && url.pathname === "/logout") {
        return await handleLogout(request, settings);
      }
      return json(request, settings, { error: { code: "NOT_FOUND", message: "요청한 경로를 찾을 수 없습니다." } }, 404);
    } catch (error) {
      if (!settings) {
        const fallback = {
          allowedOrigin: String(env.ALLOWED_ORIGIN || "").replace(/\/$/, ""),
        };
        const url = new URL(request.url);
        const returnOrigin = String(url.searchParams.get("return_origin") || "").replace(/\/$/, "");
        if (request.method === "GET" && url.pathname === "/auth/start" && returnOrigin && returnOrigin === fallback.allowedOrigin) {
          const code = error instanceof PublisherError ? error.code : "CONFIGURATION_ERROR";
          return await popupResponse({ type: "bloglim:auth-error", code }, fallback);
        }
        return errorJson(request, fallback, error);
      }
      return errorJson(request, settings, error);
    }
  },
};
