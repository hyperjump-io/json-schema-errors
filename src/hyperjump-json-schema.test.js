import { afterEach, describe, expect, test } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import {
  registerSchema,
  setShouldValidateFormat,
  unregisterSchema,
  validate
} from "@hyperjump/json-schema/draft-2020-12";
import "@hyperjump/json-schema/draft-2019-09";
import "@hyperjump/json-schema/draft-07";
import "@hyperjump/json-schema/draft-06";
import "@hyperjump/json-schema/draft-04";
import "@hyperjump/json-schema/formats";
import "@hyperjump/json-schema/openapi-3-0";
import "@hyperjump/json-schema/openapi-3-1";
import "@hyperjump/json-schema/openapi-3-2";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { JSE, jsonSchemaErrors } from "../src/index.js";
import { FluentBundle, FluentResource } from "@fluent/bundle";
import { translations } from "./translations/index.js";

/**
 * @import { SchemaObject } from "@hyperjump/json-schema"
 * @import { ErrorObject, Json } from "../src/index.js"
 */

/**
 * @typedef {{
 *   or: string[]
 * }} OrParam
 *
 * @typedef {{
 *   and: string[]
 * }} AndParam
 *
 * @typedef {Record<string, string | number | OrParam | AndParam>} MessageParams
 *
 * @typedef {{
 *   messageId: string;
 *   messageParams: MessageParams;
 *   alternatives: TestCaseError[][];
 *   instanceLocation: string;
 *   schemaLocations: string[];
 * }} TestCaseError
 *
 * @typedef {{
 *   description: string;
 *   compatibility?: string;
 *   schema: SchemaObject | boolean;
 *   instance: Json;
 *   errors: TestCaseError[];
 *   errorsWithFullResults?: TestCaseError[];
 * }} TestCase
 *
 * @typedef {{
 *   description: string;
 *   tests: TestCase[];
 * }} TestSuite
 */

/** @type (dialectUri: string, dialect: number, suite?: string, skip?: Record<string, string[]>) => void */
const runTests = (dialectUri, dialect, suite = "tests", skip = {}) => {
  describe(`JSON Schema Errors - ${dialectUri}`, async () => {
    setShouldValidateFormat(true);

    const schemaUri = "https://example.com/main";

    afterEach(() => {
      unregisterSchema(schemaUri);
    });

    for (const entry of await readdir(`${import.meta.dirname}/test-suite/${suite}`, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      const file = `${entry.parentPath}/${entry.name}`;
      const suite = /** @type TestSuite */ (JSON.parse(await readFile(file, "utf8")));

      for (const testCase of suite.tests) {
        if (!isCompatible(testCase.compatibility, dialect)) {
          continue;
        }
        const testOrSkip = skip[entry.name]?.includes(testCase.description) ? test.skip : test;
        testOrSkip(testCase.description, async () => {
          registerSchema(testCase.schema, schemaUri, dialectUri);

          const instance = testCase.instance;
          const output = await validate(schemaUri, instance, BASIC);
          const errors = await jsonSchemaErrors(output, schemaUri, instance, { isFormatAsserted: true });

          expect(errors).to.eql(buildErrors(testCase.errors, schemaUri));
          expectNestedLocations(errors);

          const result = await validate(schemaUri, instance, JSE);
          const fullResultsErrors = result.valid ? [] : result.errors;
          expect(fullResultsErrors).to.eql(buildErrors(testCase.errorsWithFullResults ?? testCase.errors, schemaUri));
          expectNestedLocations(fullResultsErrors);
        });
      }
    }
  });
};

/** @type (errors: TestCaseError[], schemaUri: string) => ErrorObject[] */
const buildErrors = (errors, schemaUri) => {
  return errors.map((error) => {
    /** @type ErrorObject */
    const result = {
      message: getMessage(error.messageId, error.messageParams),
      instanceLocation: error.instanceLocation,
      schemaLocations: error.schemaLocations.map((schemaLocation) => {
        return schemaLocation.startsWith("#") ? schemaUri + schemaLocation : schemaLocation;
      })
    };

    if ("alternatives" in error) {
      result.alternatives = error.alternatives?.map((alternative) => {
        return buildErrors(alternative, schemaUri);
      });
    }

    return result;
  });
};

/**
 * Consumers like the language server put each top-level error at its
 * instanceLocation and present nested messages relative to their parent. That
 * only works if nested messages are at or below their parent's location.
 *
 * @type (errors: ErrorObject[], parentLocation?: string) => void
 */
const expectNestedLocations = (errors, parentLocation) => {
  for (const error of errors) {
    if (parentLocation !== undefined) {
      const location = error.instanceLocation.replace(/^#\*/, "#");
      expect(location === parentLocation || location.startsWith(`${parentLocation}/`), `'${error.instanceLocation}' is not at or below '${parentLocation}'`).to.equal(true);
    }

    for (const alternative of error.alternatives ?? []) {
      expectNestedLocations(alternative, error.instanceLocation);
    }
  }
};

/** @type (compatibility: string | undefined, versionUnderTest: number) => boolean */
const isCompatible = (compatibility, versionUnderTest) => {
  if (compatibility === undefined) {
    return true;
  }

  const constraints = compatibility.split(",");
  for (const constraint of constraints) {
    const matches = /(?<operator><=|>=|=)?(?<version>\d+)/.exec(constraint);
    if (!matches) {
      throw Error(`Invalid compatibility string: ${compatibility}`);
    }

    const operator = matches[1] ?? ">=";
    const version = parseInt(matches[2], 10);

    switch (operator) {
      case ">=":
        if (versionUnderTest < version) {
          return false;
        }
        break;
      case "<=":
        if (versionUnderTest > version) {
          return false;
        }
        break;
      case "=":
        if (versionUnderTest !== version) {
          return false;
        }
        break;
      default:
        throw Error(`Unsupported contraint operator: ${operator}`);
    }
  }

  return true;
};

/** @type (messageId: string, messageParams: MessageParams) => string */
const getMessage = (function () {
  const translation = translations["en-US"];
  const resource = new FluentResource(translation.ftl);
  const bundle = new FluentBundle("en-US", { useIsolating: translation.direction === "rtl" });
  bundle.addResource(resource);

  const disjunction = new Intl.ListFormat("en-US", { type: "disjunction" });
  const conjunction = new Intl.ListFormat("en-US", { type: "conjunction" });

  return (messageId, messageParams) => {
    for (const paramId in messageParams) {
      if (typeof messageParams[paramId] === "object") {
        if ("or" in messageParams[paramId]) {
          messageParams[paramId] = disjunction.format(messageParams[paramId].or);
        } else {
          messageParams[paramId] = conjunction.format(messageParams[paramId].and);
        }
      }
    }

    const message = bundle.getMessage(messageId);
    if (!message?.value) {
      throw Error(`Message '${messageId}' not found.`);
    }

    return bundle.formatPattern(message.value, messageParams);
  };
}());

/**
 * OpenAPI 3.0 is draft-04 without some keywords, such as `patternProperties`,
 * `dependencies`, `additionalItems`, and `$comment`. It also doesn't allow
 * unknown keywords, `$defs`, array-form `items`, or an array `type`. These
 * tests have schemas that aren't valid OpenAPI 3.0.
 *
 * @type Record<string, string[]>
 */
const oas30Skip = {
  "additionalProperties.json": [
    "additionalProperties with false schema",
    "additionalProperties with object schema",
    "additionalProperties on a non-object",
    "additionalProperties pass"
  ],
  "anyOf.json": [
    "anyOf with $ref alternatives filters by type"
  ],
  "comment.json": [
    "format"
  ],
  "contains.json": [
    "contains passing"
  ],
  "dependencies.json": [
    "array-form dependencies",
    "array-form dependencies pass",
    "schema-form dependencies",
    "schema-form dependencies on a non-object",
    "dependentSchemas pass",
    "schem-form dependencies pass",
    "schema-form and array-form dependencies together"
  ],
  "enum.json": [
    "enum with integer and string types filters fractions",
    "enum with integer and string types passes for strings"
  ],
  "items.json": [
    "items/additionalItems with false schema",
    "items/additionalItems with object schema",
    "additionalItems on a non-array",
    "additionalItems pass"
  ],
  "not.json": [
    "not with multiple types",
    "not with dependencies",
    "not with schema dependencies",
    "not with an unknown keyword",
    "not with schema dependencies when the property is absent",
    "not with array-form items that aren't present",
    "not with additionalItems",
    "not with patternProperties that aren't present",
    "not with descriptions nested too deeply to show"
  ],
  "oneOf.json": [
    "oneOf with $ref alternatives filters by type",
    "oneOf more than one match with array-form items that aren't present",
    "oneOf more than one match with patternProperties that aren't present"
  ],
  "patternProperties.json": [
    "patternProperties",
    "patternProperties on a non-object",
    "patternProperties pass"
  ],
  "prefixItems.json": [
    "array-form items",
    "array-form items with fewer items than are defined",
    "array-form items on an non-array",
    "prefixItems pass",
    "array-form items pass"
  ],
  "propertyNames.json": [
    "propertyNames pass"
  ],
  "ref.json": [
    "$ref",
    "$ref pass"
  ],
  "type.json": [
    "multiple types",
    "collapsed type errors"
  ],
  "unknown.json": [
    "unknown keyword"
  ]
};

runTests("https://json-schema.org/draft/2020-12/schema", 2020);
runTests("https://json-schema.org/draft/2019-09/schema", 2019);
runTests("http://json-schema.org/draft-07/schema", 7);
runTests("http://json-schema.org/draft-06/schema", 6);
runTests("http://json-schema.org/draft-04/schema", 4);
runTests("https://spec.openapis.org/oas/3.2/dialect", 2020);
runTests("https://spec.openapis.org/oas/3.1/dialect/base", 2020);
runTests("https://spec.openapis.org/oas/3.0/dialect", 4, "tests", oas30Skip);

runTests("https://spec.openapis.org/oas/3.2/dialect", 32, "openapi");
runTests("https://spec.openapis.org/oas/3.1/dialect/base", 31, "openapi");
runTests("https://spec.openapis.org/oas/3.0/dialect", 30, "openapi");
