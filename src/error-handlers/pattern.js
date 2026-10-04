import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const patternErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/pattern"]) {
      if (normalizedErrors["https://json-schema.org/keyword/pattern"][schemaLocation]) {
        continue;
      }

      const compiledPattern = /** @type RegExp */ (getCompiledKeywordValue(ast, schemaLocation));
      const pattern = compiledPattern.source;

      errors.push({
        message: localization.getPatternErrorMessage(pattern),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/pattern"]) {
      if (normalizedOutput["https://json-schema.org/keyword/pattern"][schemaLocation] !== true) {
        continue;
      }

      const compiledPattern = /** @type RegExp */ (getCompiledKeywordValue(ast, schemaLocation));
      const pattern = compiledPattern.source;

      successes.push({
        message: localization.getPatternSuccessMessage(pattern),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    return successes;
  }
};

export default patternErrorHandler;
