import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { jsonSchemaErrors } from "../index.js";
import { Localization } from "../localization.js";

describe("maximum error handler", async () => {
  const schemaUri = "https://example.com/main";
  const localization = await Localization.forLocale("en-US");

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test("maximum fail", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      maximum: 3
    }, schemaUri);

    const instance = 4;
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([
      {
        message: localization.getMaximumErrorMessage(3),
        instanceLocation: "#",
        schemaLocation: `${schemaUri}#/maximum`
      }
    ]);
  });

  test("maximum pass", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      maximum: 3
    }, schemaUri);

    const instance = 3;
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([]);
  });
});
