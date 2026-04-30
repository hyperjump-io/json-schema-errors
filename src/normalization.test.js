import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema } from "@hyperjump/json-schema/draft-2020-12";
import { jsonSchemaErrors } from "./index.js";
import { Localization } from "./localization.js";

/**
 * @import { OutputFormat } from "./index.js";
 */

describe("Normalization", () => {
  const schemaUri = "https://example.com/main";
  const localization = Localization.forLocale("en-US");

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test("passing schema", async () => {
    const schemaUri = "https://example.com/main";
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "number"
    }, schemaUri);

    const instance = 42;

    /** @type OutputFormat */
    const output = {
      valid: true
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([]);
  });

  test("output with absoluteKeywordLocation", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "number"
    }, schemaUri);

    const instance = "foo";

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          absoluteKeywordLocation: `${schemaUri}#/type`,
          instanceLocation: "#"
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#",
        schemaLocations: [`${schemaUri}#/type`]
      }
    ]);
  });

  test("output with keywordLocation", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "number"
    }, schemaUri);

    const instance = "foo";

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          keywordLocation: "/type",
          instanceLocation: "#"
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#",
        schemaLocations: [`${schemaUri}#/type`]
      }
    ]);
  });

  test("output with keywordLocation with leading #", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "number"
    }, schemaUri);

    const instance = "foo";

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          keywordLocation: "#/type",
          instanceLocation: "#"
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#",
        schemaLocations: [`${schemaUri}#/type`]
      }
    ]);
  });

  test("output with keywordLocation crossing a $ref", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        foo: { $ref: "#/$defs/number" }
      },
      $defs: {
        number: { type: "number" }
      }
    }, schemaUri);

    const instance = { foo: "bar" };

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          keywordLocation: "/properties/foo/$ref/type",
          instanceLocation: "#/foo"
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#/foo",
        schemaLocations: [`${schemaUri}#/$defs/number/type`]
      }
    ]);
  });

  test("output node without an keywordLocation or absoluteKeywordLocation", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "number"
    }, schemaUri);

    const instance = 0;

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          instanceLocation: "#"
        }
      ]
    };

    const errors = jsonSchemaErrors(output, schemaUri, instance);
    await expect(errors).rejects.to.throw(Error);
  });

  test("output node without an instanceLocation", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "number"
    }, schemaUri);

    const instance = 0;

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          absoluteKeywordLocation: `${schemaUri}#/type`
        }
      ]
    };

    const errors = jsonSchemaErrors(output, schemaUri, instance);
    await expect(errors).rejects.to.throw(Error);
  });

  test("output with pointer-only instanceLocation", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "number"
    }, schemaUri);

    const instance = "foo";

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          absoluteKeywordLocation: `${schemaUri}#/type`,
          instanceLocation: ""
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#",
        schemaLocations: [`${schemaUri}#/type`]
      }
    ]);
  });

  test("output with passing nodes", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "number",
      minimum: 3
    }, schemaUri);

    const instance = 0;

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          valid: true,
          absoluteKeywordLocation: `${schemaUri}#/type`,
          instanceLocation: "#"
        },
        {
          valid: false,
          absoluteKeywordLocation: `${schemaUri}#/minimum`,
          instanceLocation: "#"
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getMinimumErrorMessage(3),
        instanceLocation: "#",
        schemaLocations: [`${schemaUri}#/minimum`]
      }
    ]);
  });

  test("output with an unknown keyword", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      foo: 42
    }, schemaUri);

    const instance = "foo";

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          absoluteKeywordLocation: `${schemaUri}#/foo`,
          instanceLocation: "#"
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getUnknownErrorMessage("foo"),
        instanceLocation: "#",
        schemaLocations: [`${schemaUri}#/foo`]
      }
    ]);
  });

  test("output with nested nodes (DETAILED/VERBOSE formats)", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        foo: { type: "number" }
      }
    }, schemaUri);

    const instance = { foo: null };

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          absoluteKeywordLocation: `${schemaUri}#/properties`,
          instanceLocation: "#",
          errors: [
            {
              absoluteKeywordLocation: `${schemaUri}#/properties/foo/type`,
              instanceLocation: "#/foo"
            }
          ]
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#/foo",
        schemaLocations: [`${schemaUri}#/properties/foo/type`]
      }
    ]);
  });

  test("output with nested non-keyword nodes (DETAILED/VERBOSE formats)", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        foo: { type: "number" }
      }
    }, schemaUri);

    const instance = { foo: null };

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          absoluteKeywordLocation: `${schemaUri}#/properties`,
          instanceLocation: "#",
          errors: [
            {
              absoluteKeywordLocation: `${schemaUri}#/properties/foo`,
              instanceLocation: "#/foo",
              errors: [
                {
                  absoluteKeywordLocation: `${schemaUri}#/properties/foo/type`,
                  instanceLocation: "#/foo"
                }
              ]
            }
          ]
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getTypeErrorMessage(["number"]),
        instanceLocation: "#/foo",
        schemaLocations: [`${schemaUri}#/properties/foo/type`]
      }
    ]);
  });

  test("output with boolean schema nodes", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        foo: false
      }
    }, schemaUri);

    const instance = { foo: null };

    /** @type OutputFormat */
    const output = {
      valid: false,
      errors: [
        {
          absoluteKeywordLocation: "https://example.com/main#/properties/foo",
          instanceLocation: "#/foo"
        }
      ]
    };

    const errors = await jsonSchemaErrors(output, schemaUri, instance);
    expect(errors).to.eql([
      {
        message: localization.getBooleanSchemaErrorMessage(),
        instanceLocation: "#/foo",
        schemaLocations: [`${schemaUri}#/properties/foo`]
      }
    ]);
  });
});
