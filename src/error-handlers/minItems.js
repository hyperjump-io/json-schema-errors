import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minItemsErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let highestMinItem = 0;
  let effectiveSchemaLocation = "";

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minItems"]) {
    if (normalizedErrors["https://json-schema.org/keyword/minItems"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const minItems = /** @type number */ (Schema.value(keyword));

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
};

export default minItemsErrorHandler;
