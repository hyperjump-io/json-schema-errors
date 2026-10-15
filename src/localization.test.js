import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { translations } from "./translations/index.js";
import { addTranslation, Localization } from "./localization.js";
import { FluentNumber } from "@fluent/bundle";

describe("Localization", () => {
  const fixtureLocale = "fx-TR";
  const ltrFixtureLocale = "fx-LT";
  const rtlFixtureLocale = "fx-RT";

  beforeAll(() => {
    translations[fixtureLocale] = { ftl: `test = unsupported locale`, direction: "ltr" };
    translations[ltrFixtureLocale] = { ftl: `type-message = Expected a {$expectedTypes}`, direction: "ltr" };
    translations[rtlFixtureLocale] = { ftl: `type-message = Expected a {$expectedTypes}`, direction: "rtl" };
  });

  afterAll(() => {
    delete translations[fixtureLocale];
    delete translations[ltrFixtureLocale];
    delete translations[rtlFixtureLocale];
  });

  test("unsupported locale", () => {
    expect(() => Localization.forLocale("xx-XX")).to.throw(Error);
  });

  test("untranslated message falls back to en-US", () => {
    const localization = Localization.forLocale(fixtureLocale);
    expect(localization.getBooleanSchemaErrorMessage()).to.equal(Localization.forLocale("en-US").getBooleanSchemaErrorMessage());
  });

  test("unsupported message", () => {
    const localization = Localization.forLocale(fixtureLocale);
    expect(() => localization.format("fx-unsupported-message")).to.throw(Error);
  });

  test("ltr locale doesn't isolate placeables", () => {
    const localization = Localization.forLocale(ltrFixtureLocale);
    expect(localization.getTypeErrorMessage(["string"])).to.equal("Expected a string");
  });

  test("rtl locale isolates placeables", () => {
    const localization = Localization.forLocale(rtlFixtureLocale);
    expect(localization.getTypeErrorMessage(["string"])).to.equal("Expected a ⁨string⁩");
  });

  describe("addTranslation", () => {
    test("adds messages to an existing locale", () => {
      addTranslation("en-US", `fx-greeting-message = Hello {$name}`);
      expect(Localization.forLocale("en-US").format("fx-greeting-message", { name: "World" })).to.equal("Hello World");
    });

    test("replaces messages with the same id", () => {
      addTranslation("fx-RP", `fx-replaced-message = Original`);
      addTranslation("fx-RP", `fx-replaced-message = Replaced`);
      expect(Localization.forLocale("fx-RP").format("fx-replaced-message")).to.equal("Replaced");
    });

    test("adds messages to a locale after it's used", () => {
      const localization = Localization.forLocale(ltrFixtureLocale);
      addTranslation(ltrFixtureLocale, `fx-later-message = Added later`);
      expect(localization.format("fx-later-message")).to.equal("Added later");
    });

    test("adds a new locale", () => {
      addTranslation("fx-NW", `type-message = New {$expectedTypes}`);
      expect(Localization.forLocale("fx-NW").getTypeErrorMessage(["string"])).to.equal("New string");
    });

    test("adds a new rtl locale", () => {
      addTranslation("fx-NR", `type-message = New {$expectedTypes}`, { direction: "rtl" });
      expect(Localization.forLocale("fx-NR").getTypeErrorMessage(["string"])).to.equal("New ⁨string⁩");
    });
  });

  describe("formatRequirement", () => {
    beforeAll(() => {
      addTranslation("en-US", `
fx-keyword-success-message = Passes {$value}
fx-keyword-negated-message = Fails {$value}
`);
    });

    test("describes what the keyword requires", () => {
      const localization = Localization.forLocale("en-US");
      expect(localization.formatRequirement("fx-keyword", { value: 1 })).to.equal("Passes 1");
    });

    test("describes what makes the keyword fail when negated", () => {
      const localization = Localization.forLocale("en-US").negated();
      expect(localization.formatRequirement("fx-keyword", { value: 1 })).to.equal("Fails 1");
    });
  });

  test("lists", () => {
    const localization = Localization.forLocale("en-US");
    expect(localization.or(["a", "b", "c"])).to.equal("a, b, or c");
    expect(localization.and(["a", "b", "c"])).to.equal("a, b, and c");
  });

  describe("numeric formatting", () => {
    beforeAll(() => {
      for (const locale of ["en-US", "de-DE", "ar-EG"]) {
        addTranslation(locale, `
fx-number = {$value}
fx-number-explicit = {NUMBER($value, maximumFractionDigits: 2)}
fx-number-significant = {NUMBER($value, maximumSignificantDigits: 3)}
fx-number-select = {$value ->
  [0] zero
  [1] exactly one
  [one] singular
 *[other] plural
}
`);
      }
    });

    test("retains significant digits across the finite number range", () => {
      const localization = Localization.forLocale("en-US");
      for (const value of [0, -1e-7, 2.5e-8, 1.2345678901234567, 1.0000000000000002, Number.MIN_VALUE, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER, 1000000000000000100]) {
        const formatted = localization.format("fx-number", { value });
        expect.soft(Number(formatted.replaceAll(",", "")), formatted).to.equal(value);
      }
    });

    test.each([
      { locale: "de-DE", small: "0,000000025", large: "1.234,56789" },
      { locale: "ar-EG", small: "٠٫٠٠٠٠٠٠٠٢٥", large: "١٬٢٣٤٫٥٦٧٨٩" }
    ])("preserves $locale digits, separators, and grouping", ({ locale, small, large }) => {
      const localization = Localization.forLocale(locale);
      expect.soft(localization.format("fx-number", { value: 2.5e-8 })).to.equal(small);
      expect.soft(localization.format("fx-number", { value: 1234.56789 })).to.equal(large);
    });

    test("preserves explicit Fluent formatting and numeric selectors", () => {
      const localization = Localization.forLocale("de-DE");
      expect(localization.format("fx-number-explicit", { value: 1234.56789 })).to.equal("1.234,57");
      expect(localization.format("fx-number-significant", { value: 1234.56789 })).to.equal("1.230");
      const args = { value: new FluentNumber(1.2, { minimumFractionDigits: 2 }) };
      expect(localization.format("fx-number", args)).to.equal("1,20");
      for (const [value, expected] of [[0, "zero"], [1, "exactly one"], [1.0001, "singular"], [2, "plural"]]) {
        expect(localization.format("fx-number-select", { value })).to.equal(expected);
      }
    });
  });
});
