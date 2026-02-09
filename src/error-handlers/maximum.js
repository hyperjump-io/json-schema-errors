import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maximumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let lowestMaximum = Infinity;
  let effectiveSchemaLocation = "";

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maximum"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const maximum = /** @type number */ (Schema.value(keyword));

    if (maximum < lowestMaximum) {
      lowestMaximum = maximum;
      effectiveSchemaLocation = schemaLocation;
    }
  }
  if (lowestMaximum != Infinity) {
    errors.push({
      message: localization.getMaximumErrorMessage(lowestMaximum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [effectiveSchemaLocation]
    });
  }

  return errors;
};

export default maximumErrorHandler;
