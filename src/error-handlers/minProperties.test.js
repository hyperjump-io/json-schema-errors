import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { jsonSchemaErrors } from "../index.js";
import { Localization } from "../localization.js";

describe("minProperties error handler", async () => {
  const schemaUri = "https://example.com/main";
  const localization = await Localization.forLocale("en-US");

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test("minProperties fail", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      minProperties: 2
    }, schemaUri);

    const instance = { foo: 42 };
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([
      {
        message: localization.getMinPropertiesErrorMessage(2),
        instanceLocation: "#",
        schemaLocations: [`${schemaUri}#/minProperties`]
      }
    ]);
  });

  test("minProperties pass", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      minProperties: 2
    }, schemaUri);

    const instance = { foo: 42, bar: true };
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([]);
  });
});
