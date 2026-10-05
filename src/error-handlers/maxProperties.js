import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword, getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maxPropertiesErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];
    let lowestMaxProperties = Infinity;
    let mostConstrainingLocation = null;
    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxProperties"]) {
      if (normalizedErrors["https://json-schema.org/keyword/maxProperties"][schemaLocation].valid !== false) {
        continue;
      }

      const maxProperties = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

      if (maxProperties < lowestMaxProperties) {
        lowestMaxProperties = maxProperties;
        mostConstrainingLocation = schemaLocation;
      }
    }
    if (mostConstrainingLocation !== null) {
      errors.push({
        message: localization.getMaxPropertiesErrorMessage(lowestMaxProperties),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [mostConstrainingLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, ast) => {
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/maxProperties", instance, ast, (/** @type number */ maxProperties) => {
      return localization.getMaxPropertiesSuccessMessage(maxProperties);
    });
  }
};

export default maxPropertiesErrorHandler;
