import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maxItemsErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    /** @type ErrorObject[] */
    const errors = [];
    let lowestMaxItems = Infinity;
    let effectiveSchemaLocation = "";

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxItems"]) {
      if (normalizedErrors["https://json-schema.org/keyword/maxItems"][schemaLocation].valid !== false) {
        continue;
      }

      const maxItems = /** @type number */ (normalizedErrors["https://json-schema.org/keyword/maxItems"][schemaLocation].value);

      if (maxItems < lowestMaxItems) {
        lowestMaxItems = maxItems;
        effectiveSchemaLocation = schemaLocation;
      }
    }

    if (lowestMaxItems != Infinity) {
      errors.push({
        message: context.localization.getMaxItemsErrorMessage(lowestMaxItems),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [effectiveSchemaLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, context) => {
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/maxItems", instance, (/** @type number */ maxItems) => {
      return context.localization.getMaxItemsSuccessMessage(maxItems);
    });
  }
};

export default maxItemsErrorHandler;
