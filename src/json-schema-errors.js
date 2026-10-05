import { compile, getKeyword, getSchema } from "@hyperjump/json-schema/experimental";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Schema from "@hyperjump/browser";
import * as JsonPointer from "@hyperjump/json-pointer";
import { toAbsoluteIri } from "@hyperjump/uri";
import { Localization } from "./localization.js";

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
  return getErrors(normalizedErrors, rootInstance, localization, { ast });
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
          !validationKeyword.simpleApplicator && isKeywordValid === true
        )
      };
      for (const plugin of context.plugins) {
        plugin.beforeKeyword?.(node, instance, keywordContext, context, validationKeyword);
      }

      const keywordOutput = keyword.evaluate(keywordValue, instance, keywordContext);

      const isReported = context.errorIndex[keywordLocation]?.[keywordInstanceLocation] !== undefined;
      if (validationKeyword.simpleApplicator && !isReported && keywordOutput?.some(isFailing)) {
        isKeywordValid = false;
      }

      if (isKeywordValid === false) {
        valid = false;
      }

      if (validationKeyword.simpleApplicator) {
        for (const suboutput of keywordOutput ?? []) {
          mergeOutput(output, suboutput);
        }
      }

      output[instanceLocation] ??= {};
      output[instanceLocation][normalizedKeywordUri] ??= {};
      output[instanceLocation][normalizedKeywordUri][keywordLocation] = keywordOutput
        ? { valid: isKeywordValid, outputs: keywordOutput }
        : { valid: isKeywordValid };

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
  return createPlaceholder(parent.baseUri, JsonPointer.append(segment, parent.pointer), parent);
};

/**
 * A placeholder for the name of a property that doesn't exist.
 *
 * @type (parent: JsonNode, propertyName: string) => JsonNode
 */
export const getPropertyNamePlaceholder = (parent, propertyName) => {
  return createPlaceholder(parent.baseUri, "*" + JsonPointer.append(propertyName, parent.pointer), parent);
};

/** @type (baseUri: string, pointer: string, parent: JsonNode | undefined) => JsonNode */
const createPlaceholder = (baseUri, pointer, parent) => {
  return Instance.cons(baseUri, pointer, undefined, /** @type JsonNode["type"] */ ("undefined"), [], parent);
};

/** @type (node: JsonNode) => boolean */
export const isPlaceholder = (node) => /** @type string */ (Instance.typeOf(node)) === "undefined";

/**
 * Looking up a location that doesn't exist can fail rather than returning
 * undefined, such as the name of a property that isn't present.
 *
 * @type (instanceLocation: string, rootInstance: JsonNode) => JsonNode | undefined
 */
const getInstance = (instanceLocation, rootInstance) => {
  try {
    return Instance.get(instanceLocation, rootInstance);
  } catch {
    return undefined;
  }
};

/** @type (instanceLocation: string, rootInstance: JsonNode) => JsonNode */
const toPlaceholder = (instanceLocation, rootInstance) => {
  const pointer = decodeURI(instanceLocation.slice(instanceLocation.indexOf("#") + 1));
  return createPlaceholder(rootInstance.baseUri, pointer, undefined);
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

/**
 * Describes a subschema that applies to every location in some scope, such as
 * every item in an array. The subschema is described at a placeholder that
 * stands in for any of those locations and then the description is moved to
 * the parent because it applies to all of them.
 *
 * @type (subschemaLocation: string, placeholder: JsonNode, parent: JsonNode, localization: Localization, context: API.ErrorHandlerContext) => API.ErrorObject[]
 */
export const describeEach = (subschemaLocation, placeholder, parent, localization, context) => {
  const output = evaluateRequirements(subschemaLocation, placeholder, context.ast);
  return getSuccesses(output, parent, localization, context)
    .map((success) => relocate(success, Instance.uri(placeholder), Instance.uri(parent)));
};

/**
 * @typedef {{
 *   subschemaLocation: string;
 *   placeholder: JsonNode;
 *   each: (localization: Localization, count: number) => string;
 *   none: (localization: Localization) => string;
 * }} Scope
 */

/**
 * Describes a subschema that applies to every location in some scope, such as
 * every item in an array, including locations that could be added. The
 * placeholder stands in for any of those locations. `each` is the message for
 * the group of what each location requires, given how many things are in it, and `none` describes the scope
 * being empty, which is what the subschema requires if it's `false`.
 *
 * @type (scope: Scope, instance: JsonNode, schemaLocation: string, localization: Localization, context: API.ErrorHandlerContext) => API.ErrorObject[]
 */
export const describeScope = ({ subschemaLocation, placeholder, each, none }, instance, schemaLocation, localization, context) => {
  if (context.ast[subschemaLocation] === false) {
    return [{
      message: none(localization),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    }];
  }

  const description = describeEach(subschemaLocation, placeholder, instance, localization, context);
  if (description.length === 0) {
    return [];
  }

  return [{
    message: each(localization, description.length),
    // Every location satisfies all of them or there's one that satisfies at least one
    alternatives: localization.isNegated
      ? limitOptions(description.map((option) => [option]), instance, localization)
      : [limitItems(description, instance, localization)],
    instanceLocation: Instance.uri(instance),
    schemaLocations: [schemaLocation]
  }];
};

/**
 * @typedef {{
 *   condition: (localization: Localization) => API.ErrorObject[];
 *   then?: (localization: Localization) => API.ErrorObject[];
 *   else?: (localization: Localization) => API.ErrorObject[];
 * }} Conditional
 */

/**
 * Describes subschemas that only apply under some condition, such as a
 * property's subschema only applying if the property is present. Each function
 * describes its part using the given localization, so `condition` describes the
 * condition holding, or with a negated localization, not holding.
 *
 * @type (conditional: Conditional, instance: JsonNode, schemaLocation: string, localization: Localization) => API.ErrorObject[]
 */
export const describeConditional = (conditional, instance, schemaLocation, localization) => {
  const positive = localization.isNegated ? localization.negated() : localization;
  const negated = positive.negated();

  /** @type (descriptions: API.ErrorObject[]) => API.ErrorObject[] */
  const asOptions = (descriptions) => someTrue(descriptions.map((option) => [option]), instance, schemaLocation, localization);

  if (localization.isNegated) {
    // Fails if the condition holds and 'then' fails or if the condition doesn't
    // hold and 'else' fails
    /** @type API.ErrorObject[] */
    const options = [];

    const thenOptions = conditional.then?.(localization) ?? [];
    if (thenOptions.length > 0) {
      const requirements = [...conditional.condition(positive), ...asOptions(thenOptions)];
      options.push(...allTrue(requirements, instance, schemaLocation, localization));
    }

    const elseOptions = conditional.else?.(localization) ?? [];
    if (elseOptions.length > 0) {
      const requirements = [...conditional.condition(negated), ...asOptions(elseOptions)];
      options.push(...allTrue(requirements, instance, schemaLocation, localization));
    }

    return options;
  } else if (conditional.else) {
    // Passes if the condition holds and 'then' passes or if it doesn't and 'else' passes
    const thenOption = [...conditional.condition(positive), ...conditional.then?.(localization) ?? []];
    const elseOption = [...conditional.condition(negated), ...conditional.else(localization)];
    return someTrue([thenOption, elseOption], instance, schemaLocation, localization);
  } else {
    // Passes if the condition doesn't hold or 'then' passes
    const description = conditional.then?.(localization) ?? [];
    if (description.length === 0) {
      return [];
    }

    return someTrue([conditional.condition(negated), description], instance, schemaLocation, localization);
  }
};

/** @type (errorObject: API.ErrorObject, from: string, to: string) => API.ErrorObject */
const relocate = (errorObject, from, to) => {
  /** @type API.ErrorObject */
  const relocated = {
    ...errorObject,
    instanceLocation: errorObject.instanceLocation.startsWith(from)
      ? to + errorObject.instanceLocation.slice(from.length)
      : errorObject.instanceLocation
  };
  if (errorObject.alternatives) {
    relocated.alternatives = errorObject.alternatives.map((alternative) => {
      return alternative.map((success) => relocate(success, from, to));
    });
  }
  return relocated;
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
export const getErrors = (normalizedErrors, rootInstance, localization, context) => {
  /** @type API.ErrorObject[] */
  const errors = [];

  for (const instanceLocation in normalizedErrors) {
    const instance = /** @type JsonNode */ (Instance.get(instanceLocation, rootInstance));
    for (const errorHandlerUri in errorHandlers) {
      const errorObjects = errorHandlers[errorHandlerUri].error?.(normalizedErrors[instanceLocation], instance, localization, context) ?? [];
      errors.push(...errorObjects);
    }
  }

  return errors;
};

/**
 * The results of a conditional keyword's subschemas are merged into the results
 * of its parent schema like any simple applicator, but they only apply when the
 * condition holds. The conditional keyword's handler describes them along with
 * the condition, so they aren't described again as requirements of the parent.
 *
 * @type (normalizedOutput: API.NormalizedOutput) => API.NormalizedOutput
 */
const withoutConditionalResults = (normalizedOutput) => {
  /** @type Set<string> */
  const conditionalResults = new Set();
  for (const instanceLocation in normalizedOutput) {
    for (const keywordUri in normalizedOutput[instanceLocation]) {
      if (!normalizationHandlers[toAbsoluteIri(keywordUri)]?.conditional) {
        continue;
      }

      for (const keywordLocation in normalizedOutput[instanceLocation][keywordUri]) {
        for (const output of normalizedOutput[instanceLocation][keywordUri][keywordLocation].outputs ?? []) {
          for (const subInstanceLocation in output) {
            for (const subKeywordUri in output[subInstanceLocation]) {
              for (const subKeywordLocation in output[subInstanceLocation][subKeywordUri]) {
                conditionalResults.add(resultKey(subInstanceLocation, subKeywordUri, subKeywordLocation));
              }
            }
          }
        }
      }
    }
  }

  if (conditionalResults.size === 0) {
    return normalizedOutput;
  }

  /** @type API.NormalizedOutput */
  const result = {};
  for (const instanceLocation in normalizedOutput) {
    for (const keywordUri in normalizedOutput[instanceLocation]) {
      for (const keywordLocation in normalizedOutput[instanceLocation][keywordUri]) {
        if (conditionalResults.has(resultKey(instanceLocation, keywordUri, keywordLocation))) {
          continue;
        }

        result[instanceLocation] ??= {};
        result[instanceLocation][keywordUri] ??= {};
        result[instanceLocation][keywordUri][keywordLocation] = normalizedOutput[instanceLocation][keywordUri][keywordLocation];
      }
    }
  }

  return result;
};

/** @type (instanceLocation: string, keywordUri: string, keywordLocation: string) => string */
const resultKey = (instanceLocation, keywordUri, keywordLocation) => JSON.stringify([instanceLocation, keywordUri, keywordLocation]);

/** @type API.getSuccesses */
export const getSuccesses = (normalizedOutput, rootInstance, localization, context) => {
  // Descriptions of nested subschemas can get very large, so stop describing
  // past some depth and say that there's more
  if (descriptionDepth >= MAX_DESCRIPTION_DEPTH) {
    /** @type API.ErrorObject */
    const detailsNotShown = {
      message: localization.getDetailsNotShownMessage(),
      instanceLocation: Instance.uri(rootInstance),
      schemaLocations: []
    };
    detailsNotShownMarkers.add(detailsNotShown);
    return [detailsNotShown];
  }

  /** @type API.ErrorObject[] */
  const successes = [];

  const describedOutput = withoutConditionalResults(normalizedOutput);

  descriptionDepth++;
  try {
    for (const instanceLocation in describedOutput) {
      // Descriptions can be about values that don't exist yet
      const instance = getInstance(instanceLocation, rootInstance)
        ?? toPlaceholder(instanceLocation, rootInstance);
      for (const errorHandlerUri in errorHandlers) {
        const successObjects = errorHandlers[errorHandlerUri].success?.(describedOutput[instanceLocation], instance, localization, context) ?? [];
        successes.push(...successObjects);
      }
    }
  } finally {
    descriptionDepth--;
  }

  return successes;
};

const MAX_DESCRIPTION_DEPTH = 3;
let descriptionDepth = 0;

/** @type WeakSet<API.ErrorObject> */
const detailsNotShownMarkers = new WeakSet();

/**
 * Saying that details aren't shown more than once in a list doesn't add
 * anything, and neither does a group with nothing else in it.
 *
 * @type (items: API.ErrorObject[]) => API.ErrorObject[]
 */
const collapseDetailsNotShown = (items) => {
  let hasMarker = false;
  return items.flatMap((item) => {
    const isEmptyGroup = item.alternatives?.every((alternative) => {
      return alternative.every((entry) => detailsNotShownMarkers.has(entry));
    });
    const marker = detailsNotShownMarkers.has(item) ? item : isEmptyGroup ? item.alternatives?.[0][0] : undefined;
    if (!marker) {
      return [item];
    } else if (hasMarker) {
      return [];
    } else {
      hasMarker = true;
      return [marker];
    }
  });
};

const MAX_ENTRIES = 5;

/**
 * A group of things that all need to be true shows only the first few. The
 * rest are summarized so it's clear that the list isn't complete.
 *
 * @type (allItems: API.ErrorObject[], instance: JsonNode, localization: Localization) => API.ErrorObject[]
 */
export const limitItems = (allItems, instance, localization) => {
  const items = collapseDetailsNotShown(allItems);
  if (items.length <= MAX_ENTRIES) {
    return items;
  }

  return [...items.slice(0, MAX_ENTRIES), notShown(items.length - MAX_ENTRIES, instance, localization)];
};

/**
 * A choice of options shows only the first few. By default, the smallest ones
 * are shown first so the simplest options are the ones that are shown. The
 * order of options doesn't change what they mean.
 *
 * @type (allOptions: API.ErrorObject[][], instance: JsonNode, localization: Localization, isSorted?: boolean) => API.ErrorObject[][]
 */
export const limitOptions = (allOptions, instance, localization, isSorted = true) => {
  // Only one option that's just "details aren't shown" is needed
  let hasDetailsNotShown = false;
  const options = allOptions.map(collapseDetailsNotShown).filter((option) => {
    const isDetailsNotShown = option.length === 1 && detailsNotShownMarkers.has(option[0]);
    if (isDetailsNotShown && hasDetailsNotShown) {
      return false;
    }
    hasDetailsNotShown ||= isDetailsNotShown;
    return true;
  });
  const sorted = isSorted ? [...options].sort((a, b) => sizeOf(a) - sizeOf(b)) : options;
  if (sorted.length <= MAX_ENTRIES) {
    return sorted;
  }

  return [...sorted.slice(0, MAX_ENTRIES), [notShown(sorted.length - MAX_ENTRIES, instance, localization)]];
};

/** @type (count: number, instance: JsonNode, localization: Localization) => API.ErrorObject */
const notShown = (count, instance, localization) => ({
  message: localization.getNotShownMessage(count),
  instanceLocation: Instance.uri(instance),
  schemaLocations: []
});

/** @type (errorObjects: API.ErrorObject[]) => number */
const sizeOf = (errorObjects) => errorObjects.reduce((size, errorObject) => {
  return size + 1 + (errorObject.alternatives ?? []).reduce((alternativesSize, alternative) => {
    return alternativesSize + sizeOf(alternative);
  }, 0);
}, 0);

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
    return limitItems(options.flat(), instance, localization);
  }

  return [{
    message: localization.getCountTrueMessage(min, max === options.length ? Infinity : max),
    alternatives: limitOptions(options.map((option) => limitItems(option, instance, localization)), instance, localization),
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
    alternatives: [limitItems(items, instance, localization)],
    instanceLocation: Instance.uri(instance),
    schemaLocations: [schemaLocation]
  };
  allTrueGroups.add(group);
  return [group];
};

/** @type (errorObject: API.ErrorObject) => boolean */
export const isAllTrueGroup = (errorObject) => allTrueGroups.has(errorObject);

/**
 * Describes each occurrence of a keyword at this location with a single message
 * based on the keyword's value. Return `undefined` if the keyword doesn't
 * require anything.
 *
 * @type <Value>(normalizedOutput: API.InstanceOutput, keywordUri: string, instance: JsonNode, ast: AST, toMessage: (value: Value) => string | undefined) => API.ErrorObject[]
 */
export const describeKeyword = (normalizedOutput, keywordUri, instance, ast, toMessage) => {
  /** @type API.ErrorObject[] */
  const successes = [];

  for (const schemaLocation in normalizedOutput[keywordUri]) {
    const message = toMessage(/** @type any */ (getCompiledKeywordValue(ast, schemaLocation)));
    if (message !== undefined) {
      successes.push({
        message,
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }
  }

  return successes;
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
