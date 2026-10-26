/**
 * Регрессия: мутации через SDK на публичном сайте не должны падать с
 * 403 WEB_CSRF_REJECTED.
 *
 * Кука `ef_csrf` host-only на домене API (api.eventflow.uz), поэтому со
 * страницы eventflow.uz она в `document.cookie` не видна. До фикса транспорт
 * SDK читал только куку — и PATCH /account/me (кнопка «Завершить регистрацию»
 * после OAuth) уходил без заголовка, получая 403.
 */

import assert from "node:assert/strict";
import test from "node:test";

import type { accountSdk as AccountSdkInstance } from "../../../src/shared/api/sdk";

interface RecordedRequest {
  url: string;
  method: string;
  csrf: string | null;
}

const store = new Map<string, string>();
const storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};

const documentStub = { cookie: "" };
const requests: RecordedRequest[] = [];
/** Ответ на очередной вызов fetch; выставляется каждым тестом. */
let respond: (request: RecordedRequest) => Response = () =>
  new Response("{}", { status: 200 });

// Транспорт читает window/localStorage/document на модульном уровне и по ходу
// запроса, поэтому заглушки ставим до импорта модуля.
Object.assign(globalThis as unknown as Record<string, unknown>, {
  localStorage: storage,
  sessionStorage: storage,
  document: documentStub,
  window: {
    localStorage: storage,
    sessionStorage: storage,
    location: { pathname: "/complete-profile", replace: () => undefined },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
  fetch: (url: string, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const recorded: RecordedRequest = {
      url,
      method: init?.method ?? "GET",
      csrf: headers["X-CSRF-Token"] ?? null,
    };
    requests.push(recorded);
    return Promise.resolve(respond(recorded));
  },
});

let accountSdkPromise: Promise<typeof AccountSdkInstance> | null = null;

function loadAccountSdk(): Promise<typeof AccountSdkInstance> {
  accountSdkPromise ??= import("../../../src/shared/api/sdk").then(
    (mod) => mod.accountSdk
  );
  return accountSdkPromise;
}

function csrfRejected(): Response {
  return new Response(
    JSON.stringify({
      statusCode: 403,
      code: "WEB_CSRF_REJECTED",
      message: "Web session request отклонён",
    }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

test.beforeEach(() => {
  store.clear();
  requests.length = 0;
  documentStub.cookie = "";
});

void test("CSRF token falls back to sessionStorage when the cookie is on another host", async () => {
  const accountSdk = await loadAccountSdk();
  store.set("auth.webCsrf", "nonce.signature");
  respond = () =>
    new Response(JSON.stringify({ id: "u1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  await accountSdk.account.updateMe({ firstName: "Azizbek" } as never);

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0]?.csrf,
    "nonce.signature",
    "заголовок берётся из sessionStorage, когда кука недоступна из document.cookie"
  );
});

void test("403 WEB_CSRF_REJECTED re-issues the token and retries once", async () => {
  const accountSdk = await loadAccountSdk();
  respond = (request) => {
    if (request.url.endsWith("/api/v1/auth/web/csrf")) {
      return new Response(JSON.stringify({ csrfToken: "fresh.token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return request.csrf === "fresh.token"
      ? new Response(JSON.stringify({ id: "u1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      : csrfRejected();
  };

  await accountSdk.account.updateMe({ firstName: "Azizbek" } as never);

  assert.deepEqual(
    requests.map((r) => `${r.method} ${r.url}`),
    [
      "PATCH /api/v1/account/me",
      "GET /api/v1/auth/web/csrf",
      "PATCH /api/v1/account/me",
    ]
  );
  assert.equal(store.get("auth.webCsrf"), "fresh.token");
});

void test("a second 403 is not retried again", async () => {
  const accountSdk = await loadAccountSdk();
  respond = (request) =>
    request.url.endsWith("/api/v1/auth/web/csrf")
      ? new Response(JSON.stringify({ csrfToken: "fresh.token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      : csrfRejected();

  await assert.rejects(() =>
    accountSdk.account.updateMe({ firstName: "Azizbek" } as never)
  );

  assert.equal(
    requests.filter((r) => r.method === "PATCH").length,
    2,
    "ровно одна повторная попытка — иначе цикл при действительно битой сессии"
  );
});
