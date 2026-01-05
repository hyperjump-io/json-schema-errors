import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const multipleOfErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/multipleOf"]) {
    if (normalizedErrors["https://json-schema.org/keyword/multipleOf"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const multipleOf = /** @type number */ (Schema.value(keyword));

    errors.push({
      message: localization.getMultipleOfErrorMessage(multipleOf),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    });
  }

  return errors;
};

export default multipleOfErrorHandler;
