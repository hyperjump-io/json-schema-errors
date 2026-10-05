import { beforeAll, describe, expect, test } from "vitest";
import { addKeyword, defineVocabulary } from "@hyperjump/json-schema/experimental";
import { registerSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Browser from "@hyperjump/browser";
import { addTranslation, defineKeyword, JSE } from "./index.js";

/**
 * @import { ErrorObject } from "./index.js"
 */

const dialectUri = "https://example.com/define-keyword/dialect";
const startsWithUri = "https://example.com/keyword/startsWith";
const noteUri = "https://example.com/keyword/note";
const neverUri = "https://example.com/keyword/never";

/** @type (errors: ErrorObject[]) => unknown[] */
const messages = (errors) => errors.map(({ message, alternatives }) => {
  return alternatives ? [message, alternatives.map(messages)] : message;
});

/** @type (schema: Record<string, unknown>, instance: unknown) => Promise<unknown[]> */
const getMessages = async (schema, instance) => {
  const schemaUri = `https://example.com/define-keyword/${crypto.randomUUID()}`;
  registerSchema({ $schema: dialectUri, ...schema }, schemaUri);
  const output = await validate(schemaUri, /** @type any */ (instance), JSE);
  return output.valid ? [] : messages(output.errors);
};

describe("defineKeyword", () => {
  beforeAll(() => {
    addKeyword({
      id: startsWithUri,
      compile: async (schema) => /** @type string */ (Browser.value(schema)),
      interpret: (prefix, instance) => Instance.typeOf(instance) !== "string"
        || /** @type string */ (Instance.value(instance)).startsWith(prefix)
    });
    addKeyword({
      id: noteUri,
      compile: async (schema) => Browser.value(schema),
      interpret: () => true
    });
    addKeyword({
      id: neverUri,
      compile: async (schema) => Browser.value(schema),
      interpret: () => false
    });
    defineVocabulary("https://example.com/define-keyword/vocab", {
      startsWith: startsWithUri,
      note: noteUri,
      never: neverUri
    });
    registerSchema({
      $id: dialectUri,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/core": true,
        "https://json-schema.org/draft/2020-12/vocab/applicator": true,
        "https://json-schema.org/draft/2020-12/vocab/validation": true,
        "https://example.com/define-keyword/vocab": true
      },
      $dynamicAnchor: "meta",
      $ref: "https://json-schema.org/draft/2020-12/schema"
    });

    addTranslation("en-US", `
fx-startsWith-message = Expected a string that starts with '{$prefix}'
fx-startsWith-success-message = The value is either not a string or starts with '{$prefix}'
fx-startsWith-negated-message = The value is a string that doesn't start with '{$prefix}'
`);

    defineKeyword(startsWithUri, {
      error: (/** @type string */ prefix, localization) => localization.format("fx-startsWith-message", { prefix }),
      requirement: (/** @type string */ prefix, localization) => localization.formatRequirement("fx-startsWith", { prefix })
    });

    defineKeyword(noteUri, { annotation: true });
  });

  test("error", async () => {
    expect(await getMessages({ startsWith: "foo" }, "bar")).to.eql([
      "Expected a string that starts with 'foo'"
    ]);
  });

  test("passing", async () => {
    expect(await getMessages({ startsWith: "foo" }, "foobar")).to.eql([]);
  });

  test("each occurrence that fails gets a message", async () => {
    expect(await getMessages({ allOf: [{ startsWith: "foo" }, { startsWith: "ba" }, { startsWith: "baz" }] }, "bar")).to.eql([
      "Expected a string that starts with 'foo'",
      "Expected a string that starts with 'baz'"
    ]);
  });

  test("negated requirement", async () => {
    expect(await getMessages({ not: { startsWith: "foo" } }, "foobar")).to.eql([
      ["Expected the following to be true", [["The value is a string that doesn't start with 'foo'"]]]
    ]);
  });

  test("requirement", async () => {
    expect(await getMessages({ not: { not: { startsWith: "foo" } } }, "bar")).to.eql([
      ["Expected the following to be true", [["The value is either not a string or starts with 'foo'"]]]
    ]);
  });

  test("annotation", async () => {
    // A schema with only annotations allows any value
    expect(await getMessages({ oneOf: [{ note: "anything" }, { type: "string" }] }, "foo")).to.eql([
      ["Expected the value to satisfy only one of the following options", [
        ["Any value is allowed"],
        ["The value is a string"]
      ]]
    ]);
  });

  test("redefining without messages removes them", async () => {
    defineKeyword(neverUri, {
      error: () => "Never passes"
    });
    expect(await getMessages({ never: true }, 42)).to.eql([
      "Never passes"
    ]);

    defineKeyword(neverUri, {});
    expect(await getMessages({ never: true }, 42)).to.eql([]);
  });
});
