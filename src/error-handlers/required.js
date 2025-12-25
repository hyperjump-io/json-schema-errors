import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const requiredErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/required"]) {
    if (!normalizedErrors["https://json-schema.org/keyword/required"][schemaLocation]) {
      const keyword = await getSchema(schemaLocation);
      const required = /** @type string[] */ (Schema.value(keyword));

      const missingRequired = [];
      for (const propertyName of required) {
        if (!Instance.has(propertyName, instance)) {
          missingRequired.push(propertyName);
        }
      }

      errors.push({
        message: localization.getRequiredErrorMessage(missingRequired),
        instanceLocation: Instance.uri(instance),
        schemaLocation: [schemaLocation]
      });
    }
  }

  return errors;
};

export default requiredErrorHandler;
