import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { jsonSchemaErrors } from "../index.js";
import { Localization } from "../localization.js";

describe("exclusiveMaximum error handler", async () => {
  const schemaUri = "https://example.com/main";
  const localization = await Localization.forLocale("en-US");

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test("exclusiveMaximum fail", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      exclusiveMaximum: 3
    }, schemaUri);

    const instance = 3;
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([
      {
        message: localization.getExclusiveMaximumErrorMessage(3),
        instanceLocation: "#",
        schemaLocation: `${schemaUri}#/exclusiveMaximum`
      }
    ]);
  });

  test("exclusiveMaximum pass", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      exclusiveMaximum: 3
    }, schemaUri);

    const instance = 2;
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([]);
  });
});
