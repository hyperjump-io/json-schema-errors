import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema } from "@hyperjump/json-schema/draft-2020-12";
import { addTranslation, jsonSchemaErrors } from "./index.js";

describe("multipleOf error aggregation", () => {
  const schemaUri = "https://example.com/multipleOf";
  const dialectUri = "https://json-schema.org/draft/2020-12/schema";

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  // Hyperjump accepts the instance in #289. Simulate standard validation output
  // to exercise the formatter independently of the validator's arithmetic.
  test("combines scientific notation constraints (#289)", async () => {
    registerSchema({
      allOf: [{ multipleOf: 1e-7 }, { multipleOf: 2e-7 }]
    }, schemaUri, dialectUri);

    const output = {
      valid: false,
      errors: [
        { instanceLocation: "#", keywordLocation: "/allOf/0/multipleOf" },
        { instanceLocation: "#", keywordLocation: "/allOf/1/multipleOf" }
      ]
    };

    expect(await jsonSchemaErrors(output, schemaUri, 1.5e-7)).to.eql([{
      message: "Expected a number that is a multiple of 0.0000002",
      instanceLocation: "#",
      schemaLocations: [`${schemaUri}#/allOf/0/multipleOf`, `${schemaUri}#/allOf/1/multipleOf`]
    }]);
  });

  test.each([
    { description: "decimal mantissas", multiples: [1.2e-7, 1.8e-7], instance: 1e-7, expected: "0.00000036" },
    { description: "reversed decimal mantissas", multiples: [1.8e-7, 1.2e-7], instance: 1e-7, expected: "0.00000036" },
    { description: "different exponents", multiples: [1.2e-7, 1.8e-8], instance: 1e-8, expected: "0.00000036" },
    { description: "mixed decimal and scientific notation", multiples: [0.0003, 2e-7], instance: 1e-7, expected: "0.0003" },
    { description: "equal constraints", multiples: [1.2e-7, 1.2e-7], instance: 1e-7, expected: "0.00000012" },
    { description: "single constraint", multiples: [1e-7], instance: 1.5e-7, expected: "0.0000001" },
    { description: "three constraints", multiples: [1.2e-7, 1.8e-7, 2.7e-7], instance: 1e-7, expected: "0.00000108" },
    { description: "reversed three constraints", multiples: [2.7e-7, 1.8e-7, 1.2e-7], instance: 1e-7, expected: "0.00000108" },
    { description: "subnormal scale", multiples: [2e-323, 3e-323], instance: 5e-324, expected: `0.${"0".repeat(322)}6` },
    { description: "overflowing intermediate product", multiples: [2e200, 3e200], instance: 1, expected: `600${",000".repeat(66)}` },
    { description: "widely separated exponents", multiples: [1e-308, 1e308], instance: 1e-309, expected: `100${",000".repeat(102)}` }
  ])("combines $description", async ({ multiples, instance, expected }) => {
    registerSchema({ allOf: multiples.map((multipleOf) => ({ multipleOf })) }, schemaUri, dialectUri);
    const locations = multiples.map((_, index) => `/allOf/${index}/multipleOf`);
    const output = {
      valid: false,
      errors: locations.map((keywordLocation) => ({ instanceLocation: "#", keywordLocation }))
    };

    expect(await jsonSchemaErrors(output, schemaUri, instance)).to.eql([{
      message: `Expected a number that is a multiple of ${expected}`,
      instanceLocation: "#",
      schemaLocations: locations.map((location) => `${schemaUri}#${location}`)
    }]);
  });

  test.each([
    { multiples: [1e-7, 2e-7], failedIndex: 1 },
    { multiples: [2e-7, 1e-7], failedIndex: 0 }
  ])("includes a satisfied constraint in $multiples", async ({ multiples, failedIndex }) => {
    registerSchema({
      properties: {
        amount: { allOf: [{ allOf: multiples.map((multipleOf) => ({ multipleOf })) }] }
      }
    }, schemaUri, dialectUri);
    const output = {
      valid: false,
      errors: [{
        instanceLocation: "#/amount",
        keywordLocation: `/properties/amount/allOf/0/allOf/${failedIndex}/multipleOf`
      }]
    };

    expect(await jsonSchemaErrors(output, schemaUri, { amount: 1e-7 })).to.eql([{
      message: "Expected a number that is a multiple of 0.0000002",
      instanceLocation: "#/amount",
      schemaLocations: [
        `${schemaUri}#/properties/amount/allOf/0/allOf/0/multipleOf`,
        `${schemaUri}#/properties/amount/allOf/0/allOf/1/multipleOf`
      ]
    }]);
  });

  test.each([
    { description: "overflow", multiples: [1e308, 3e307], instance: 1, failed: [0, 1] },
    { description: "overflow with a satisfied constraint", multiples: [1e308, 3e307], instance: 1e308, failed: [1] }
  ])("reports original failing constraints for $description", async ({ multiples, instance, failed }) => {
    registerSchema({ allOf: multiples.map((multipleOf) => ({ multipleOf })) }, schemaUri, dialectUri);
    const output = {
      valid: false,
      errors: failed.map((index) => ({ instanceLocation: "#", keywordLocation: `/allOf/${index}/multipleOf` }))
    };

    expect(await jsonSchemaErrors(output, schemaUri, instance)).to.eql(failed.map((index) => ({
      message: `Expected a number that is a multiple of ${new Intl.NumberFormat("en-US").format(multiples[index])}`,
      instanceLocation: "#",
      schemaLocations: [`${schemaUri}#/allOf/${index}/multipleOf`]
    })));
  });

  test("successful scientific notation constraints produce no errors", async () => {
    registerSchema({ allOf: [{ multipleOf: 1e-7 }, { multipleOf: 2e-7 }] }, schemaUri, dialectUri);
    expect(await jsonSchemaErrors({ valid: true }, schemaUri, 2e-7)).to.eql([]);
  });

  test("preserves localized digits, separators, and grouping", async () => {
    addTranslation("de-DE", "multipleOf-message = Erwartet ein Vielfaches von {$multipleOf}");
    registerSchema({
      properties: {
        small: { allOf: [{ multipleOf: 1e-7 }, { multipleOf: 2e-7 }] },
        large: { allOf: [{ multipleOf: 1000 }, { multipleOf: 1500 }] }
      }
    }, schemaUri, dialectUri);
    const output = {
      valid: false,
      errors: [
        { instanceLocation: "#/small", keywordLocation: "/properties/small/allOf/0/multipleOf" },
        { instanceLocation: "#/small", keywordLocation: "/properties/small/allOf/1/multipleOf" },
        { instanceLocation: "#/large", keywordLocation: "/properties/large/allOf/0/multipleOf" },
        { instanceLocation: "#/large", keywordLocation: "/properties/large/allOf/1/multipleOf" }
      ]
    };

    expect(await jsonSchemaErrors(output, schemaUri, { small: 1.5e-7, large: 1 }, { locale: "de-DE" })).to.eql([
      {
        message: "Erwartet ein Vielfaches von 0,0000002",
        instanceLocation: "#/small",
        schemaLocations: [`${schemaUri}#/properties/small/allOf/0/multipleOf`, `${schemaUri}#/properties/small/allOf/1/multipleOf`]
      },
      {
        message: "Erwartet ein Vielfaches von 3.000",
        instanceLocation: "#/large",
        schemaLocations: [`${schemaUri}#/properties/large/allOf/0/multipleOf`, `${schemaUri}#/properties/large/allOf/1/multipleOf`]
      }
    ]);
  });
});
