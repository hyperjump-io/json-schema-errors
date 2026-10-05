import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword, getCompiledKeywordValue } from "../json-schema-errors.js";

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

      const compiledPattern = /** @type RegExp */ (getCompiledKeywordValue(context.ast, schemaLocation));
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
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/pattern", instance, context.ast, (/** @type RegExp */ pattern) => {
      return context.localization.getPatternSuccessMessage(pattern.source);
    });
  }
};

export default patternErrorHandler;
