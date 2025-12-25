import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { jsonSchemaErrors } from "../index.js";
import { Localization } from "../localization.js";

describe("dependentRequired error handler", async () => {
  const schemaUri = "https://example.com/main";
  const localization = await Localization.forLocale("en-US");

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test("required fail", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      required: ["foo", "bar"]
    }, schemaUri);

    const instance = { foo: 42 };
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([
      {
        message: localization.getRequiredErrorMessage(["bar"]),
        instanceLocation: "#",
        schemaLocation: [`${schemaUri}#/required`]
      }
    ]);
  });

  test("required pass", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      required: ["foo"]
    }, schemaUri);

    const instance = { foo: 42 };
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([]);
  });
});
