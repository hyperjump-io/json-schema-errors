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
  success: (normalizedOutput, instance, localization, context) => {
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
      const patternProperties = /** @type [RegExp, string][] */ (getCompiledKeywordValue(context.ast, schemaLocation));
      for (const [pattern, subschemaLocation] of patternProperties) {
        successes.push(...describeScope({
          subschemaLocation,
          placeholder: property,
          each: (localization, count) => localization.getEachMatchingPropertySuccessMessage(pattern.source, count),
          none: (localization) => localization.getNoMatchingPropertySuccessMessage(pattern.source)
        }, instance, schemaLocation, localization, context));
      }
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/additionalProperties"]) {
      const [, subschemaLocation] = /** @type [RegExp, string] */ (getCompiledKeywordValue(context.ast, schemaLocation));
      const properties = Object.keys(/** @type Record<string, string> */ (
        getSiblingValue(context.ast, schemaLocation, "https://json-schema.org/keyword/properties") ?? {}
      ));
      const patterns = /** @type [RegExp, string][] */ (
        getSiblingValue(context.ast, schemaLocation, "https://json-schema.org/keyword/patternProperties") ?? []
      ).map(([pattern]) => pattern.source);
      successes.push(...describeScope({
        subschemaLocation,
        placeholder: property,
        each: (localization, count) => localization.getEachAdditionalPropertySuccessMessage(properties, patterns, count),
        none: (localization) => localization.getNoAdditionalPropertySuccessMessage(properties, patterns)
      }, instance, schemaLocation, localization, context));
    }

    // Property names are at a different location than property values
    const propertyName = getPropertyNamePlaceholder(instance, unusedPropertyName(instance));
    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/propertyNames"]) {
      const subschemaLocation = /** @type string */ (getCompiledKeywordValue(context.ast, schemaLocation));
      successes.push(...describeScope({
        subschemaLocation,
        placeholder: propertyName,
        each: (localization, count) => localization.getEachPropertyNameSuccessMessage(count),
        none: (localization) => localization.getMaxPropertiesSuccessMessage(0)
      }, instance, schemaLocation, localization, context));
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
