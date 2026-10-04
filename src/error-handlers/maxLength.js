import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maxLengthErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];
    let lowestMaxLength = Infinity;
    let mostConstrainingLocation = null;

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxLength"]) {
      if (normalizedErrors["https://json-schema.org/keyword/maxLength"][schemaLocation].valid !== false) {
        continue;
      }

      const maxLength = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

      if (maxLength < lowestMaxLength) {
        lowestMaxLength = maxLength;
        mostConstrainingLocation = schemaLocation;
      }
    }
    if (mostConstrainingLocation !== null) {
      errors.push({
        message: localization.getMaxLengthErrorMessage(lowestMaxLength),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [mostConstrainingLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/maxLength"]) {
      const maxLength = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

      successes.push({
        message: localization.getMaxLengthSuccessMessage(maxLength),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    return successes;
  }
};

export default maxLengthErrorHandler;
