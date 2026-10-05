import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  describeScope,
  getCompiledKeywordValue,
  getPlaceholder,
  getPropertyNamePlaceholder,
  getSiblingKeywordLocation,
  isPlaceholder
} from "../json-schema-errors.js";

/**
 * @import { AST } from "@hyperjump/json-schema/experimental"
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
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
        successes.push(...describeScope({
          subschemaLocation,
          placeholder: property,
          each: (localization) => localization.getEachMatchingPropertySuccessMessage(pattern.source),
          none: (localization) => localization.getNoMatchingPropertySuccessMessage(pattern.source)
        }, instance, schemaLocation, localization, ast));
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
      successes.push(...describeScope({
        subschemaLocation,
        placeholder: property,
        each: (localization) => localization.getEachAdditionalPropertySuccessMessage(properties, patterns),
        none: (localization) => localization.getNoAdditionalPropertySuccessMessage(properties, patterns)
      }, instance, schemaLocation, localization, ast));
    }

    // Property names are at a different location than property values
    const propertyName = getPropertyNamePlaceholder(instance, unusedPropertyName(instance));
    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/propertyNames"]) {
      const subschemaLocation = /** @type string */ (getCompiledKeywordValue(ast, schemaLocation));
      successes.push(...describeScope({
        subschemaLocation,
        placeholder: propertyName,
        each: (localization) => localization.getEachPropertyNameSuccessMessage(),
        none: (localization) => localization.getMaxPropertiesSuccessMessage(0)
      }, instance, schemaLocation, localization, ast));
    }

    return successes;
  }
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
