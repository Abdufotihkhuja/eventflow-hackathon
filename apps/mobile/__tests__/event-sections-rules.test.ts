/**
 * Rules the SERVER enforces and the client has to agree with.
 *
 * Each of these once produced a silent failure: a question saved without the
 * options its category requires came back 400, and a badge screen that counted
 * roles wrongly told an organizer their print run was covered when it was not.
 */
import { needsOptions } from "@entities/event-questions";
import { roleCoverage, type BadgeTemplate } from "@entities/event-badges";
import { commentAuthorName, flattenThread, type EventComment } from "@entities/event-comments";

describe("question options rule", () => {
  it("requires options for the categories the validator rejects without them", () => {
    // CLOSED and ALTERNATIVE need options WHATEVER the answer type says — this
    // is the pair that used to 400 on save.
    expect(needsOptions("CLOSED", "TEXT")).toBe(true);
    expect(needsOptions("ALTERNATIVE", "TEXT")).toBe(true);
  });

  it("requires options for pick-one and pick-many answers", () => {
    expect(needsOptions("OPEN", "SELECT")).toBe(true);
    expect(needsOptions("OPEN", "CHECKBOX")).toBe(true);
  });

  it("asks for none where the answer is free-form or absent", () => {
    expect(needsOptions("OPEN", "TEXT")).toBe(false);
    expect(needsOptions("OPEN", "NUMBER")).toBe(false);
    expect(needsOptions("OPEN", "FILE_UPLOAD")).toBe(false);
    expect(needsOptions("RHETORICAL", "TEXT")).toBe(false);
  });
});

describe("badge role coverage", () => {
  const tpl = (role: BadgeTemplate["recipientRole"]): BadgeTemplate =>
    ({ id: String(role), eventId: "e", name: "T", recipientRole: role }) as BadgeTemplate;

  it("reports every role, covered or not", () => {
    const cover = roleCoverage([tpl("PARTICIPANT")]);
    expect(cover).toHaveLength(3);
    expect(cover.find((c) => c.role === "PARTICIPANT")?.covered).toBe(true);
    expect(cover.find((c) => c.role === "SPEAKER")?.covered).toBe(false);
  });

  it("treats an empty template list as nothing covered", () => {
    expect(roleCoverage([]).every((c) => !c.covered)).toBe(true);
  });
});

describe("comment thread", () => {
  const c = (over: Partial<EventComment>): EventComment =>
    ({
      id: "1",
      content: "text",
      eventId: "e",
      userId: null,
      authorOrganizationId: null,
      parentId: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      ...over,
    }) as EventComment;

  it("flattens replies one level under their parent", () => {
    const rows = flattenThread([
      c({ id: "a", replies: [c({ id: "a1", parentId: "a" }), c({ id: "a2", parentId: "a" })] }),
      c({ id: "b" }),
    ]);
    expect(rows.map((r) => [r.comment.id, r.depth])).toEqual([
      ["a", 0],
      ["a1", 1],
      ["a2", 1],
      ["b", 0],
    ]);
  });

  it("handles a comment with no replies key at all", () => {
    expect(flattenThread([c({ id: "a" })])).toHaveLength(1);
  });

  it("names the organization when the author is the event's own team", () => {
    expect(
      commentAuthorName(c({ authorOrganizationId: "o", authorOrganization: { id: "o", companyName: "Test OOO" } })),
    ).toBe("Test OOO");
  });

  it("falls back to a dash rather than printing 'undefined'", () => {
    expect(commentAuthorName(c({}))).toBe("—");
  });
});
