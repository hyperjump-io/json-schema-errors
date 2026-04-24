import { describe, expect, test } from "vitest";
import { Localization } from "./localization.js";

describe("Localization", () => {
  const fixtureLocale = "fx-TR";

  test("unsupported locale", () => {
    expect(() => Localization.forLocale("xx-XX")).to.throw(Error);
  });

  test("unsupported message", () => {
    const localization = Localization.forLocale(fixtureLocale);
    expect(() => localization.getBooleanSchemaErrorMessage()).to.throw(Error);
  });
});
