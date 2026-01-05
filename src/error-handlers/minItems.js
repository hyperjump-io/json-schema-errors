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

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minItems"]) {
    if (normalizedErrors["https://json-schema.org/keyword/minItems"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const minItems = /** @type number */ (Schema.value(keyword));

    errors.push({
      message: localization.getMinItemsErrorMessage(minItems),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    });
  }

  return errors;
};

export default minItemsErrorHandler;
