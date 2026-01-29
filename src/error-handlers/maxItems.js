import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maxItemsErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let lowestMaxItems = Infinity;
  let effectiveSchemaLocation = "";

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxItems"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maxItems"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const maxItems = /** @type number */ (Schema.value(keyword));

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
};

export default maxItemsErrorHandler;
