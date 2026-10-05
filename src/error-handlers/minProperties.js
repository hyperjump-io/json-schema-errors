import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword, getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minPropertiesErrorHandler = {
  error: (normalizedErrors, instance, localization, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    let highestMinProperties = -Infinity;
    let mostConstrainingLocation = null;

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minProperties"]) {
      if (normalizedErrors["https://json-schema.org/keyword/minProperties"][schemaLocation].valid !== false) {
        continue;
      }

      const minProperties = /** @type number */ (getCompiledKeywordValue(context.ast, schemaLocation));

      if (minProperties > highestMinProperties) {
        highestMinProperties = minProperties;
        mostConstrainingLocation = schemaLocation;
      }
    }

    if (mostConstrainingLocation !== null) {
      errors.push({
        message: localization.getMinPropertiesErrorMessage(highestMinProperties),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [mostConstrainingLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, context) => {
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/minProperties", instance, context.ast, (/** @type number */ minProperties) => {
      return localization.getMinPropertiesSuccessMessage(minProperties);
    });
  }
};

export default minPropertiesErrorHandler;
