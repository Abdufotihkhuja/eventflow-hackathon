import { createNavDedupe } from "@shared/lib/nav-guard";

describe("createNavDedupe", () => {
  it("drops a repeat of the same href inside the window", () => {
    const allow = createNavDedupe(800);
    expect(allow("/event/1", 1000)).toBe(true);
    expect(allow("/event/1", 1200)).toBe(false);
    expect(allow("/event/1", 1799)).toBe(false);
  });

  it("allows the same href again after the window", () => {
    const allow = createNavDedupe(800);
    expect(allow("/event/1", 1000)).toBe(true);
    expect(allow("/event/1", 1801)).toBe(true);
  });

  it("never blocks distinct destinations", () => {
    const allow = createNavDedupe(800);
    expect(allow("/event/1", 1000)).toBe(true);
    expect(allow("/event/2", 1001)).toBe(true);
    expect(allow("/search", 1002)).toBe(true);
  });

  it("re-arms on the blocked attempt's timestamp, not the first tap's", () => {
    const allow = createNavDedupe(800);
    expect(allow("/event/1", 1000)).toBe(true);
    expect(allow("/event/1", 700 + 1000)).toBe(false);
    // window is measured from the last ALLOWED nav — a burst of blocked taps
    // must not extend the lock forever.
    expect(allow("/event/1", 1801)).toBe(true);
  });
});
