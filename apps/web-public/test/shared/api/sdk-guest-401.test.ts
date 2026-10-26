/**
 * Регрессия: гость, открывший публичную страницу (событие, статья), не должен
 * улетать на /login из-за одного 401 от защищённого эндпоинта.
 *
 * До фикса CommentsSection безусловно дёргал GET /api/v1/session/me
 * (JwtAuthGuard → 401 для анонима), а транспорт на любой 401 делал
 * window.location.replace("/login") — страница события «мигала» и закрывалась.
 */

import assert from "node:assert/strict";
import test from "node:test";

import type { accountSdk as AccountSdkInstance } from "../../../src/shared/api/sdk";

const store = new Map<string, string>();
const storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};

let replacedWith: string | null = null;
const documentStub = { cookie: "" };

// Транспорт читает window/localStorage/document на модульном уровне и по ходу
// запроса, поэтому заглушки ставим до импорта модуля.
Object.assign(globalThis as unknown as Record<string, unknown>, {
  localStorage: storage,
  sessionStorage: storage,
  document: documentStub,
  window: {
    localStorage: storage,
    sessionStorage: storage,
    location: {
      pathname: "/events/tech-conference-2025",
      replace: (url: string) => {
        replacedWith = url;
      },
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
  fetch: () =>
    Promise.resolve(
      new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    ),
});

let accountSdkPromise: Promise<typeof AccountSdkInstance> | null = null;

function loadAccountSdk(): Promise<typeof AccountSdkInstance> {
  accountSdkPromise ??= import("../../../src/shared/api/sdk").then(
    (mod) => mod.accountSdk
  );
  return accountSdkPromise;
}

test.beforeEach(() => {
  store.clear();
  replacedWith = null;
  documentStub.cookie = "";
});

void test("401 for a guest does not kick them to /login", async () => {
  const accountSdk = await loadAccountSdk();

  await assert.rejects(() => accountSdk.session.getMe());

  assert.equal(
    replacedWith,
    null,
    "гостя нельзя уводить с публичной страницы: сессии, которая могла истечь, у него нет"
  );
});

void test("401 for a real session still ends in /login", async () => {
  const accountSdk = await loadAccountSdk();
  store.set("authToken", "expired-access-token");

  await assert.rejects(() => accountSdk.session.getMe());

  assert.equal(replacedWith, "/login");
});
