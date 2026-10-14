import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import "@hyperjump/json-schema/draft-04";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { JSE, jsonSchemaErrors } from "./index.js";

describe.each([
  "https://json-schema.org/draft/2020-12/schema",
  "http://json-schema.org/draft-04/schema"
])("numeric messages - %s", (dialect) => {
  const schemaUri = "https://example.com/numeric-messages";

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  test.each([
    { keyword: "minimum", value: 1e-7, formatted: "0.0000001", comparison: "greater than or equal to", negated: "less than", instance: 0 },
    { keyword: "maximum", value: 2.5e-8, formatted: "0.000000025", comparison: "less than or equal to", negated: "greater than", instance: 1 },
    { keyword: "exclusiveMinimum", value: 2.5e-8, formatted: "0.000000025", comparison: "greater than", negated: "less than or equal to", instance: 2.5e-8 },
    { keyword: "exclusiveMaximum", value: 1e-7, formatted: "0.0000001", comparison: "less than", negated: "greater than or equal to", instance: 1e-7 },
    { keyword: "multipleOf", value: 2.5e-8, formatted: "0.000000025", comparison: "a multiple of", negated: "that is not a multiple of", instance: 1e-8 }
  ])("$keyword preserves error, success, and negated messages", async ({ keyword, value, formatted, comparison, negated, instance }) => {
    const isDraft04Exclusive = dialect.includes("draft-04") && keyword.startsWith("exclusive");
    const bound = keyword === "exclusiveMinimum" ? "minimum" : "maximum";
    const constraint = isDraft04Exclusive ? { [bound]: value, [keyword]: true } : { [keyword]: value };
    const keywords = isDraft04Exclusive ? [bound, keyword] : [keyword];

    for (const mode of ["error", "success", "negated"]) {
      const schema = mode === "error" ? constraint : mode === "success" ? { not: { not: constraint } } : { not: constraint };
      const prefix = mode === "error" ? "" : mode === "success" ? "/not/not" : "/not";
      const data = mode === "negated" ? null : instance;
      registerSchema({ properties: { amount: schema } }, schemaUri, dialect);

      /** @type {Parameters<typeof jsonSchemaErrors>[0]} */
      let output = await validate(schemaUri, { amount: data }, BASIC);
      // The validator's tolerance accepts these tiny multiples. Supply standard
      // output for their failures, as in #289, to test the formatter itself.
      if (keyword === "multipleOf" && mode !== "negated") {
        output = {
          valid: false,
          errors: [
            { instanceLocation: "#/amount", keywordLocation: `/properties/amount${prefix}/multipleOf` },
            ...(mode === "success" ? [{ instanceLocation: "#/amount", keywordLocation: "/properties/amount/not" }] : [])
          ]
        };
      }
      expect(output.valid).to.equal(false);

      const errors = await jsonSchemaErrors(output, schemaUri, { amount: data });
      const messages = mode === "error" ? errors : errors[0].alternatives?.[0];
      const message = mode === "error"
        ? `Expected a number ${keyword === "multipleOf" ? "that is " : ""}${comparison} ${formatted}`
        : mode === "success"
          ? `The value is either not a number or is ${comparison} ${formatted}`
          : `The value is a number ${negated} ${formatted}`;
      expect.soft(messages).to.eql([{
        message,
        instanceLocation: "#/amount",
        schemaLocations: keywords.map((name) => `${schemaUri}#/properties/amount${prefix}/${name}`)
      }]);
      if (keyword !== "multipleOf" || mode === "negated") {
        const result = await validate(schemaUri, { amount: data }, JSE);
        expect(result.valid ? [] : result.errors).to.eql(errors);
      }
      unregisterSchema(schemaUri);
    }
  });
});
