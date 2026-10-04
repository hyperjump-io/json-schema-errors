import { compile, getKeyword, getSchema, Validation } from "@hyperjump/json-schema/experimental";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Schema from "@hyperjump/browser";
import { pointerSegments } from "@hyperjump/json-pointer";
import { toAbsoluteIri } from "@hyperjump/uri";
import { Localization } from "./localization.js";
import { JsonSchemaErrorsOutputPlugin } from "./output-plugin.js";

/**
 * @import * as API from "./index.d.ts"
 * @import { Browser } from "@hyperjump/browser";
 * @import { AST, SchemaDocument, CompiledSchema, Node } from "@hyperjump/json-schema/experimental";
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 */

/** @type API.jsonSchemaErrors */
export const jsonSchemaErrors = async (errorOutput, schemaUri, instance, options = {}) => {
  const rootInstance = Instance.fromJs(instance);
  const schema = await getSchema(schemaUri);
  const errorIndex = await constructErrorIndex(errorOutput, schema);
  const { schemaUri: compiledSchemaUri, ast } = await compile(schema);
  const normalizedErrors = evaluateSchema(compiledSchemaUri, rootInstance, {
    ast,
    errorIndex,
    plugins: [...ast.plugins]
  });
  const localization = Localization.forLocale(options.locale ?? "en-US");
  return getErrors(normalizedErrors, rootInstance, localization, ast);
};

/** @type Record<string, API.NormalizationHandler> */
const normalizationHandlers = {};

/** @type API.setNormalizationHandler */
export const setNormalizationHandler = (schemaUri, handler) => {
  normalizationHandlers[schemaUri] = handler;
};

/** @type (outputUnit: API.OutputUnit, schema: Browser<SchemaDocument>, errorIndex?: API.ErrorIndex) => Promise<API.ErrorIndex> */
const constructErrorIndex = async (outputUnit, schema, errorIndex = {}) => {
  if (outputUnit.valid) {
    return errorIndex;
  }

  await indexOutputUnits(outputUnit, schema, errorIndex);
  return errorIndex;
};

/**
 * Output formats vary a lot between validators. Use whatever results are
 * available. Passing results are usually not included, but some formats include
 * them and they help describe what happened inside applicators that passed.
 *
 * @type (outputUnit: API.OutputUnit, schema: Browser<SchemaDocument>, errorIndex: API.ErrorIndex) => Promise<void>
 */
const indexOutputUnits = async (outputUnit, schema, errorIndex) => {
  for (const subOutputUnit of [...outputUnit.errors ?? [], ...outputUnit.annotations ?? []]) {
    const isError = subOutputUnit.valid !== true;
    const hasLocations = "instanceLocation" in subOutputUnit
      && ("keywordLocation" in subOutputUnit || "absoluteKeywordLocation" in subOutputUnit);

    if (isError && !("instanceLocation" in subOutputUnit)) {
      throw Error("Missing instanceLocation in output node");
    }

    if (isError && !hasLocations) {
      throw new Error("Missing absoluteKeywordLocation or keywordLocation");
    }

    if (hasLocations) {
      const absoluteKeywordLocation = subOutputUnit.absoluteKeywordLocation
        ?? await toAbsoluteKeywordLocation(schema, /** @type string */ (subOutputUnit.keywordLocation));
      const instanceLocation = /** @type string */ (subOutputUnit.instanceLocation)
        .replace(/^#?\*?/, "#");

      errorIndex[absoluteKeywordLocation] ??= {};
      // If results conflict, the error wins
      errorIndex[absoluteKeywordLocation][instanceLocation] ||= isError;
    }

    await indexOutputUnits(subOutputUnit, schema, errorIndex);
  }
};

/** @type (schema: Browser, keywordLocation: string) => Promise<string> */
async function toAbsoluteKeywordLocation(schema, keywordLocation) {
  if (keywordLocation.startsWith("#")) {
    keywordLocation = keywordLocation.slice(1);
  }

  for (const segment of pointerSegments(keywordLocation)) {
    schema = await Schema.step(segment, schema);
  }

  return `${schema.document.baseUri}#${schema.cursor}`;
}

/** @type API.evaluateSchema */
export const evaluateSchema = (schemaLocation, instance, context) => {
  const instanceLocation = Instance.uri(instance);

  let valid = true;
  /** @type API.NormalizedOutput */
  const output = {};

  for (const plugin of context.plugins) {
    plugin.beforeSchema?.(schemaLocation, instance, context);
  }

  const schemaNode = context.ast[schemaLocation];
  if (typeof schemaNode === "boolean") {
    const isSchemaValid = getValidity(schemaLocation, instanceLocation, context);
    if (schemaNode === false && isSchemaValid !== true) {
      valid = false;
      output[instanceLocation] = {
        "https://json-schema.org/validation": {
          [schemaLocation]: { valid: isSchemaValid }
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

      const isKeywordValid = getValidity(keywordLocation, instanceLocation.replace(/^#\*/, "#"), context);
      if (isKeywordValid === false) {
        valid = false;
      }

      /** @type API.EvaluationContext */
      const keywordContext = {
        ast: context.ast,
        errorIndex: context.errorIndex,
        plugins: context.plugins,
        // The output won't say what happened inside an applicator that passed
        isValidityUnknown: context.isValidityUnknown || (!keyword.simpleApplicator && isKeywordValid === true)
      };
      for (const plugin of context.plugins) {
        plugin.beforeKeyword?.(node, instance, keywordContext, context, validationKeyword);
      }

      const keywordOutput = keyword.evaluate(keywordValue, instance, keywordContext);

      if (keyword.simpleApplicator) {
        for (const suboutput of /** @type API.NormalizedOutput[] */ (keywordOutput)) {
          mergeOutput(output, suboutput);
        }
      } else {
        output[instanceLocation] ??= {};
        output[instanceLocation][normalizedKeywordUri] ??= {};
        output[instanceLocation][normalizedKeywordUri][keywordLocation] = keywordOutput
          ? { valid: isKeywordValid, outputs: keywordOutput }
          : { valid: isKeywordValid };
      }

      for (const plugin of context.plugins) {
        plugin.afterKeyword?.(node, instance, keywordContext, isKeywordValid !== false, context, validationKeyword);
      }
    }
  }

  for (const plugin of context.plugins) {
    plugin.afterSchema?.(schemaLocation, instance, context, valid);
  }

  return output;
};

/**
 * Validator output usually only includes errors, so a keyword it doesn't
 * mention passed. That's not a safe assumption inside an applicator that passed.
 *
 * @type (schemaLocation: string, instanceLocation: string, context: API.EvaluationContext) => boolean | undefined
 */
const getValidity = (schemaLocation, instanceLocation, context) => {
  const isError = context.errorIndex[schemaLocation]?.[instanceLocation];
  if (isError === undefined) {
    return context.isValidityUnknown ? undefined : true;
  } else {
    return !isError;
  }
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

/** @type Record<string, API.ErrorHandler> */
const errorHandlers = {};

/** @type API.setErrorHandler */
export const setErrorHandler = (errorHandlerUri, errorHandler) => {
  errorHandlers[errorHandlerUri] = errorHandler;
};

/** @type API.removeErrorHandler */
export const removeErrorHandler = (errorHandlerUri) => {
  delete errorHandlers[errorHandlerUri];
};

/** @type API.getErrors */
export const getErrors = (normalizedErrors, rootInstance, localization, ast) => {
  /** @type API.ErrorObject[] */
  const errors = [];

  for (const instanceLocation in normalizedErrors) {
    const instance = /** @type JsonNode */ (Instance.get(instanceLocation, rootInstance));
    for (const errorHandlerUri in errorHandlers) {
      const errorObject = errorHandlers[errorHandlerUri].error(normalizedErrors[instanceLocation], instance, localization, ast);
      errors.push(...errorObject);
    }
  }

  return errors;
};

/** @type API.getSuccesses */
export const getSuccesses = (normalizedOutput, rootInstance, localization, ast) => {
  /** @type API.ErrorObject[] */
  const successes = [];

  for (const instanceLocation in normalizedOutput) {
    const instance = /** @type JsonNode */ (Instance.get(instanceLocation, rootInstance));
    for (const errorHandlerUri in errorHandlers) {
      const successObjects = errorHandlers[errorHandlerUri].success?.(normalizedOutput[instanceLocation], instance, localization, ast) ?? [];
      successes.push(...successObjects);
    }
  }

  return successes;
};

/** @type (normalizedOutput: API.NormalizedOutput) => boolean */
export const isPassing = (normalizedOutput) => {
  for (const instanceLocation in normalizedOutput) {
    for (const keywordUri in normalizedOutput[instanceLocation]) {
      for (const schemaLocation in normalizedOutput[instanceLocation][keywordUri]) {
        if (normalizedOutput[instanceLocation][keywordUri][schemaLocation].valid !== true) {
          return false;
        }
      }
    }
  }

  return true;
};

/** @type (ast: AST, schemaLocation: string) => Node<unknown>[] | boolean | undefined */
const getParentNode = (ast, schemaLocation) => {
  const parentLocation = schemaLocation.replace(/\/[^/]+$/, "");
  return ast[parentLocation];
};

/** @type (ast: AST, schemaLocation: string) => unknown */
export const getCompiledKeywordValue = (ast, schemaLocation) => {
  const parentNode = getParentNode(ast, schemaLocation);
  if (typeof parentNode === "boolean") {
    return parentNode;
  }

  const node = parentNode?.find(([, keywordLocation]) => keywordLocation === schemaLocation);
  if (!node) {
    throw Error("AST node not found");
  }

  return node[2];
};

/** @type (ast: AST, schemaLocation: string, siblingKeywordUri: string) => string */
export const getSiblingKeywordLocation = (ast, schemaLocation, siblingKeywordUri) => {
  let parentNode = getParentNode(ast, schemaLocation);
  if (typeof parentNode === "boolean") {
    parentNode = undefined;
  }

  const node = parentNode?.find(([keywordUri]) => keywordUri === siblingKeywordUri);
  if (!node) {
    throw Error("AST node not found");
  }

  return node[1];
};

/**
 * @overload
 * @param {string} schemaUri
 * @returns {Promise<API.EvaluateInstance>}
 *
 * @overload
 * @param {string} schemaUri
 * @param {API.Json} instance
 * @param {API.JsonSchemaErrorsOptions} [options]
 * @returns {Promise<API.ValidationResult>}
 *
 * @param {string} schemaUri
 * @param {API.Json} instance
 * @param {API.JsonSchemaErrorsOptions} [options]
 */
export const validate = async (schemaUri, instance, options) => {
  const schema = await getSchema(schemaUri);
  const compiledSchema = await compile(schema);

  if (instance === undefined) {
    /** @type API.EvaluateInstance */
    return (instance, options) => {
      return evaluateCompiledSchema(compiledSchema, instance, options);
    };
  } else {
    return evaluateCompiledSchema(compiledSchema, instance, options);
  }
};

/** @type API.evaluateCompiledSchema */
export const evaluateCompiledSchema = (compiledSchema, instance, options = {}) => {
  const localization = Localization.forLocale(options.locale ?? "en-US");
  const jsonNode = Instance.fromJs(instance);
  const outputPlugin = new JsonSchemaErrorsOutputPlugin();
  const context = {
    ast: compiledSchema.ast,
    plugins: [...compiledSchema.ast.plugins, outputPlugin, ...options.plugins ?? []]
  };
  const valid = Validation.interpret(compiledSchema.schemaUri, jsonNode, context);

  if (valid) {
    return { valid };
  } else {
    return {
      valid,
      errors: getErrors(outputPlugin.output, jsonNode, localization, compiledSchema.ast)
    };
  }
};
