import { pluralCategory } from "../shared/i18n/plurals";
import { STRINGS } from "../shared/i18n/strings";
import type { Lang } from "../shared/data/events";

const LANGS: Lang[] = ["uz", "ru", "en"];

describe("i18n catalog", () => {
  it("has uz / ru / en for every UI string", () => {
    for (const record of Object.values(STRINGS)) {
      for (const lang of LANGS) {
        expect(typeof record[lang]).toBe("string");
        expect(record[lang].length).toBeGreaterThan(0);
      }
    }
  });
});

describe("pluralCategory", () => {
  it("applies Russian one/few/many rules", () => {
    expect(pluralCategory("ru", 1)).toBe("one");
    expect(pluralCategory("ru", 21)).toBe("one");
    expect(pluralCategory("ru", 2)).toBe("few");
    expect(pluralCategory("ru", 23)).toBe("few");
    expect(pluralCategory("ru", 5)).toBe("many");
    expect(pluralCategory("ru", 11)).toBe("many");
    expect(pluralCategory("ru", 0)).toBe("many");
  });

  it("uses one/other for English and a single form for Uzbek", () => {
    expect(pluralCategory("en", 1)).toBe("one");
    expect(pluralCategory("en", 2)).toBe("other");
    expect(pluralCategory("uz", 1)).toBe("other");
    expect(pluralCategory("uz", 5)).toBe("other");
  });
});
