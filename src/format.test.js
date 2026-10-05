import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, setShouldValidateFormat, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";
import "@hyperjump/json-schema/draft-07";
import "@hyperjump/json-schema";
import "@hyperjump/json-schema/formats";
import { JSE, jsonSchemaErrors } from "./index.js";

/**
 * @import { ErrorObject } from "./index.js"
 */

/**
 * Whether 'format' asserts depends on whether formats are validated, so these
 * can't be covered by the test suite, which always validates formats.
 */
describe("format descriptions", () => {
  const schemaUri = "https://example.com/main";
  const formatAssertionDialectUri = "https://example.com/format-assertion";

  registerSchema({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/core": true,
      "https://json-schema.org/draft/2020-12/vocab/applicator": true,
      "https://json-schema.org/draft/2020-12/vocab/format-assertion": true
    },
    $dynamicAnchor: "meta",
    allOf: [
      { $ref: "https://json-schema.org/draft/2020-12/meta/core" },
      { $ref: "https://json-schema.org/draft/2020-12/meta/applicator" },
      { $ref: "https://json-schema.org/draft/2020-12/meta/format-assertion" }
    ]
  }, formatAssertionDialectUri);

  afterEach(() => {
    unregisterSchema(schemaUri);
    setShouldValidateFormat(undefined);
  });

  const dialectUri = "https://json-schema.org/draft/2020-12/schema";

  /** @type (errors: ErrorObject[]) => string[] */
  const messages = (errors) => [errors[0], ...(errors[0].alternatives ?? []).flat()].map((error) => error.message);

  /** @type (dialectUri: string, format?: string) => Promise<string[]> */
  const describeNotFormat = async (dialectUri, format = "email") => {
    registerSchema({ not: { format } }, schemaUri, dialectUri);
    const output = await validate(schemaUri, "a@example.com", JSE);
    if (output.valid) {
      throw Error("Expected validation to fail");
    }
    return messages(output.errors);
  };

  const described = [
    "Expected the following to be true",
    "The value is a string that doesn't match the 'email' format"
  ];
  const notDescribed = ["A value is not allowed here"];

  test("2020-12 format isn't validated by default", async () => {
    expect(await describeNotFormat(dialectUri)).to.eql(notDescribed);
  });

  test("2020-12 format is validated if turned on", async () => {
    setShouldValidateFormat(true);
    expect(await describeNotFormat(dialectUri)).to.eql(described);
  });

  test("draft-07 format is validated by default", async () => {
    expect(await describeNotFormat("http://json-schema.org/draft-07/schema")).to.eql(described);
  });

  test("draft-07 format isn't validated if turned off", async () => {
    setShouldValidateFormat(false);
    expect(await describeNotFormat("http://json-schema.org/draft-07/schema")).to.eql(notDescribed);
  });

  test("2020-12 format-assertion is validated even if turned off", async () => {
    setShouldValidateFormat(false);
    expect(await describeNotFormat(formatAssertionDialectUri)).to.eql(described);
  });

  test("v1 format is validated by default", async () => {
    expect(await describeNotFormat("https://json-schema.org/v1")).to.eql(described);
  });

  test("v1 format isn't validated if turned off", async () => {
    setShouldValidateFormat(false);
    expect(await describeNotFormat("https://json-schema.org/v1")).to.eql(notDescribed);
  });

  test("unsupported formats aren't validated", async () => {
    setShouldValidateFormat(true);
    expect(await describeNotFormat(dialectUri, "unsupported")).to.eql(notDescribed);
  });

  test("jsonSchemaErrors describes format as only applying if formats are validated if that's not known", async () => {
    setShouldValidateFormat(true);
    registerSchema({ not: { format: "email" } }, schemaUri, dialectUri);
    const output = await validate(schemaUri, "a@example.com", BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, "a@example.com");
    expect(messages(errors)).to.eql([
      "Expected the following to be true",
      "The value is a string that doesn't match the 'email' format (if formats are validated)"
    ]);
  });

  test("jsonSchemaErrors describes format if the validator validates formats", async () => {
    setShouldValidateFormat(true);
    registerSchema({ not: { format: "email" } }, schemaUri, dialectUri);
    const output = await validate(schemaUri, "a@example.com", BASIC);
    const errors = await jsonSchemaErrors(output, schemaUri, "a@example.com", { isFormatAsserted: true });
    expect(messages(errors)).to.eql([
      "Expected the following to be true",
      "The value is a string that doesn't match the 'email' format"
    ]);
  });
});
