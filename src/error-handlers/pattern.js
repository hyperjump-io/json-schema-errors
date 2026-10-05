import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const patternErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/pattern"]) {
      if (normalizedErrors["https://json-schema.org/keyword/pattern"][schemaLocation].valid !== false) {
        continue;
      }

      const compiledPattern = /** @type RegExp */ (normalizedErrors["https://json-schema.org/keyword/pattern"][schemaLocation].value);
      const pattern = compiledPattern.source;

      errors.push({
        message: context.localization.getPatternErrorMessage(pattern),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, context) => {
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/pattern", instance, (/** @type RegExp */ pattern) => {
      return context.localization.getPatternSuccessMessage(pattern.source);
    });
  }
};

export default patternErrorHandler;
