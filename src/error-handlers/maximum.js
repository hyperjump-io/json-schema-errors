import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue, getSiblingKeywordLocation } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maximumErrorHandler = (normalizedErrors, instance, localization, ast) => {
  let lowestMaximum = Infinity;
  let isExclusive = false;

  /** @type string[] */
  let schemaLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maximum"][schemaLocation]) {
      continue;
    }

    const maximum = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));
    if (maximum < lowestMaximum) {
      lowestMaximum = maximum;
      schemaLocations = [schemaLocation];
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"][schemaLocation]) {
      continue;
    }

    const exclusiveMaximum = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));
    if (exclusiveMaximum < lowestMaximum) {
      lowestMaximum = exclusiveMaximum;
      isExclusive = true;
      schemaLocations = [schemaLocation];
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"][schemaLocation]) {
      continue;
    }

    const [maximum, exclusive] = /** @type [number, boolean] */ (getCompiledKeywordValue(ast, schemaLocation));
    if (maximum < lowestMaximum) {
      lowestMaximum = maximum;
      isExclusive = exclusive;
      schemaLocations = [schemaLocation];
      if (exclusive) {
        const exclusiveLocation = getSiblingKeywordLocation(ast, schemaLocation, "https://json-schema.org/keyword/draft-04/exclusiveMaximum");
        schemaLocations.push(exclusiveLocation);
      }
    }
  }

  if (lowestMaximum === Infinity) {
    return [];
  } else if (isExclusive) {
    return [{
      message: localization.getExclusiveMaximumErrorMessage(lowestMaximum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: schemaLocations
    }];
  } else {
    return [{
      message: localization.getMaximumErrorMessage(lowestMaximum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: schemaLocations
    }];
  }
};

export default maximumErrorHandler;
