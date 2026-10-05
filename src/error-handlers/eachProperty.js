import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as JsonPointer from "@hyperjump/json-pointer";
import {
  describeEach,
  getCompiledKeywordValue,
  getPlaceholder,
  getSiblingKeywordLocation,
  isPlaceholder
} from "../json-schema-errors.js";

/**
 * @import { AST } from "@hyperjump/json-schema/experimental"
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { ErrorHandler, ErrorObject, Localization } from "../index.d.ts"
 */

/**
 * Errors and descriptions of the properties that are present come from the
 * property subschemas. This describes what's required of every property
 * patternProperties, additionalProperties, and propertyNames apply to,
 * including properties that could be added.
 *
 * @type ErrorHandler
 */
const eachPropertyErrorHandler = {
  error: () => [],

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    // A value that doesn't exist can't have properties that don't exist. This
    // also prevents infinitely describing recursive schemas.
    if (isPlaceholder(instance)) {
      return successes;
    }

    // A property that doesn't exist stands in for any property
    const property = getPlaceholder(instance, unusedPropertyName(instance));

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/patternProperties"]) {
      const patternProperties = /** @type [RegExp, string][] */ (getCompiledKeywordValue(ast, schemaLocation));
      for (const [pattern, subschemaLocation] of patternProperties) {
        successes.push(...describe(schemaLocation, subschemaLocation, property, instance, localization, ast, {
          each: (localization) => localization.getEachMatchingPropertySuccessMessage(pattern.source),
          none: (localization) => localization.getNoMatchingPropertySuccessMessage(pattern.source)
        }));
      }
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/additionalProperties"]) {
      const [, subschemaLocation] = /** @type [RegExp, string] */ (getCompiledKeywordValue(ast, schemaLocation));
      const properties = Object.keys(/** @type Record<string, string> */ (
        getSiblingValue(ast, schemaLocation, "https://json-schema.org/keyword/properties") ?? {}
      ));
      const patterns = /** @type [RegExp, string][] */ (
        getSiblingValue(ast, schemaLocation, "https://json-schema.org/keyword/patternProperties") ?? []
      ).map(([pattern]) => pattern.source);
      successes.push(...describe(schemaLocation, subschemaLocation, property, instance, localization, ast, {
        each: (localization) => localization.getEachAdditionalPropertySuccessMessage(properties, patterns),
        none: (localization) => localization.getNoAdditionalPropertySuccessMessage(properties, patterns)
      }));
    }

    // Property names are at a different location than property values
    const propertyName = Instance.cons(
      instance.baseUri,
      "*" + JsonPointer.append(unusedPropertyName(instance), instance.pointer),
      undefined,
      /** @type JsonNode["type"] */ ("undefined"),
      [],
      instance
    );
    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/propertyNames"]) {
      const subschemaLocation = /** @type string */ (getCompiledKeywordValue(ast, schemaLocation));
      successes.push(...describe(schemaLocation, subschemaLocation, propertyName, instance, localization, ast, {
        each: (localization) => localization.getEachPropertyNameSuccessMessage(),
        none: (localization) => localization.getMaxPropertiesSuccessMessage(0)
      }));
    }

    return successes;
  }
};

/**
 * @typedef {{
 *   each: (localization: Localization) => string;
 *   none: (localization: Localization) => string;
 * }} ScopeMessages
 */

/** @type (schemaLocation: string, subschemaLocation: string, placeholder: JsonNode, instance: JsonNode, localization: Localization, ast: AST, messages: ScopeMessages) => ErrorObject[] */
const describe = (schemaLocation, subschemaLocation, placeholder, instance, localization, ast, messages) => {
  // Nothing is allowed
  if (ast[subschemaLocation] === false) {
    return [{
      message: messages.none(localization),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    }];
  }

  const description = describeEach(subschemaLocation, placeholder, instance, localization, ast);
  if (description.length === 0) {
    return [];
  }

  return [{
    message: messages.each(localization),
    // Each property satisfies all of them or there's a property that satisfies at least one
    alternatives: localization.isNegated ? description.map((option) => [option]) : [description],
    instanceLocation: Instance.uri(instance),
    schemaLocations: [schemaLocation]
  }];
};

/** @type (instance: JsonNode) => string */
const unusedPropertyName = (instance) => {
  let propertyName = "*";
  while (Instance.typeOf(instance) === "object" && Instance.has(propertyName, instance)) {
    propertyName += "*";
  }
  return propertyName;
};

/** @type (ast: AST, schemaLocation: string, keywordUri: string) => unknown */
const getSiblingValue = (ast, schemaLocation, keywordUri) => {
  try {
    return getCompiledKeywordValue(ast, getSiblingKeywordLocation(ast, schemaLocation, keywordUri));
  } catch {
    return undefined;
  }
};

export default eachPropertyErrorHandler;
