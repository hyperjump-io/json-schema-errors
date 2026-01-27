import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minLengthErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let highestMinLength = -Infinity;
  let mostConstrainingLocation = null;

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minLength"]) {
    if (normalizedErrors["https://json-schema.org/keyword/minLength"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const minLength = /** @type number */ (Schema.value(keyword));

    if (minLength > highestMinLength) {
      highestMinLength = minLength;
      mostConstrainingLocation = schemaLocation;
    }
  }
  if (mostConstrainingLocation !== null) {
    errors.push({
      message: localization.getMinLengthErrorMessage(highestMinLength),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [mostConstrainingLocation]
    });
  }

  return errors;
};

export default minLengthErrorHandler;
