import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword, getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maxItemsErrorHandler = {
  error: (normalizedErrors, instance, localization, context) => {
    /** @type ErrorObject[] */
    const errors = [];
    let lowestMaxItems = Infinity;
    let effectiveSchemaLocation = "";

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxItems"]) {
      if (normalizedErrors["https://json-schema.org/keyword/maxItems"][schemaLocation].valid !== false) {
        continue;
      }

      const maxItems = /** @type number */ (getCompiledKeywordValue(context.ast, schemaLocation));

      if (maxItems < lowestMaxItems) {
        lowestMaxItems = maxItems;
        effectiveSchemaLocation = schemaLocation;
      }
    }

    if (lowestMaxItems != Infinity) {
      errors.push({
        message: localization.getMaxItemsErrorMessage(lowestMaxItems),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [effectiveSchemaLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, context) => {
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/maxItems", instance, context.ast, (/** @type number */ maxItems) => {
      return localization.getMaxItemsSuccessMessage(maxItems);
    });
  }
};

export default maxItemsErrorHandler;
