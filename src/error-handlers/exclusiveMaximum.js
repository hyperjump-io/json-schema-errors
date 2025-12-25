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

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"]) {
    if (!normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"][schemaLocation]) {
      const keyword = await getSchema(schemaLocation);
      const exclusiveMaximum = /** @type number */ (Schema.value(keyword));

      errors.push({
        message: localization.getExclusiveMaximumErrorMessage(exclusiveMaximum),
        instanceLocation: Instance.uri(instance),
        schemaLocation: schemaLocation
      });
    }
  }

  return errors;
};

export default exclusiveMaximumErrorHandler;
