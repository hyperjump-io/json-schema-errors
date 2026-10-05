import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword, getCompiledKeywordValue } from "../json-schema-errors.js";

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
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/maxLength", instance, ast, (/** @type number */ maxLength) => {
      return localization.getMaxLengthSuccessMessage(maxLength);
    });
  }
};

export default maxLengthErrorHandler;
