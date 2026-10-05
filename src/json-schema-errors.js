import { compile, getKeyword, getSchema, Validation } from "@hyperjump/json-schema/experimental";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Schema from "@hyperjump/browser";
import * as JsonPointer from "@hyperjump/json-pointer";
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

/** @type (schemaLocation: string, ast: AST) => boolean */
export const allowsAnyValue = (schemaLocation, ast) => {
  const schemaNode = ast[schemaLocation];
  if (typeof schemaNode === "boolean") {
    return schemaNode;
  }

  return schemaNode.every(([keywordUri]) => normalizationHandlers[toAbsoluteIri(keywordUri)]?.annotation);
};

/** @type (keywordUri: string) => boolean */
export const isRecordingResult = (keywordUri) => {
  return normalizationHandlers[toAbsoluteIri(keywordUri)]?.recordResult ?? false;
};

/** @type (keywordUri: string) => boolean */
export const isSimpleApplicator = (keywordUri) => {
  return normalizationHandlers[toAbsoluteIri(keywordUri)]?.simpleApplicator ?? false;
};

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

  for (const segment of JsonPointer.pointerSegments(keywordLocation)) {
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

      const keywordInstanceLocation = instanceLocation.replace(/^#\*/, "#");
      let isKeywordValid = getValidity(keywordLocation, keywordInstanceLocation, context);

      /** @type API.EvaluationContext */
      const keywordContext = {
        ast: context.ast,
        errorIndex: context.errorIndex,
        plugins: context.plugins,
        // The output won't say what happened inside an applicator that passed
        isValidityUnknown: context.isValidityUnknown || (
          !keyword.simpleApplicator && !keyword.validityFromSubschemas && isKeywordValid === true
        )
      };
      for (const plugin of context.plugins) {
        plugin.beforeKeyword?.(node, instance, keywordContext, context, validationKeyword);
      }

      const keywordOutput = keyword.evaluate(keywordValue, instance, keywordContext);

      const isReported = context.errorIndex[keywordLocation]?.[keywordInstanceLocation] !== undefined;
      const isValidityFromSubschemas = keyword.validityFromSubschemas || keyword.recordResult;
      if (isValidityFromSubschemas && !isReported && keywordOutput?.some(isFailing)) {
        isKeywordValid = false;
      }

      if (isKeywordValid === false) {
        valid = false;
      }

      if (keyword.simpleApplicator) {
        for (const suboutput of /** @type API.NormalizedOutput[] */ (keywordOutput)) {
          mergeOutput(output, suboutput);
        }

        if (keyword.recordResult) {
          output[instanceLocation] ??= {};
          output[instanceLocation][normalizedKeywordUri] ??= {};
          output[instanceLocation][normalizedKeywordUri][keywordLocation] = { valid: isKeywordValid };
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

/**
 * A placeholder stands in for a value that doesn't exist, such as a property
 * that isn't present, so it can be described what that value would need to be.
 *
 * @type (parent: JsonNode, segment: string) => JsonNode
 */
export const getPlaceholder = (parent, segment) => {
  const pointer = JsonPointer.append(segment, parent.pointer);
  return Instance.cons(parent.baseUri, pointer, undefined, /** @type JsonNode["type"] */ ("undefined"), [], parent);
};

/** @type (node: JsonNode) => boolean */
export const isPlaceholder = (node) => /** @type string */ (Instance.typeOf(node)) === "undefined";

/** @type (instanceLocation: string, rootInstance: JsonNode) => JsonNode */
const toPlaceholder = (instanceLocation, rootInstance) => {
  const pointer = decodeURI(instanceLocation.slice(instanceLocation.indexOf("#") + 1));
  return Instance.cons(rootInstance.baseUri, pointer, undefined, /** @type JsonNode["type"] */ ("undefined"), [], undefined);
};

/**
 * Builds the normalized output for a subschema the validator didn't evaluate.
 * Nothing is known about the results, but success messages only describe what
 * keywords require, so it's enough to describe the subschema.
 *
 * @type (schemaLocation: string, instance: JsonNode, ast: AST) => API.NormalizedOutput
 */
export const evaluateRequirements = (schemaLocation, instance, ast) => {
  return evaluateSchema(schemaLocation, instance, {
    ast,
    errorIndex: {},
    plugins: [...ast.plugins],
    isValidityUnknown: true
  });
};

/** @type (outputs: API.NormalizedOutput[]) => API.NormalizedOutput */
export const mergeOutputs = (outputs) => {
  /** @type API.NormalizedOutput */
  const merged = {};
  for (const output of outputs) {
    mergeOutput(merged, output);
  }
  return merged;
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
    // Descriptions can be about values that don't exist yet
    const instance = Instance.get(instanceLocation, rootInstance)
      ?? toPlaceholder(instanceLocation, rootInstance);
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

/** @type (normalizedOutput: API.NormalizedOutput) => boolean */
export const isFailing = (normalizedOutput) => {
  for (const instanceLocation in normalizedOutput) {
    for (const keywordUri in normalizedOutput[instanceLocation]) {
      for (const schemaLocation in normalizedOutput[instanceLocation][keywordUri]) {
        if (normalizedOutput[instanceLocation][keywordUri][schemaLocation].valid === false) {
          return true;
        }
      }
    }
  }

  return false;
};

/** @type WeakSet<API.ErrorObject> */
const allTrueGroups = new WeakSet();

/**
 * Success messages are a list of things that are all true, but some keywords
 * are described by a choice of options. Present the options as a group that
 * says how many of the options are true.
 *
 * @type (options: API.ErrorObject[][], range: { min?: number, max?: number }, instance: JsonNode, schemaLocation: string, localization: Localization) => API.ErrorObject[]
 */
export const countTrue = (options, { min = 0, max = Infinity }, instance, schemaLocation, localization) => {
  max = Math.min(max, options.length);

  if (options.length === 0 || (min <= 0 && max === options.length)) {
    // Nothing to say
    return [];
  } else if (min === options.length) {
    // All of the options are true
    return options.flat();
  }

  return [{
    message: localization.getCountTrueMessage(min, max === options.length ? Infinity : max),
    alternatives: options,
    instanceLocation: Instance.uri(instance),
    schemaLocations: [schemaLocation]
  }];
};

/** @type (options: API.ErrorObject[][], instance: JsonNode, schemaLocation: string, localization: Localization) => API.ErrorObject[] */
export const someTrue = (options, instance, schemaLocation, localization) => {
  return countTrue(options, { min: 1 }, instance, schemaLocation, localization);
};

/**
 * Negated success messages are a list of things where at least one is true, but
 * some keywords need several things to be true. Present those as a group.
 *
 * @type (items: API.ErrorObject[], instance: JsonNode, schemaLocation: string, localization: Localization) => API.ErrorObject[]
 */
export const allTrue = (items, instance, schemaLocation, localization) => {
  if (items.length <= 1) {
    return items;
  }

  /** @type API.ErrorObject */
  const group = {
    message: localization.getAllTrueMessage(),
    alternatives: [items],
    instanceLocation: Instance.uri(instance),
    schemaLocations: [schemaLocation]
  };
  allTrueGroups.add(group);
  return [group];
};

/** @type (errorObject: API.ErrorObject) => boolean */
export const isAllTrueGroup = (errorObject) => allTrueGroups.has(errorObject);

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
