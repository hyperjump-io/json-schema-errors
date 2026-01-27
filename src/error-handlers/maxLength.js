import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maxLengthErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let lowestMaxLength = Infinity;
  let mostConstrainingLocation = null;

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxLength"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maxLength"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const maxLength = /** @type number */ (Schema.value(keyword));

    if (maxLength < lowestMaxLength) {
      lowestMaxLength = maxLength;
      mostConstrainingLocation = schemaLocation;
    }
  }
  if (mostConstrainingLocation !== null) {
    errors.push({
      message: localization.getMaxLengthErrorMessage(lowestMaxLength),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [mostConstrainingLocation]
    });
  }

  return errors;
};

export default maxLengthErrorHandler;
