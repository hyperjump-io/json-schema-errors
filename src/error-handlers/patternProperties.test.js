import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { jsonSchemaErrors } from "../index.js";
import { Localization } from "../localization.js";

describe("patternProperties keyword", async () => {
  const schemaUri = "https://example.com/main";
  const localization = await Localization.forLocale("en-US");

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test("patternProperties fail", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      patternProperties: {
        "^a": { type: "number" }
      }
    }, schemaUri);

    const instance = { apple: "foo" };
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#/apple",
        schemaLocations: [`${schemaUri}#/patternProperties/%5Ea/type`]
      }
    ]);
  });

  test("patternProperties on an non-object", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      patternProperties: {
        "^a": { type: "number" }
      }
    }, schemaUri);

    const instance = 42;
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([]);
  });

  test("patternProperties pass", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      patternProperties: {
        "^a": { type: "number" }
      }
    }, schemaUri);

    const instance = { apple: 42 };
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([]);
  });
});
