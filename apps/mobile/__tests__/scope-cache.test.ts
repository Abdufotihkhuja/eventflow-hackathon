import {
  getQueryScopeGeneration,
  queryClient,
  rotateQueryScope,
} from "@shared/api/query-client";

describe("scope cache isolation", () => {
  beforeEach(() => {
    rotateQueryScope("anonymous");
  });

  it("does not expose an organization A cache entry in organization B", () => {
    rotateQueryScope("organization:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    queryClient.setQueryData(["events"], [{ id: "org-a-event" }]);

    rotateQueryScope("organization:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

    expect(queryClient.getQueryData(["events"])).toBeUndefined();
    expect(getQueryScopeGeneration().scope).toBe(
      "organization:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
  });

  it("increments the generation even when the canonical scope is unchanged", () => {
    const before = getQueryScopeGeneration().generation;
    rotateQueryScope("personal");
    const first = getQueryScopeGeneration().generation;
    rotateQueryScope("personal");
    const second = getQueryScopeGeneration().generation;

    expect(first).toBe(before + 1);
    expect(second).toBe(first + 1);
  });
});
