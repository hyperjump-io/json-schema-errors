import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword, getCompiledKeywordValue, getSiblingKeywordLocation } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maximumErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    let lowestMaximum = Infinity;
    let isExclusive = false;

    /** @type string[] */
    let schemaLocations = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maximum"]) {
      if (normalizedErrors["https://json-schema.org/keyword/maximum"][schemaLocation].valid !== false) {
        continue;
      }

      const maximum = /** @type number */ (getCompiledKeywordValue(context.ast, schemaLocation));
      if (maximum < lowestMaximum) {
        lowestMaximum = maximum;
        schemaLocations = [schemaLocation];
      }
    }

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"]) {
      if (normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"][schemaLocation].valid !== false) {
        continue;
      }

      const exclusiveMaximum = /** @type number */ (getCompiledKeywordValue(context.ast, schemaLocation));
      if (exclusiveMaximum < lowestMaximum) {
        lowestMaximum = exclusiveMaximum;
        isExclusive = true;
        schemaLocations = [schemaLocation];
      }
    }

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"]) {
      if (normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"][schemaLocation].valid !== false) {
        continue;
      }

      const [maximum, exclusive] = /** @type [number, boolean] */ (getCompiledKeywordValue(context.ast, schemaLocation));
      if (maximum < lowestMaximum) {
        lowestMaximum = maximum;
        isExclusive = exclusive;
        schemaLocations = [schemaLocation];
        if (exclusive) {
          const exclusiveLocation = getSiblingKeywordLocation(context.ast, schemaLocation, "https://json-schema.org/keyword/draft-04/exclusiveMaximum");
          schemaLocations.push(exclusiveLocation);
        }
      }
    }

    if (lowestMaximum === Infinity) {
      return [];
    } else if (isExclusive) {
      return [{
        message: context.localization.getExclusiveMaximumErrorMessage(lowestMaximum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: schemaLocations
      }];
    } else {
      return [{
        message: context.localization.getMaximumErrorMessage(lowestMaximum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: schemaLocations
      }];
    }
  },

  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    successes.push(...describeKeyword(normalizedOutput, "https://json-schema.org/keyword/maximum", instance, context.ast, (/** @type number */ maximum) => {
      return context.localization.getMaximumSuccessMessage(maximum);
    }));

    successes.push(...describeKeyword(normalizedOutput, "https://json-schema.org/keyword/exclusiveMaximum", instance, context.ast, (/** @type number */ exclusiveMaximum) => {
      return context.localization.getExclusiveMaximumSuccessMessage(exclusiveMaximum);
    }));

    // Draft-04 has a boolean 'exclusiveMaximum' keyword that modifies 'maximum'
    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/draft-04/maximum"]) {
      const [maximum, exclusive] = /** @type [number, boolean] */ (getCompiledKeywordValue(context.ast, schemaLocation));
      if (exclusive) {
        const exclusiveLocation = getSiblingKeywordLocation(context.ast, schemaLocation, "https://json-schema.org/keyword/draft-04/exclusiveMaximum");
        successes.push({
          message: context.localization.getExclusiveMaximumSuccessMessage(maximum),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation, exclusiveLocation]
        });
      } else {
        successes.push({
          message: context.localization.getMaximumSuccessMessage(maximum),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      }
    }

    return successes;
  }
};

export default maximumErrorHandler;
