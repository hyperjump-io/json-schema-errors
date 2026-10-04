import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minItemsErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];
    let highestMinItem = 0;
    let effectiveSchemaLocation = "";

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minItems"]) {
      if (normalizedErrors["https://json-schema.org/keyword/minItems"][schemaLocation].valid !== false) {
        continue;
      }

      const minItems = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

      if (minItems > highestMinItem) {
        highestMinItem = minItems;
        effectiveSchemaLocation = schemaLocation;
      }
    }

    if (highestMinItem != 0) {
      errors.push({
        message: localization.getMinItemsErrorMessage(highestMinItem),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [effectiveSchemaLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/minItems"]) {
      const minItems = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

      successes.push({
        message: localization.getMinItemsSuccessMessage(minItems),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    return successes;
  }
};

export default minItemsErrorHandler;
