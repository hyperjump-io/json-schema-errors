import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { jsonSchemaErrors } from "../index.js";
import { Localization } from "../localization.js";

describe("anyOf error handler", async () => {
  const schemaUri = "https://example.com/main";
  const localization = await Localization.forLocale("en-US");

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test("anyOf fail", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      anyOf: [
        { type: "string" },
        { type: "number" }
      ]
    }, schemaUri);

    const instance = null;
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([
      {
        message: localization.getAnyOfErrorMessage(),
        alternatives: [
          [
            {
              message: localization.getTypeErrorMessage(["string"]),
              instanceLocation: "#",
              schemaLocations: [`${schemaUri}#/anyOf/0/type`]
            }
          ],
          [
            {
              message: localization.getTypeErrorMessage(["number"]),
              instanceLocation: "#",
              schemaLocations: [`${schemaUri}#/anyOf/1/type`]
            }
          ]
        ],
        instanceLocation: "#",
        schemaLocations: [`${schemaUri}#/anyOf`]
      }
    ]);
  });

  test("anyOf pass", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      anyOf: [
        { type: "string" },
        { type: "number" }
      ]
    }, schemaUri);

    const instance = 42;
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([]);
  });
});
