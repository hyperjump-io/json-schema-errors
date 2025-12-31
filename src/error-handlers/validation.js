import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
// eslint-disable-next-line @typescript-eslint/require-await
const validation = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  if (normalizedErrors["https://json-schema.org/validation"]) {
    for (const schemaLocation in normalizedErrors["https://json-schema.org/validation"]) {
      // additionalProperties has its own specific error handler; avoid duplicate messages
      if (schemaLocation.endsWith("/additionalProperties")) {
        continue;
      }
      const value = normalizedErrors["https://json-schema.org/validation"][schemaLocation];
      if (value === false) {
        errors.push({
          message: localization.getNotErrorMessage(),
          instanceLocation: Instance.uri(instance),
          schemaLocation
        });
      }
    }
  }

  return errors;
};

export default validation;
