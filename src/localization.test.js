import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { translations } from "./translations/index.js";
import { addTranslation, Localization } from "./localization.js";

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
});
