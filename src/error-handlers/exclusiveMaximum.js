import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const exclusiveMaximumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let lowestExclusiveMaximum = Infinity;
  let effectiveSchemaLocation = "";

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const exclusiveMaximum = /** @type number */ (Schema.value(keyword));

    if (exclusiveMaximum < lowestExclusiveMaximum) {
      lowestExclusiveMaximum = exclusiveMaximum;
      effectiveSchemaLocation = schemaLocation;
    }
  }
  if (lowestExclusiveMaximum != Infinity) {
    errors.push({
      message: localization.getExclusiveMaximumErrorMessage(lowestExclusiveMaximum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [effectiveSchemaLocation]
    });
  }

  return errors;
};

export default exclusiveMaximumErrorHandler;
