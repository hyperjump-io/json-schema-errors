import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { translations } from "./translations/index.js";
import { Localization } from "./localization.js";

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

  test("unsupported message", () => {
    const localization = Localization.forLocale(fixtureLocale);
    expect(() => localization.getBooleanSchemaErrorMessage()).to.throw(Error);
  });

  test("ltr locale doesn't isolate placeables", () => {
    const localization = Localization.forLocale(ltrFixtureLocale);
    expect(localization.getTypeErrorMessage(["string"])).to.equal("Expected a string");
  });

  test("rtl locale isolates placeables", () => {
    const localization = Localization.forLocale(rtlFixtureLocale);
    expect(localization.getTypeErrorMessage(["string"])).to.equal("Expected a ⁨string⁩");
  });
});
