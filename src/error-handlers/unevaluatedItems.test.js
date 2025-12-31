import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { jsonSchemaErrors } from "../index.js";
import { Localization } from "../localization.js";

describe("unevaluatedItems keyword", async () => {
  const schemaUri = "https://example.com/main";
  const localization = await Localization.forLocale("en-US");

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test("unevaluatedItems with false schema", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      allOf: [
        {
          prefixItems: [{ type: "number" }]
        }
      ],
      unevaluatedItems: false
    }, schemaUri);

    const instance = [42, "foo"];
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([
      {
        message: localization.getBooleanSchemaErrorMessage(),
        instanceLocation: "#/1",
        schemaLocations: [`${schemaUri}#/unevaluatedItems`]
      }
    ]);
  });

  test("unevaluatedItems with object schema", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      allOf: [
        {
          prefixItems: [{ type: "number" }]
        }
      ],
      unevaluatedItems: { type: "number" }
    }, schemaUri);

    const instance = [42, "foo"];
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#/1",
        schemaLocations: [`${schemaUri}#/unevaluatedItems/type`]
      }
    ]);
  });

  test("unevaluatedItems with contains", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      allOf: [
        {
          contains: { type: "string" }
        }
      ],
      unevaluatedItems: { type: "number" }
    }, schemaUri);

    const instance = [42, "foo", true];
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#/2",
        schemaLocations: [`${schemaUri}#/unevaluatedItems/type`]
      }
    ]);
  });

  test("unevaluatedItems on a non-array", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      allOf: [
        {
          prefixItems: [{ type: "number" }]
        }
      ],
      unevaluatedItems: { type: "string" }
    }, schemaUri);

    const instance = 42;
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([]);
  });

  test("unevaluatedItems pass", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      allOf: [
        {
          prefixItems: [{ type: "number" }]
        }
      ],
      unevaluatedItems: { type: "string" }
    }, schemaUri);

    const instance = [42, "foo"];
    const output = await validate(schemaUri, instance, BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, instance);

    expect(errors).to.eql([]);
  });
});
