import { compile, getKeyword, getSchema } from "@hyperjump/json-schema/experimental";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Schema from "@hyperjump/browser";
import { pointerSegments } from "@hyperjump/json-pointer";
import { toAbsoluteIri } from "@hyperjump/uri";
import { Localization } from "./localization.js";

/**
 * @import * as API from "./index.d.ts"
 * @import { Browser } from "@hyperjump/browser";
 * @import { SchemaDocument } from "@hyperjump/json-schema/experimental";
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 */

/** @type API.jsonSchemaErrors */
export async function jsonSchemaErrors(errorOutput, schemaUri, instance, options = {}) {
  const normalizedErrors = await normalizedOutput(instance, errorOutput, schemaUri);
  const rootInstance = Instance.fromJs(instance);
  const localization = await Localization.forLocale(options.language ?? "en-US");
  return await getErrors(normalizedErrors, rootInstance, localization);
};

/** @type Record<string, API.NormalizationHandler> */
const normalizationHandlers = {};

/** @type API.setNormalizationHandler */
export const setNormalizationHandler = (uri, handler) => {
  normalizationHandlers[uri] = handler;
};

/** @type (instance: API.Json, errorOutput: API.OutputUnit, subjectUri: string) => Promise<API.NormalizedOutput> */
async function normalizedOutput(instance, errorOutput, subjectUri) {
  const schema = await getSchema(subjectUri);
  const errorIndex = await constructErrorIndex(errorOutput, schema);
  const { schemaUri, ast } = await compile(schema);
  const value = Instance.fromJs(instance);
  return evaluateSchema(schemaUri, value, { ast, errorIndex, plugins: [...ast.plugins] });
}

/** @type (outputUnit: API.OutputUnit, schema: Browser<SchemaDocument>, errorIndex?: API.ErrorIndex) => Promise<API.ErrorIndex> */
const constructErrorIndex = async (outputUnit, schema, errorIndex = {}) => {
  if (outputUnit.valid) {
    return errorIndex;
  }

  for (const errorOutputUnit of outputUnit.errors ?? []) {
    if (errorOutputUnit.valid) {
      continue;
    }

    if (!("instanceLocation" in errorOutputUnit)) {
      throw Error("Missing instanceLocation in output node");
    }

    if (!("keywordLocation" in errorOutputUnit || "absoluteKeywordLocation" in errorOutputUnit)) {
      throw new Error("Missing absoluteKeywordLocation or keywordLocation");
    }

    const absoluteKeywordLocation = errorOutputUnit.absoluteKeywordLocation
      ?? await toAbsoluteKeywordLocation(schema, /** @type string */ (errorOutputUnit.keywordLocation));
    const instanceLocation = normalizeInstanceLocation(/** @type string */ (errorOutputUnit.instanceLocation));

    errorIndex[absoluteKeywordLocation] ??= {};
    errorIndex[absoluteKeywordLocation][instanceLocation] = true;
    await constructErrorIndex(errorOutputUnit, schema, errorIndex);
  }

  return errorIndex;
};

/**
 * @param {Browser} schema
 * @param {string} keywordLocation
 * @returns {Promise<string>}
 */
async function toAbsoluteKeywordLocation(schema, keywordLocation) {
  for (const segment of pointerSegments(keywordLocation)) {
    schema = await Schema.step(segment, schema);
  }
  return `${schema.document.baseUri}#${schema.cursor}`;
}

/** @type {(location: string) => string} */
function normalizeInstanceLocation(location) {
  const instanceLocation = location.startsWith("/") || location === "" ? `#${location}` : location;
  return instanceLocation.replace(/(#|^)\*\//, "$1/");
}

/** @type API.evaluateSchema */
export const evaluateSchema = (schemaLocation, instance, context) => {
  const instanceLocation = Instance.uri(instance);

  let valid = true;
  /** @type API.NormalizedOutput */
  const output = { [instanceLocation]: {} };

  for (const plugin of context.plugins) {
    plugin.beforeSchema?.(schemaLocation, instance, context);
  }

  const schemaNode = context.ast[schemaLocation];
  if (typeof schemaNode === "boolean") {
    if (context.errorIndex[schemaLocation]?.[instanceLocation]) {
      output[instanceLocation] = {
        "https://json-schema.org/validation": {
          [schemaLocation]: schemaNode
        }
      };
    }
  } else {
    for (const node of schemaNode) {
      const [keywordUri, keywordLocation, keywordValue] = node;
      const normalizedKeywordUri = toAbsoluteIri(keywordUri);

      if (!(normalizedKeywordUri in normalizationHandlers)) {
        throw Error(`Encountered unsupported keyword ${keywordUri}. Use the 'setNormalizationHandler' function to add support for this keyword.`);
      }
      const keyword = normalizationHandlers[normalizedKeywordUri];

      const validationKeyword = getKeyword(keywordUri);

      const keywordContext = {
        ast: context.ast,
        errorIndex: context.errorIndex,
        plugins: context.plugins
      };
      for (const plugin of context.plugins) {
        plugin.beforeKeyword?.(node, instance, keywordContext, context, validationKeyword);
      }

      const keywordOutput = keyword.evaluate(keywordValue, instance, keywordContext);
      const isKeywordValid = !context.errorIndex[keywordLocation]?.[instanceLocation];
      if (!isKeywordValid) {
        valid = false;
      }

      if (keyword.simpleApplicator) {
        for (const suboutput of /** @type API.NormalizedOutput[] */ (keywordOutput)) {
          mergeOutput(output, suboutput);
        }
      } else {
        output[instanceLocation][normalizedKeywordUri] ??= {};
        output[instanceLocation][normalizedKeywordUri][keywordLocation] = isKeywordValid || (keywordOutput ?? false);
      }

      for (const plugin of context.plugins) {
        plugin.afterKeyword?.(node, instance, keywordContext, isKeywordValid, context, validationKeyword);
      }
    }
  }

  for (const plugin of context.plugins) {
    plugin.afterSchema?.(schemaLocation, instance, context, valid);
  }

  return output;
};

/** @type (a: API.NormalizedOutput, b: API.NormalizedOutput) => void */
const mergeOutput = (a, b) => {
  for (const instanceLocation in b) {
    a[instanceLocation] ??= {};
    for (const keywordUri in b[instanceLocation]) {
      a[instanceLocation][keywordUri] ??= {};

      Object.assign(a[instanceLocation][keywordUri], b[instanceLocation][keywordUri]);
    }
  }
};

/** @type API.ErrorHandler[] */
const errorHandlers = [];

/** @type API.addErrorHandler */
export const addErrorHandler = (errorHandler) => {
  errorHandlers.push(errorHandler);
};

/** @type (normalizedErrors: API.NormalizedOutput, rootInstance: JsonNode, language: Localization) => Promise<API.ErrorObject[]> */
export const getErrors = async (normalizedErrors, rootInstance, localization) => {
  /** @type API.ErrorObject[] */
  const errors = [];

  for (const instanceLocation in normalizedErrors) {
    const instance = /** @type JsonNode */ (Instance.get(instanceLocation, rootInstance));
    for (const errorHandler of errorHandlers) {
      const errorObject = await errorHandler(normalizedErrors[instanceLocation], instance, localization);
      errors.push(...errorObject);
    }
  }

  return errors;
};
