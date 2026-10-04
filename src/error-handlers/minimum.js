import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue, getSiblingKeywordLocation } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minimumErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    let highestMinimum = -Infinity;
    let isExclusive = false;
    /** @type string[] */
    let schemaLocations = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minimum"]) {
      if (normalizedErrors["https://json-schema.org/keyword/minimum"][schemaLocation].valid !== false) {
        continue;
      }

      const minimum = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

      if (minimum > highestMinimum) {
        highestMinimum = minimum;
        schemaLocations = [schemaLocation];
      }
    }

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMinimum"]) {
      if (normalizedErrors["https://json-schema.org/keyword/exclusiveMinimum"][schemaLocation].valid !== false) {
        continue;
      }

      const exclusiveMinimum = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

      if (exclusiveMinimum > highestMinimum) {
        highestMinimum = exclusiveMinimum;
        isExclusive = true;
        schemaLocations = [schemaLocation];
      }
    }

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"]) {
      if (normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"][schemaLocation].valid !== false) {
        continue;
      }

      const [minimum, exclusive] = /** @type [number, boolean] */ (getCompiledKeywordValue(ast, schemaLocation));
      if (minimum > highestMinimum) {
        highestMinimum = minimum;
        isExclusive = exclusive;
        schemaLocations = [schemaLocation];
        if (exclusive) {
          const exclusiveLocation = getSiblingKeywordLocation(ast, schemaLocation, "https://json-schema.org/keyword/draft-04/exclusiveMinimum");
          schemaLocations.push(exclusiveLocation);
        }
      }
    }

    if (highestMinimum === -Infinity) {
      return [];
    } else if (isExclusive) {
      return [{
        message: localization.getExclusiveMinimumErrorMessage(highestMinimum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: schemaLocations
      }];
    } else {
      return [{
        message: localization.getMinimumErrorMessage(highestMinimum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: schemaLocations
      }];
    }
  },

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/minimum"]) {
      const minimum = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));
      successes.push({
        message: localization.getMinimumSuccessMessage(minimum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/exclusiveMinimum"]) {
      const exclusiveMinimum = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));
      successes.push({
        message: localization.getExclusiveMinimumSuccessMessage(exclusiveMinimum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/draft-04/minimum"]) {
      const [minimum, exclusive] = /** @type [number, boolean] */ (getCompiledKeywordValue(ast, schemaLocation));
      if (exclusive) {
        const exclusiveLocation = getSiblingKeywordLocation(ast, schemaLocation, "https://json-schema.org/keyword/draft-04/exclusiveMinimum");
        successes.push({
          message: localization.getExclusiveMinimumSuccessMessage(minimum),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation, exclusiveLocation]
        });
      } else {
        successes.push({
          message: localization.getMinimumSuccessMessage(minimum),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      }
    }

    return successes;
  }
};

export default minimumErrorHandler;
