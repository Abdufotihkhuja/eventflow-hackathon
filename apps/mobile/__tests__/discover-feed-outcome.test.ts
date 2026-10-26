/**
 * Discover: «молчаливая пустая лента» по городу.
 *
 * Реальный кейс с прода: у опубликованных событий не заполнен город, фильтр
 * `city=Tashkent` отдаёт 0 — и пользователь видел «нет активных событий», не
 * понимая, что виноват фильтр. Правило теперь такое: нулевой результат ПО
 * ГОРОДУ обязан быть перепроверен запросом без города, и пустое состояние
 * показывается только если пусто везде.
 */
import { resolveFeedOutcome, shouldProbeAllRegions, type FeedInput } from "@features/discover-feed/model";

const base: FeedInput = {
  pending: false,
  isError: false,
  count: 0,
  refined: false,
  cityScoped: true,
  fallbackPending: false,
  fallbackCount: 0,
};

describe("shouldProbeAllRegions", () => {
  it("догружает все регионы, когда выбран город и по нему 0", () => {
    expect(shouldProbeAllRegions(base)).toBe(true);
  });

  it("не делает лишний запрос на «все регионы»", () => {
    expect(shouldProbeAllRegions({ ...base, cityScoped: false })).toBe(false);
  });

  it("не делает лишний запрос, пока лента грузится или упала", () => {
    expect(shouldProbeAllRegions({ ...base, pending: true })).toBe(false);
    expect(shouldProbeAllRegions({ ...base, isError: true })).toBe(false);
  });

  it("не делает лишний запрос, когда события по городу есть", () => {
    expect(shouldProbeAllRegions({ ...base, count: 3 })).toBe(false);
  });

  it("не делает лишний запрос при активных фильтрах — там честнее «очистить фильтры»", () => {
    expect(shouldProbeAllRegions({ ...base, refined: true })).toBe(false);
  });
});

describe("resolveFeedOutcome", () => {
  it("город выбран + 0 по городу + есть события без фильтра → fallback", () => {
    expect(resolveFeedOutcome({ ...base, fallbackCount: 2 })).toBe("fallback");
  });

  it("город выбран + 0 везде → пустое состояние", () => {
    expect(resolveFeedOutcome(base)).toBe("empty");
  });

  it("«все регионы» + 0 → пустое состояние без промежуточных шагов", () => {
    const input = { ...base, cityScoped: false };
    expect(resolveFeedOutcome(input)).toBe("empty");
    expect(shouldProbeAllRegions(input)).toBe(false);
  });

  it("есть события по городу → обычная лента", () => {
    expect(resolveFeedOutcome({ ...base, count: 5, fallbackCount: 9 })).toBe("list");
  });

  it("пока идёт догрузка по всем регионам — скелетоны, а не мигающее «пусто»", () => {
    expect(resolveFeedOutcome({ ...base, fallbackPending: true })).toBe("probing");
  });

  it("фильтры важнее fallback: 0 под фильтрами → предложение очистить их", () => {
    expect(resolveFeedOutcome({ ...base, refined: true, fallbackCount: 4 })).toBe("refinedEmpty");
  });

  it("загрузка и ошибка имеют приоритет над всем остальным", () => {
    expect(resolveFeedOutcome({ ...base, pending: true, count: 3 })).toBe("pending");
    expect(resolveFeedOutcome({ ...base, isError: true, fallbackCount: 4 })).toBe("error");
  });
});
