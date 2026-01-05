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

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxLength"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maxLength"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const maxLength = /** @type number */ (Schema.value(keyword));

    errors.push({
      message: localization.getMaxLengthErrorMessage(maxLength),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    });
  }

  return errors;
};

export default maxLengthErrorHandler;
