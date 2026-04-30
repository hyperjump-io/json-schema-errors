import { beforeAll, afterAll, describe, expect, test } from "vitest";
import { translations } from "./translations/index.js";
import { Localization } from "./localization.js";

describe("Localization", () => {
  const fixtureLocale = "fx-TR";

  beforeAll(() => {
    translations[fixtureLocale] = `test = unsupported locale`;
  });

  afterAll(() => {
    delete translations[fixtureLocale];
  });

  test("unsupported locale", () => {
    expect(() => Localization.forLocale("xx-XX")).to.throw(Error);
  });

  test("unsupported message", () => {
    const localization = Localization.forLocale(fixtureLocale);
    expect(() => localization.getBooleanSchemaErrorMessage()).to.throw(Error);
  });
});
