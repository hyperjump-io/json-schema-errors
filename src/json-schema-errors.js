import { compile, getKeyword, getSchema } from "@hyperjump/json-schema/experimental";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Schema from "@hyperjump/browser";
import * as JsonPointer from "@hyperjump/json-pointer";
import { toAbsoluteIri } from "@hyperjump/uri";
import { Localization } from "./localization.js";

/**
 * @import * as API from "./index.d.ts"
 * @import { Browser } from "@hyperjump/browser";
 * @import { AST, SchemaDocument, Node } from "@hyperjump/json-schema/experimental";
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
  /** @type API.ErrorHandlerContext */
  const context = {
    ast,
    localization: Localization.forLocale(options.locale ?? "en-US"),
    isFormatAsserted: () => options.isFormatAsserted
  };
  return limitMessages(getErrors(normalizedErrors, rootInstance, context), context);
};

/** @type Record<string, API.KeywordDefinition<any>> */
const keywordDefinitions = {};

/** @type (schemaLocation: string, ast: AST) => boolean */
export const allowsAnyValue = (schemaLocation, ast) => {
  const schemaNode = ast[schemaLocation];
  if (typeof schemaNode === "boolean") {
    return schemaNode;
  }

  return schemaNode.every(([keywordUri]) => keywordDefinitions[toAbsoluteIri(keywordUri)]?.annotation);
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
    const isSchemaValid = getReportedValidity(schemaLocation, instanceLocation, context);
    if (schemaNode === false && isSchemaValid !== true) {
      valid = false;
      output[instanceLocation] = {
        "https://json-schema.org/validation": {
          [schemaLocation]: { valid: isSchemaValid, value: false }
        }
      };
    }
  } else {
    for (const node of schemaNode) {
      const [keywordUri, keywordLocation, keywordValue] = node;
      const normalizedKeywordUri = toAbsoluteIri(keywordUri);

      if (!(normalizedKeywordUri in keywordDefinitions)) {
        throw Error(`Encountered unsupported keyword ${keywordUri}. Use the 'defineKeyword' function to add support for this keyword.`);
      }
      const keyword = keywordDefinitions[normalizedKeywordUri];

      const validationKeyword = getKeyword(keywordUri);

      const keywordInstanceLocation = instanceLocation.replace(/^#\*/, "#");
      let isKeywordValid = getReportedValidity(keywordLocation, keywordInstanceLocation, context);

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

      const keywordOutput = keyword.evaluate?.(keywordValue, instance, keywordContext);

      const isReported = context.errorIndex[keywordLocation]?.[keywordInstanceLocation] !== undefined;
      if (validationKeyword.simpleApplicator && !isReported && keywordOutput?.some((suboutput) => getValidity(suboutput) === false)) {
        isKeywordValid = false;
      }

      if (isKeywordValid === false) {
        valid = false;
      }

      output[instanceLocation] ??= {};
      output[instanceLocation][normalizedKeywordUri] ??= {};
      output[instanceLocation][normalizedKeywordUri][keywordLocation] = keywordOutput
        ? { valid: isKeywordValid, value: keywordValue, outputs: keywordOutput }
        : { valid: isKeywordValid, value: keywordValue };

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
const getReportedValidity = (schemaLocation, instanceLocation, context) => {
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
 * @type API.getPlaceholder
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

/** @type API.isPlaceholder */
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

/** @type API.negate */
export const negate = (context) => ({ ...context, localization: context.localization.negated() });

/**
 * Describes a subschema that applies to every location in some scope, such as
 * every item in an array. The subschema is described at a placeholder that
 * stands in for any of those locations and then the description is moved to
 * the parent because it applies to all of them.
 *
 * @type (subschemaLocation: string, placeholder: JsonNode, parent: JsonNode, context: API.ErrorHandlerContext) => API.ErrorObject[]
 */
export const describeEach = (subschemaLocation, placeholder, parent, context) => {
  const output = evaluateRequirements(subschemaLocation, placeholder, context.ast);
  return getSuccesses(output, parent, context)
    .map((success) => relocate(success, Instance.uri(placeholder), Instance.uri(parent)));
};

/**
 * Describes a subschema that applies to every location in some scope, such as
 * every item in an array, including locations that could be added. The
 * placeholder stands in for any of those locations. `each` is the message for
 * the group of what each location requires, given how many things are in it, and `none` describes the scope
 * being empty, which is what the subschema requires if it's `false`.
 *
 * @type API.describeScope
 */
export const describeScope = ({ subschemaLocation, placeholder, each, none }, instance, schemaLocation, context) => {
  if (context.ast[subschemaLocation] === false) {
    return [{
      message: none(context.localization),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    }];
  }

  const description = describeEach(subschemaLocation, placeholder, instance, context);
  if (description.length === 0) {
    return [];
  }

  if (context.localization.isNegated) {
    // There's a location that satisfies at least one of them
    return [showSmallestFirst({
      message: each(context.localization, description.length),
      alternatives: description.map((option) => [option]),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    })];
  } else {
    // Every location satisfies all of them
    return [{
      message: each(context.localization, description.length),
      alternatives: [description],
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    }];
  }
};

/**
 * Describes subschemas that only apply under some condition, such as a
 * property's subschema only applying if the property is present. Each function
 * describes its part using the given context, so `condition` describes the
 * condition holding, or with a negated context, not holding.
 *
 * @type API.describeConditional
 */
export const describeConditional = (conditional, instance, schemaLocation, context) => {
  const positive = context.localization.isNegated ? negate(context) : context;
  const negated = negate(positive);

  /** @type (descriptions: API.ErrorObject[]) => API.ErrorObject[] */
  const asOptions = (descriptions) => someTrue(descriptions.map((option) => [option]), instance, schemaLocation, context);

  if (context.localization.isNegated) {
    // Fails if the condition holds and 'then' fails or if the condition doesn't
    // hold and 'else' fails
    /** @type API.ErrorObject[] */
    const options = [];

    const thenOptions = conditional.then?.(context) ?? [];
    if (thenOptions.length > 0) {
      const requirements = [...conditional.condition(positive), ...asOptions(thenOptions)];
      options.push(...allTrue(requirements, instance, schemaLocation, context));
    }

    const elseOptions = conditional.else?.(context) ?? [];
    if (elseOptions.length > 0) {
      const requirements = [...conditional.condition(negated), ...asOptions(elseOptions)];
      options.push(...allTrue(requirements, instance, schemaLocation, context));
    }

    return options;
  } else if (conditional.else) {
    // Passes if the condition holds and 'then' passes or if it doesn't and 'else' passes
    const thenOption = [...conditional.condition(positive), ...conditional.then?.(context) ?? []];
    const elseOption = [...conditional.condition(negated), ...conditional.else(context)];
    return someTrue([thenOption, elseOption], instance, schemaLocation, context);
  } else {
    // Passes if the condition doesn't hold or 'then' passes
    const description = conditional.then?.(context) ?? [];
    if (description.length === 0) {
      return [];
    }

    return someTrue([conditional.condition(negated), description], instance, schemaLocation, context);
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

/** @type Record<string, API.ErrorHandler> */
const errorHandlers = {};

/** @type API.defineKeyword */
export const defineKeyword = (keywordUri, definition) => {
  keywordDefinitions[keywordUri] = definition;

  const { error, requirement } = definition;
  if (!error && !requirement) {
    removeErrorHandler(keywordUri);
    return;
  }

  setErrorHandler(keywordUri, {
    // Each occurrence of the keyword that failed gets its own message
    error: error && ((normalizedErrors, instance, context) => {
      /** @type API.ErrorObject[] */
      const errors = [];

      for (const schemaLocation in normalizedErrors[keywordUri]) {
        const { valid, value } = normalizedErrors[keywordUri][schemaLocation];
        if (valid === false) {
          errors.push({
            message: error(/** @type any */ (value), context.localization, instance),
            instanceLocation: Instance.uri(instance),
            schemaLocations: [schemaLocation]
          });
        }
      }

      return errors;
    }),

    success: requirement && ((normalizedOutput, instance, context) => {
      return describeKeyword(normalizedOutput, keywordUri, instance, (value) => {
        return requirement(/** @type any */ (value), context.localization);
      });
    })
  });
};

/** @type API.setErrorHandler */
export const setErrorHandler = (errorHandlerUri, errorHandler) => {
  errorHandlers[errorHandlerUri] = errorHandler;
};

/** @type API.removeErrorHandler */
export const removeErrorHandler = (errorHandlerUri) => {
  delete errorHandlers[errorHandlerUri];
};

/** @type API.getErrors */
export const getErrors = (normalizedErrors, rootInstance, context) => {
  /** @type API.ErrorObject[] */
  const errors = [];

  const reportedOutput = flattenOutput(normalizedErrors);
  for (const instanceLocation in reportedOutput) {
    const instance = /** @type JsonNode */ (Instance.get(instanceLocation, rootInstance));
    for (const errorHandlerUri in errorHandlers) {
      const errorObjects = errorHandlers[errorHandlerUri].error?.(reportedOutput[instanceLocation], instance, context) ?? [];
      errors.push(...errorObjects);
    }
  }

  return errors;
};

/** @type (normalizedOutput: API.NormalizedOutput) => API.NormalizedOutput */
export const flattenOutput = (normalizedOutput) => flatten(normalizedOutput, isApplied);

/**
 * The results of a simple applicator's subschemas are results of its parent
 * schema. The results are kept with the applicator that produced them and
 * flattened into the parent's results when they're used. `shouldFlatten`
 * decides which simple applicators' results are included.
 *
 * @type (normalizedOutput: API.NormalizedOutput, shouldFlatten: (keywordUri: string) => boolean, result?: API.NormalizedOutput) => API.NormalizedOutput
 */
const flatten = (normalizedOutput, shouldFlatten, result = {}) => {
  for (const instanceLocation in normalizedOutput) {
    for (const keywordUri in normalizedOutput[instanceLocation]) {
      const isFlattened = getKeyword(keywordUri)?.simpleApplicator && shouldFlatten(keywordUri);
      for (const keywordLocation in normalizedOutput[instanceLocation][keywordUri]) {
        const keywordOutput = normalizedOutput[instanceLocation][keywordUri][keywordLocation];
        if (isFlattened) {
          for (const output of keywordOutput.outputs ?? []) {
            flatten(output, shouldFlatten, result);
          }
        }

        result[instanceLocation] ??= {};
        result[instanceLocation][keywordUri] ??= {};
        result[instanceLocation][keywordUri][keywordLocation] = keywordOutput;
      }
    }
  }

  return result;
};

/**
 * The results of every simple applicator's subschemas apply to the parent
 * schema when they were evaluated, including conditional ones, because a
 * conditional subschema is only evaluated if its condition holds.
 *
 * @type (keywordUri: string) => boolean
 */
const isApplied = () => true;

/**
 * A conditional keyword's subschemas only apply when the condition holds. The
 * conditional keyword's handler describes them along with the condition, so
 * they aren't described as requirements of the parent schema.
 *
 * @type (keywordUri: string) => boolean
 */
const isRequired = (keywordUri) => !keywordDefinitions[toAbsoluteIri(keywordUri)]?.conditional;

/** @type API.getSuccesses */
export const getSuccesses = (subschema, rootInstance, context) => {
  // Descriptions of nested subschemas can get very large, so stop describing
  // past some depth and say that there's more
  if (descriptionDepth >= MAX_DESCRIPTION_DEPTH) {
    /** @type API.ErrorObject */
    const detailsNotShown = {
      message: context.localization.getDetailsNotShownMessage(),
      instanceLocation: Instance.uri(rootInstance),
      schemaLocations: []
    };
    detailsNotShownMarkers.add(detailsNotShown);
    return [detailsNotShown];
  }

  // Subschemas the validator didn't evaluate can still be described because
  // descriptions don't depend on results
  const normalizedOutput = typeof subschema === "string"
    ? evaluateRequirements(subschema, rootInstance, context.ast)
    : subschema;

  /** @type API.ErrorObject[] */
  const successes = [];

  const describedOutput = flatten(normalizedOutput, isRequired);

  descriptionDepth++;
  try {
    for (const instanceLocation in describedOutput) {
      // Descriptions can be about values that don't exist yet
      const instance = getInstance(instanceLocation, rootInstance)
        ?? toPlaceholder(instanceLocation, rootInstance);
      for (const errorHandlerUri in errorHandlers) {
        const successObjects = errorHandlers[errorHandlerUri].success?.(describedOutput[instanceLocation], instance, context) ?? [];
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

/** @type WeakSet<API.ErrorObject> */
const smallestFirstGroups = new WeakSet();

/**
 * Options in a group are shown in the order they're given unless the group is
 * marked to show the smallest options first so the simplest options are the
 * ones that are shown. Only use this if the order doesn't change what the
 * options mean.
 *
 * @type (errorObject: API.ErrorObject) => API.ErrorObject
 */
export const showSmallestFirst = (errorObject) => {
  smallestFirstGroups.add(errorObject);
  return errorObject;
};

/**
 * Lists of messages can get very long, so only the first few items in a group
 * and the first few options in a choice are shown. The rest are summarized so
 * it's clear that the list isn't complete. This is done once for all the
 * messages so error handlers don't need to.
 *
 * @type (errorObjects: API.ErrorObject[], context: API.ErrorHandlerContext) => API.ErrorObject[]
 */
export const limitMessages = (errorObjects, context) => errorObjects.map((errorObject) => {
  if (!errorObject.alternatives) {
    return errorObject;
  }

  const alternatives = errorObject.alternatives.map((alternative) => {
    return limitItems(limitMessages(alternative, context), errorObject.instanceLocation, context);
  });

  return {
    ...errorObject,
    // A single alternative is a group of things that all need to be true
    alternatives: alternatives.length === 1
      ? alternatives
      : limitOptions(alternatives, errorObject.instanceLocation, context, smallestFirstGroups.has(errorObject))
  };
});

/** @type (allItems: API.ErrorObject[], instanceLocation: string, context: API.ErrorHandlerContext) => API.ErrorObject[] */
const limitItems = (allItems, instanceLocation, context) => {
  const items = collapseDetailsNotShown(allItems);
  if (items.length <= MAX_ENTRIES) {
    return items;
  }

  return [...items.slice(0, MAX_ENTRIES), notShown(items.length - MAX_ENTRIES, instanceLocation, context)];
};

/** @type (allOptions: API.ErrorObject[][], instanceLocation: string, context: API.ErrorHandlerContext, isSorted: boolean) => API.ErrorObject[][] */
const limitOptions = (allOptions, instanceLocation, context, isSorted) => {
  // Only one option that's just "details aren't shown" is needed
  let hasDetailsNotShown = false;
  const options = allOptions.filter((option) => {
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

  return [...sorted.slice(0, MAX_ENTRIES), [notShown(sorted.length - MAX_ENTRIES, instanceLocation, context)]];
};

/** @type (count: number, instanceLocation: string, context: API.ErrorHandlerContext) => API.ErrorObject */
const notShown = (count, instanceLocation, context) => ({
  message: context.localization.getNotShownMessage(count),
  instanceLocation,
  schemaLocations: []
});

/** @type (errorObjects: API.ErrorObject[]) => number */
const sizeOf = (errorObjects) => errorObjects.reduce((size, errorObject) => {
  return size + 1 + (errorObject.alternatives ?? []).reduce((alternativesSize, alternative) => {
    return alternativesSize + sizeOf(alternative);
  }, 0);
}, 0);

/**
 * Whether a subschema passed, based on the results of its keywords. It's
 * `false` if any keyword failed, `true` if every keyword passed, and
 * `undefined` if it isn't known.
 *
 * @type API.getValidity
 */
export const getValidity = (normalizedOutput) => {
  /** @type boolean | undefined */
  let validity = true;

  const results = flattenOutput(normalizedOutput);
  for (const instanceLocation in results) {
    for (const keywordUri in results[instanceLocation]) {
      for (const schemaLocation in results[instanceLocation][keywordUri]) {
        const { valid } = results[instanceLocation][keywordUri][schemaLocation];
        if (valid === false) {
          return false;
        } else if (valid === undefined) {
          validity = undefined;
        }
      }
    }
  }

  return validity;
};

/** @type WeakSet<API.ErrorObject> */
const allTrueGroups = new WeakSet();

/**
 * Success messages are a list of things that are all true, but some keywords
 * are described by a choice of options. Present the options as a group that
 * says how many of the options are true.
 *
 * @type API.countTrue
 */
export const countTrue = (options, { min = 0, max = Infinity }, instance, schemaLocation, context) => {
  max = Math.min(max, options.length);

  if (options.length === 0 || (min <= 0 && max === options.length)) {
    // Nothing to say
    return [];
  } else if (min === options.length) {
    // All of the options are true
    return options.flat();
  }

  return [showSmallestFirst({
    message: context.localization.getCountTrueMessage(min, max === options.length ? Infinity : max),
    alternatives: options,
    instanceLocation: Instance.uri(instance),
    schemaLocations: [schemaLocation]
  })];
};

/** @type API.someTrue */
export const someTrue = (options, instance, schemaLocation, context) => {
  return countTrue(options, { min: 1 }, instance, schemaLocation, context);
};

/**
 * Negated success messages are a list of things where at least one is true, but
 * some keywords need several things to be true. Present those as a group.
 *
 * @type API.allTrue
 */
export const allTrue = (items, instance, schemaLocation, context) => {
  if (items.length <= 1) {
    return items;
  }

  /** @type API.ErrorObject */
  const group = {
    message: context.localization.getAllTrueMessage(),
    alternatives: [items],
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
 * @type <Value>(normalizedOutput: API.InstanceOutput, keywordUri: string, instance: JsonNode, toMessage: (value: Value) => string | undefined) => API.ErrorObject[]
 */
export const describeKeyword = (normalizedOutput, keywordUri, instance, toMessage) => {
  /** @type API.ErrorObject[] */
  const successes = [];

  for (const schemaLocation in normalizedOutput[keywordUri]) {
    const message = toMessage(/** @type any */ (normalizedOutput[keywordUri][schemaLocation].value));
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
