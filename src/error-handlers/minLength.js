import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword, getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minLengthErrorHandler = {
  error: (normalizedErrors, instance, localization, context) => {
    /** @type ErrorObject[] */
    const errors = [];
    let highestMinLength = -Infinity;
    let mostConstrainingLocation = null;

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minLength"]) {
      if (normalizedErrors["https://json-schema.org/keyword/minLength"][schemaLocation].valid !== false) {
        continue;
      }

      const minLength = /** @type number */ (getCompiledKeywordValue(context.ast, schemaLocation));

      if (minLength > highestMinLength) {
        highestMinLength = minLength;
        mostConstrainingLocation = schemaLocation;
      }
    }
    if (mostConstrainingLocation !== null) {
      errors.push({
        message: localization.getMinLengthErrorMessage(highestMinLength),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [mostConstrainingLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, context) => {
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/minLength", instance, context.ast, (/** @type number */ minLength) => {
      return localization.getMinLengthSuccessMessage(minLength);
    });
  }
};

export default minLengthErrorHandler;
