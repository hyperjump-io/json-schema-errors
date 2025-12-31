import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
// eslint-disable-next-line @typescript-eslint/require-await
const additionalProperties = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  if (normalizedErrors["https://json-schema.org/validation"]) {
    for (const schemaLocation in normalizedErrors["https://json-schema.org/validation"]) {
      if (!normalizedErrors["https://json-schema.org/validation"][schemaLocation] && schemaLocation.endsWith("/additionalProperties")) {
        const notAllowedValue = /** @type string */ (Instance.uri(instance).split("/").pop());
        errors.push({
          message: localization.getAdditionalPropertiesErrorMessage(notAllowedValue),
          instanceLocation: Instance.uri(instance),
          schemaLocation: schemaLocation
        });
      }
    }
  }
  return errors;
};

export default additionalProperties;
