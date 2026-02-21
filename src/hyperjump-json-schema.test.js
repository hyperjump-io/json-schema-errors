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
import { BASIC } from "@hyperjump/json-schema/experimental";
import { jsonSchemaErrors } from "../src/index.js";
import { FluentBundle, FluentResource } from "@fluent/bundle";

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
 * }} TestCase
 *
 * @typedef {{
 *   description: string;
 *   tests: TestCase[];
 * }} TestSuite
 */

/** @type (dialectUri: string, dialect: number) => void */
const runTests = (dialectUri, dialect) => {
  describe(`JSON Schema Errors - ${dialectUri}`, async () => {
    setShouldValidateFormat(true);

    const schemaUri = "https://example.com/main";

    afterEach(() => {
      unregisterSchema(schemaUri);
    });

    for (const entry of await readdir(`${import.meta.dirname}/test-suite/tests`, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      const file = `${entry.parentPath}/${entry.name}`;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const suite = /** @type TestSuite */ (JSON.parse(await readFile(file, "utf8")));

      for (const testCase of suite.tests) {
        if (!isCompatible(testCase.compatibility, dialect)) {
          continue;
        }
        test(testCase.description, async () => {
          registerSchema(testCase.schema, schemaUri, dialectUri);

          const instance = testCase.instance;
          const output = await validate(schemaUri, instance, BASIC);
          const errors = await jsonSchemaErrors(output, schemaUri, instance);

          expect(errors).to.eql(buildErrors(testCase.errors, schemaUri));
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
const getMessage = await (async function () {
  const ftl = await readFile(`${import.meta.dirname}/translations/en-US.ftl`, "utf-8");
  const resource = new FluentResource(ftl);
  const bundle = new FluentBundle("en-US");
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

runTests("https://json-schema.org/draft/2020-12/schema", 2020);
runTests("https://json-schema.org/draft/2019-09/schema", 2019);
runTests("http://json-schema.org/draft-07/schema", 7);
runTests("http://json-schema.org/draft-06/schema", 6);
runTests("http://json-schema.org/draft-04/schema", 4);
