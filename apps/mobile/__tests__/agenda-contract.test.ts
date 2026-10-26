/**
 * The agenda's wall-clock contract.
 *
 * The API stores a DAY and a TIME OF DAY, not an instant: a schedule printed
 * for a venue must not move with the reader's timezone. Turning the pair into a
 * `Date` and back is the one mistake that silently shifts a whole conference by
 * an offset, so the conversions are pinned here.
 */
import { clockOf, dayOf, groupByDay, toApiDate, toApiTime, type AgendaItem } from "@entities/agenda";

function item(over: Partial<AgendaItem>): AgendaItem {
  return {
    id: Math.random().toString(36).slice(2),
    title: "Item",
    type: "PRESENTATION",
    date: "2026-08-24",
    startTime: "09:00",
    duration: 60,
    ...over,
  };
}

describe("wall-clock parsing", () => {
  it("takes the clock out of a full ISO instant without converting it", () => {
    // 14:30 stays 14:30 whatever the device's offset is.
    expect(clockOf("2026-08-24T14:30:00.000Z")).toBe("14:30");
  });

  it("accepts a bare HH:MM:SS as well", () => {
    expect(clockOf("14:30:00")).toBe("14:30");
    expect(clockOf("14:30")).toBe("14:30");
  });

  it("survives an empty or unexpected value instead of throwing", () => {
    expect(clockOf("")).toBe("");
    expect(clockOf("nonsense")).toBe("nonsense");
  });

  it("takes the day out of either shape", () => {
    expect(dayOf("2026-08-24")).toBe("2026-08-24");
    expect(dayOf("2026-08-24T00:00:00.000Z")).toBe("2026-08-24");
  });
});

describe("date/time sent back to the API", () => {
  it("writes local calendar parts, not a UTC instant", () => {
    // 00:30 local on the 24th must stay the 24th, even though the same moment
    // is the 23rd in UTC for eastern offsets.
    const d = new Date(2026, 7, 24, 0, 30);
    expect(toApiDate(d)).toBe("2026-08-24");
    expect(toApiTime(d)).toBe("00:30");
  });

  it("pads single digits", () => {
    expect(toApiDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toApiTime(new Date(2026, 0, 5, 9, 5))).toBe("09:05");
  });
});

describe("groupByDay", () => {
  it("groups by calendar day and orders the days", () => {
    const groups = groupByDay([
      item({ date: "2026-08-25", startTime: "10:00", title: "Day two" }),
      item({ date: "2026-08-24", startTime: "09:00", title: "Day one" }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-08-24", "2026-08-25"]);
    expect(groups[0].items[0].title).toBe("Day one");
  });

  it("keeps a single-day event as one group", () => {
    const groups = groupByDay([item({ startTime: "09:00" }), item({ startTime: "11:00" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });

  it("returns nothing for an empty agenda rather than an empty day", () => {
    expect(groupByDay([])).toEqual([]);
  });
});
