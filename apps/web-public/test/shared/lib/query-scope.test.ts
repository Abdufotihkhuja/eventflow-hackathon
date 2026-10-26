import assert from "node:assert/strict";
import test from "node:test";

import {
  getPublicQueryScopeGeneration,
  queryClient,
  rotatePublicQueryScope,
} from "../../../src/shared/lib/queryClient";

queryClient.setDefaultOptions({
  queries: {
    ...queryClient.getDefaultOptions().queries,
    gcTime: Infinity,
  },
});

test.afterEach(() => {
  queryClient.clear();
});

void test("public cache rotates scope and generation even for the same scope", () => {
  const before = getPublicQueryScopeGeneration();
  rotatePublicQueryScope("personal");
  const first = getPublicQueryScopeGeneration();
  rotatePublicQueryScope("personal");
  const second = getPublicQueryScopeGeneration();

  assert.equal(first.scope, "personal");
  assert.equal(first.generation, before.generation + 1);
  assert.equal(second.generation, first.generation + 1);
});

void test("late public response from scope A cannot populate scope B", async () => {
  let release!: (value: string) => void;
  const delayed = new Promise<string>((resolve) => {
    release = resolve;
  });
  const request = queryClient.fetchQuery({
    queryKey: ["profile"],
    queryFn: () => delayed,
  });

  await Promise.resolve();
  rotatePublicQueryScope("anonymous");
  release("scope-a");
  await assert.rejects(
    request,
    (error: Error) => error.message === "CancelledError"
  );

  assert.equal(queryClient.getQueryData(["profile"]), undefined);
});

void test("public scope rotation clears optimistic mutations", () => {
  queryClient.getMutationCache().build(queryClient, {
    mutationKey: ["profile", "update"],
    mutationFn: async () => "ok",
  });
  assert.equal(queryClient.getMutationCache().getAll().length, 1);

  rotatePublicQueryScope("personal");

  assert.equal(queryClient.getMutationCache().getAll().length, 0);
});
