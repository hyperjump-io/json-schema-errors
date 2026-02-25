import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getErrors } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const anyOfErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/anyOf"]) {
    const anyOf = normalizedErrors["https://json-schema.org/keyword/anyOf"][schemaLocation];
    if (typeof anyOf === "boolean") {
      continue;
    }

    const alternatives = [];
    const instanceLocation = Instance.uri(instance);

    for (const alternative of anyOf) {
      const typeErrors = alternative[instanceLocation]["https://json-schema.org/keyword/type"];
      const match = !typeErrors || Object.values(typeErrors).every((isValid) => isValid);

      if (match) {
        alternatives.push(await getErrors(alternative, instance, localization));
      }
    }

    if (alternatives.length === 0) {
      for (const alternative of anyOf) {
        alternatives.push(await getErrors(alternative, instance, localization));
      }
    }

    if (alternatives.length === 1) {
      errors.push(...alternatives[0]);
    } else {
      errors.push({
        message: localization.getAnyOfErrorMessage(),
        alternatives: alternatives,
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }
  }

  return errors;
};

export default anyOfErrorHandler;
