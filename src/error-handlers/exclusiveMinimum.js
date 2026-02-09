import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const exclusiveMinimumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let highestExclusiveMinimum = 0;
  let effectiveSchemaLocation = "";

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMinimum"]) {
    if (
      normalizedErrors["https://json-schema.org/keyword/exclusiveMinimum"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const exclusiveMinimum = /** @type number */ (Schema.value(keyword));

    if (exclusiveMinimum > highestExclusiveMinimum) {
      highestExclusiveMinimum = exclusiveMinimum;
      effectiveSchemaLocation = schemaLocation;
    }
  }
  if (highestExclusiveMinimum != 0) {
    errors.push({
      message: localization.getExclusiveMinimumErrorMessage(highestExclusiveMinimum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [effectiveSchemaLocation]
    });
  }

  return errors;
};

export default exclusiveMinimumErrorHandler;
